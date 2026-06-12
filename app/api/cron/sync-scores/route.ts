// app/api/cron/sync-scores/route.ts
// Called every 15 minutes by cron-job.org or Vercel Crons
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, verifyAdminSession } from "@/lib/firebase/admin";
import { fetchLiveFixtures } from "@/lib/api-football/client";
import { calculateScore } from "@/lib/scoring/calculator";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { mapApiStatus } from "@/lib/api-football/mappers";
import { ApiFixtureResponse } from "@/types/api-football";

const TAG = "[SYNC-SCORES]";

export async function GET(req: NextRequest) {
  console.log(`\n${TAG} ════════════════════════════════════════`);
  console.log(`${TAG} Sync iniciado: ${new Date().toISOString()}`);

  // ── Verificar autenticación ─────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;
  let authorized = false;

  if (authHeader === expectedSecret) {
    authorized = true;
  } else {
    try {
      await verifyAdminSession(req);
      authorized = true;
      console.log(`${TAG} ✓ Autenticado mediante sesión de administrador`);
    } catch (err) {
      console.warn(`${TAG} ❌ FALLO DE AUTENTICACIÓN (Ni token cron ni admin válido)`);
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log(`${TAG} ✓ Autenticación correcta`);

  // ── Variables de entorno ────────────────────────────────────────────────────
  console.log(`${TAG} Variables de entorno:`);
  console.log(`${TAG}   FOOTBALL_DATA_KEY : ${process.env.FOOTBALL_DATA_KEY ? "✓ definida" : "✗ NO DEFINIDA ← posible causa del problema"}`);
  console.log(`${TAG}   FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ?? "✗ NO definida"}`);

  // ── 1. Consulta Firestore: partidos activos ─────────────────────────────────
  console.log(`\n${TAG} [1/5] Consultando partidos activos en Firestore (NS, LIVE, HT)...`);
  const matchesSnap = await db
    .collection("matches")
    .where("status", "in", ["NS", "LIVE", "HT"])
    .get();
  console.log(`${TAG}   → Partidos NS/LIVE/HT encontrados: ${matchesSnap.size}`);

  // ── 2. Self-healing: partidos FT con marcador null ──────────────────────────
  console.log(`\n${TAG} [2/5] Buscando partidos FT con marcador null (self-healing)...`);
  const finishedSnap = await db
    .collection("matches")
    .where("status", "==", "FT")
    .get();
  console.log(`${TAG}   → Total partidos FT en Firestore: ${finishedSnap.size}`);

  const unresolvedDocs = finishedSnap.docs.filter((doc) => {
    const data = doc.data();
    const homeScore = data.finalScore?.home;
    const awayScore = data.finalScore?.away;
    return homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined;
  });

  console.log(`${TAG}   → Partidos FT con marcador null/undefined: ${unresolvedDocs.length}`);
  unresolvedDocs.forEach((doc) => {
    const d = doc.data();
    console.log(`${TAG}     • ID: ${doc.id} | ${d.homeTeam?.name} vs ${d.awayTeam?.name} | fixtureId: ${d.fixtureId} | finalScore: ${JSON.stringify(d.finalScore)} | liveScore: ${JSON.stringify(d.liveScore)}`);
  });

  // ── 3. Filtrar y combinar listas ────────────────────────────────────────────
  const now = new Date();
  const timeThreshold = new Date(now.getTime() + 30 * 60 * 1000);

  const activeDocs = matchesSnap.docs.filter((doc) => {
    const data = doc.data();
    const kickoff = data.kickoffTime?.toDate();
    return kickoff && kickoff <= timeThreshold;
  });

  console.log(`\n${TAG} [3/5] Partidos activos dentro del umbral de tiempo (+30 min): ${activeDocs.length}`);
  activeDocs.forEach((doc) => {
    const d = doc.data();
    console.log(`${TAG}   • ID: ${doc.id} | ${d.homeTeam?.name} vs ${d.awayTeam?.name} | status: ${d.status} | kickoff: ${d.kickoffTime?.toDate()?.toISOString()}`);
  });

  const activeMatchesDocs = [...activeDocs, ...unresolvedDocs];
  console.log(`${TAG}   → Total a sincronizar (activos + sin resolver): ${activeMatchesDocs.length}`);

  if (activeMatchesDocs.length === 0) {
    console.log(`${TAG} ⚠ No hay partidos que sincronizar. Abortando.`);
    return NextResponse.json({ message: "No active or unresolved matches to sync, skipping API call" });
  }

  // ── 4. Calcular rango de fechas y llamar a la API ───────────────────────────
  const kickoffDates = activeMatchesDocs.map((d) => d.data().kickoffTime.toDate() as Date);
  const minDate = new Date(Math.min(...kickoffDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...kickoffDates.map((d) => d.getTime())));

  const dateFrom = minDate.toISOString().split("T")[0];
  const dateTo   = maxDate.toISOString().split("T")[0];

  const fixtureIds = activeMatchesDocs.map((d) => d.data().fixtureId as number);

  console.log(`\n${TAG} [4/5] Llamando a football-data.org API...`);
  console.log(`${TAG}   → dateFrom: ${dateFrom} | dateTo: ${dateTo}`);
  console.log(`${TAG}   → fixtureIds buscados: [${fixtureIds.join(", ")}]`);

  let apiData: { response: ApiFixtureResponse[] };
  try {
    apiData = await fetchLiveFixtures(fixtureIds, dateFrom, dateTo) as { response: ApiFixtureResponse[] };
  } catch (err) {
    console.error(`${TAG} ❌ Error llamando a la API:`, err);
    return NextResponse.json({ error: "API fetch failed" }, { status: 502 });
  }

  console.log(`${TAG}   → Partidos devueltos por la API: ${apiData.response.length}`);

  if (apiData.response.length === 0) {
    console.warn(`${TAG} ⚠ La API devolvió 0 partidos para el rango ${dateFrom} - ${dateTo}.`);
    console.warn(`${TAG}   Posibles causas:`);
    console.warn(`${TAG}   1. FOOTBALL_DATA_KEY no está definida o es inválida`);
    console.warn(`${TAG}   2. Los fixtureIds no corresponden a partidos en la API de football-data.org`);
    console.warn(`${TAG}   3. Los partidos no están en el rango de fechas consultado`);
  }

  // Mostrar detalle de cada partido que devolvió la API
  apiData.response.forEach((f) => {
    console.log(`${TAG}   Partido API → ID: ${f.fixture.id}`);
    console.log(`${TAG}     ${f.teams.home.name} vs ${f.teams.away.name}`);
    console.log(`${TAG}     status: ${f.fixture.status.short} (${f.fixture.status.long})`);
    console.log(`${TAG}     goals: home=${f.goals.home} away=${f.goals.away}`);
    console.log(`${TAG}     score.fullTime: home=${f.score?.fulltime?.home} away=${f.score?.fulltime?.away}`);
  });

  // Detectar fixtureIds que la API NO devolvió
  const returnedIds = new Set(apiData.response.map((f) => f.fixture.id));
  const missingIds = fixtureIds.filter((id) => !returnedIds.has(id));
  if (missingIds.length > 0) {
    console.warn(`${TAG} ⚠ Los siguientes fixtureIds NO fueron devueltos por la API: [${missingIds.join(", ")}]`);
    console.warn(`${TAG}   Esto significa que football-data.org no tiene datos para esos IDs en el rango de fechas dado.`);
  }

  // ── 5. Procesar y escribir en Firestore ──────────────────────────────────────
  console.log(`\n${TAG} [5/5] Procesando y escribiendo en Firestore...`);
  const batch = db.batch();
  // Track which IDs come from self-healing (FT with null scores)
  const unresolvedIds = new Set(unresolvedDocs.map((d) => d.data().fixtureId as number));

  const toEvaluate: { fixture: ApiFixtureResponse; mappedStatus: string }[] = [];

  for (const fixture of apiData.response) {
    const matchRef = db.collection("matches").doc(String(fixture.fixture.id));
    const apiStatus  = fixture.fixture.status.short;
    const hasGoals   = fixture.goals.home !== null && fixture.goals.away !== null;
    const isFinished = ["FT", "AET", "PEN"].includes(apiStatus) && hasGoals;
    const mappedStatus = isFinished
      ? "FT"
      : (["FT", "AET", "PEN"].includes(apiStatus) ? "LIVE" : mapApiStatus(apiStatus));

    console.log(`${TAG}   Escribiendo partido ${fixture.fixture.id}:`);
    console.log(`${TAG}     apiStatus="${apiStatus}" hasGoals=${hasGoals} isFinished=${isFinished} → mappedStatus="${mappedStatus}"`);
    console.log(`${TAG}     liveScore → home:${fixture.goals.home} away:${fixture.goals.away}`);
    if (isFinished) {
      console.log(`${TAG}     finalScore → home:${fixture.goals.home} away:${fixture.goals.away} ✓`);
    } else {
      console.log(`${TAG}     finalScore → NO actualizado (partido no finalizado con goles válidos)`);
    }

    batch.update(matchRef, {
      status: mappedStatus,
      isLocked: mappedStatus !== "NS" || fixture.fixture.timestamp * 1000 <= Date.now(),
      liveScore: {
        home: fixture.goals.home,
        away: fixture.goals.away,
        elapsed: fixture.fixture.status.elapsed,
      },
      ...(isFinished && {
        finalScore: {
          home: fixture.goals.home,
          away: fixture.goals.away,
        },
      }),
      lastSyncedAt: Timestamp.now(),
    });

    if (["LIVE", "HT", "FT"].includes(mappedStatus)) {
      toEvaluate.push({ fixture, mappedStatus });
    }
  }

  await batch.commit();
  console.log(`${TAG} ✓ Batch commit completado`);

  // ── Evaluar pronósticos ───────────────────────────────────────────────────
  let totalEvaluated = 0;
  const tournamentSet = new Set<string>();

  for (const { fixture, mappedStatus } of toEvaluate) {
    const evaluated = await evaluateOrReevaluateMatchPredictions(fixture, mappedStatus);
    totalEvaluated += evaluated.count;
    evaluated.tournamentIds.forEach((tId) => tournamentSet.add(tId));
  }

  for (const tournamentId of tournamentSet) {
    await recalculateRanks(tournamentId);
  }

  const result = {
    synced: apiData.response.length,
    finished: toEvaluate.filter(e => e.mappedStatus === "FT").length,
    evaluated: toEvaluate.length,
    predictionsEvaluated: totalEvaluated,
    ranksUpdated: [...tournamentSet],
    missingFromApi: missingIds,
    unresolvedRepaired: unresolvedDocs.length,
  };

  console.log(`\n${TAG} ════ RESULTADO ════`);
  console.log(`${TAG}`, JSON.stringify(result, null, 2));
  console.log(`${TAG} ════════════════════════════════════════\n`);

  return NextResponse.json(result);
}

// ─── Evaluate or re-evaluate predictions with delta correction ────────────────
async function evaluateOrReevaluateMatchPredictions(
  fixture: ApiFixtureResponse,
  mappedStatus: string
): Promise<{ count: number; tournamentIds: string[] }> {
  const matchId   = String(fixture.fixture.id);
  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;

  console.log(`${TAG} [EVAL-DELTA] Partido ${matchId} (Status: ${mappedStatus}): marcador = ${homeGoals}-${awayGoals}`);

  const tournamentsSnap = await db
    .collection("tournaments")
    .where("matchIds", "array-contains", matchId)
    .get();
  const affectedTournamentIds = tournamentsSnap.docs.map((d) => d.id);

  // Fetch ALL predictions for this match (regardless of pointsEarned)
  const predictionsSnap = await db
    .collection("predictions")
    .where("matchId", "==", matchId)
    .get();

  console.log(`${TAG} [EVAL-DELTA]   Total pronósticos encontrados: ${predictionsSnap.size}`);
  if (predictionsSnap.empty) return { count: 0, tournamentIds: affectedTournamentIds };

  const batch = db.batch();

  for (const predDoc of predictionsSnap.docs) {
    const pred = predDoc.data();

    // Previous points
    const oldPointsExist = pred.pointsEarned !== null && pred.pointsEarned !== undefined;
    const oldIsLive = pred.isLive === true;

    const oldPointsOfficial = (oldPointsExist && !oldIsLive) ? Number(pred.pointsEarned) : 0;
    const oldPointsProjected = oldPointsExist ? Number(pred.pointsEarned) : 0;

    // Correct points based on real score
    const points1 = calculateScore(
      { predictedHome: pred.predictedHome, predictedAway: pred.predictedAway },
      { homeGoals, awayGoals }
    );
    let points2: number | null = null;
    if (pred.predictedHome2 !== null && pred.predictedHome2 !== undefined &&
        pred.predictedAway2 !== null && pred.predictedAway2 !== undefined) {
      points2 = calculateScore(
        { predictedHome: pred.predictedHome2, predictedAway: pred.predictedAway2 },
        { homeGoals, awayGoals }
      );
    }
    const newPoints = points2 !== null ? Math.max(points1, points2) : points1;

    const isLiveEvaluation = mappedStatus !== "FT";
    const newPointsOfficial = isLiveEvaluation ? 0 : newPoints;
    const newPointsProjected = newPoints;

    const deltaOfficial = newPointsOfficial - oldPointsOfficial;
    const deltaProjected = newPointsProjected - oldPointsProjected;

    console.log(`${TAG} [EVAL-DELTA]   Usuario ${pred.userId}: pred ${pred.predictedHome}-${pred.predictedAway} | oldPts(Off/Proj)=${oldPointsOfficial}/${oldPointsProjected} → newPts(Off/Proj)=${newPointsOfficial}/${newPointsProjected} (deltaOff=${deltaOfficial >= 0 ? "+" : ""}${deltaOfficial}, deltaProj=${deltaProjected >= 0 ? "+" : ""}${deltaProjected})`);

    // Update prediction with correct points and isLive flag
    batch.update(predDoc.ref, {
      pointsEarned1: points1,
      pointsEarned2: points2,
      pointsEarned: newPoints,
      evaluatedAt: Timestamp.now(),
      isLive: isLiveEvaluation,
    });

    const hasLeaderboardUpdates = deltaOfficial !== 0 || deltaProjected !== 0 || !oldPointsExist;

    if (hasLeaderboardUpdates) {
      for (const tId of affectedTournamentIds) {
        const leaderboardRef = db.collection("tournaments").doc(tId).collection("leaderboard").doc(pred.userId);
        const leaderboardDoc = await leaderboardRef.get();
        if (leaderboardDoc.exists) {
          const updates: Record<string, any> = {
            lastUpdated: Timestamp.now(),
          };

          if (deltaOfficial !== 0) {
            updates.totalPoints = FieldValue.increment(deltaOfficial);
          }
          if (deltaProjected !== 0) {
            updates.projectedPoints = FieldValue.increment(deltaProjected);
          }

          // Adjust exactScores counter if the 3-point category changed
          const oldWasExact = oldPointsOfficial === 3;
          const newIsExact  = newPointsOfficial === 3;
          if (oldPointsExist && !oldIsLive) {
            if (!oldWasExact && newIsExact)  updates.exactScores = FieldValue.increment(1);
            if (oldWasExact  && !newIsExact) updates.exactScores = FieldValue.increment(-1);
          } else {
            if (newIsExact) updates.exactScores = FieldValue.increment(1);
          }

          // Adjust correctResults counter
          const oldWasCorrect = oldPointsOfficial === 1;
          const newIsCorrect  = newPointsOfficial === 1;
          if (oldPointsExist && !oldIsLive) {
            if (!oldWasCorrect && newIsCorrect)  updates.correctResults = FieldValue.increment(1);
            if (oldWasCorrect  && !newIsCorrect) updates.correctResults = FieldValue.increment(-1);
          } else {
            if (newIsCorrect) updates.correctResults = FieldValue.increment(1);
          }

          // If prediction was never counted before, count it now
          if (!oldPointsExist) {
            updates.predictions = FieldValue.increment(1);
          }

          batch.update(leaderboardRef, updates);
        }
      }
    }
  }

  await batch.commit();
  console.log(`${TAG} [EVAL-DELTA] ✓ Re-evaluación completada para ${predictionsSnap.size} pronósticos`);
  return { count: predictionsSnap.size, tournamentIds: affectedTournamentIds };
}

// ─── Recalculate ranks in a tournament ───────────────────────────────────────
async function recalculateRanks(tournamentId: string): Promise<void> {
  // 1. Recalculate rank (based on totalPoints desc)
  const leaderboardSnap = await db
    .collection("tournaments")
    .doc(tournamentId)
    .collection("leaderboard")
    .orderBy("totalPoints", "desc")
    .get();

  const batch = db.batch();
  let currentRank = 1;
  let prevPoints = -1;

  leaderboardSnap.docs.forEach((doc, index) => {
    const points = doc.data().totalPoints as number;
    if (index > 0 && points < prevPoints) {
      currentRank = index + 1;
    }
    batch.update(doc.ref, { rank: currentRank });
    prevPoints = points;
  });

  await batch.commit();

  // 2. Recalculate projectedRank (based on projectedPoints desc)
  const leaderboardSnapProj = await db
    .collection("tournaments")
    .doc(tournamentId)
    .collection("leaderboard")
    .orderBy("projectedPoints", "desc")
    .get();

  const batchProj = db.batch();
  let currentRankProj = 1;
  let prevPointsProj = -1;

  leaderboardSnapProj.docs.forEach((doc, index) => {
    const points = (doc.data().projectedPoints ?? doc.data().totalPoints) as number;
    if (index > 0 && points < prevPointsProj) {
      currentRankProj = index + 1;
    }
    batchProj.update(doc.ref, { projectedRank: currentRankProj });
    prevPointsProj = points;
  });

  await batchProj.commit();
}
