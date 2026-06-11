// app/api/cron/sync-scores/route.ts
// Called every 15 minutes by cron-job.org or Vercel Crons
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
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
  if (authHeader !== expectedSecret) {
    console.warn(`${TAG} ❌ FALLO DE AUTENTICACIÓN`);
    console.warn(`${TAG}    Header recibido : "${authHeader}"`);
    console.warn(`${TAG}    CRON_SECRET env : ${process.env.CRON_SECRET ? "✓ definido" : "✗ NO definido"}`);
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

  const newlyFinished: ApiFixtureResponse[] = [];
  const selfHealedFinished: ApiFixtureResponse[] = [];

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

    if (isFinished) {
      if (unresolvedIds.has(fixture.fixture.id)) {
        // Self-healed: was FT with null scores before → force re-evaluate with delta correction
        selfHealedFinished.push(fixture);
      } else {
        // Genuinely new finish: normal evaluation
        newlyFinished.push(fixture);
      }
    }
  }

  await batch.commit();
  console.log(`${TAG} ✓ Batch commit completado`);

  // ── Evaluar pronósticos ───────────────────────────────────────────────────
  let totalEvaluated = 0;
  const tournamentSet = new Set<string>();

  // Normal evaluation for genuinely new finished matches
  for (const fixture of newlyFinished) {
    const evaluated = await evaluateMatchPredictions(fixture);
    totalEvaluated += evaluated.count;
    evaluated.tournamentIds.forEach((tId) => tournamentSet.add(tId));
  }

  // Force re-evaluation (with delta correction) for self-healed matches
  for (const fixture of selfHealedFinished) {
    console.log(`${TAG} [RE-EVAL] Partido ${fixture.fixture.id} fue auto-reparado → forzando re-evaluación con corrección de delta`);
    const reevaluated = await forceReevaluateMatchPredictions(fixture);
    totalEvaluated += reevaluated.count;
    reevaluated.tournamentIds.forEach((tId) => tournamentSet.add(tId));
  }

  for (const tournamentId of tournamentSet) {
    await recalculateRanks(tournamentId);
  }

  const result = {
    synced: apiData.response.length,
    finished: newlyFinished.length,
    selfHealedAndReevaluated: selfHealedFinished.length,
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

// ─── Normal evaluation (only for predictions with pointsEarned == null) ────────
async function evaluateMatchPredictions(
  fixture: ApiFixtureResponse
): Promise<{ count: number; tournamentIds: string[] }> {
  const matchId   = String(fixture.fixture.id);
  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;

  console.log(`${TAG} [EVAL] Evaluando pronósticos del partido ${matchId} (${homeGoals}-${awayGoals})`);

  const tournamentsSnap = await db
    .collection("tournaments")
    .where("matchIds", "array-contains", matchId)
    .get();

  const affectedTournamentIds = tournamentsSnap.docs.map((d) => d.id);
  console.log(`${TAG} [EVAL]   Torneos afectados: ${affectedTournamentIds.length}`);

  const predictionsSnap = await db
    .collection("predictions")
    .where("matchId", "==", matchId)
    .where("pointsEarned", "==", null)
    .get();

  console.log(`${TAG} [EVAL]   Pronósticos sin evaluar: ${predictionsSnap.size}`);
  if (predictionsSnap.empty) return { count: 0, tournamentIds: affectedTournamentIds };

  const batch = db.batch();

  for (const predDoc of predictionsSnap.docs) {
    const pred = predDoc.data();
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
    const maxPoints = points2 !== null ? Math.max(points1, points2) : points1;

    batch.update(predDoc.ref, {
      pointsEarned1: points1,
      pointsEarned2: points2,
      pointsEarned: maxPoints,
      evaluatedAt: Timestamp.now(),
    });

    for (const tId of affectedTournamentIds) {
      const leaderboardRef = db.collection("tournaments").doc(tId).collection("leaderboard").doc(pred.userId);
      const leaderboardDoc = await leaderboardRef.get();
      if (leaderboardDoc.exists) {
        batch.update(leaderboardRef, {
          totalPoints: FieldValue.increment(maxPoints),
          ...(maxPoints === 3 && { exactScores: FieldValue.increment(1) }),
          ...(maxPoints === 1 && { correctResults: FieldValue.increment(1) }),
          predictions: FieldValue.increment(1),
          lastUpdated: Timestamp.now(),
        });
      }
    }
  }

  await batch.commit();
  return { count: predictionsSnap.size, tournamentIds: affectedTournamentIds };
}

// ─── Force re-evaluation with DELTA correction (for self-healed matches) ───────
// Used when a match was previously evaluated with wrong scores (e.g. null→0-0).
// Computes newPoints - oldPoints and applies the delta to the leaderboard.
async function forceReevaluateMatchPredictions(
  fixture: ApiFixtureResponse
): Promise<{ count: number; tournamentIds: string[] }> {
  const matchId   = String(fixture.fixture.id);
  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;

  console.log(`${TAG} [RE-EVAL] Partido ${matchId}: marcador correcto = ${homeGoals}-${awayGoals}`);

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

  console.log(`${TAG} [RE-EVAL]   Total pronósticos encontrados: ${predictionsSnap.size}`);
  if (predictionsSnap.empty) return { count: 0, tournamentIds: affectedTournamentIds };

  const batch = db.batch();

  for (const predDoc of predictionsSnap.docs) {
    const pred = predDoc.data();

    // Previous (possibly wrong) points
    const oldPoints = typeof pred.pointsEarned === "number" ? pred.pointsEarned : 0;

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
    const delta = newPoints - oldPoints; // can be negative if over-awarded before

    console.log(`${TAG} [RE-EVAL]   Usuario ${pred.userId}: pronóstico ${pred.predictedHome}-${pred.predictedAway} | oldPts=${oldPoints} → newPts=${newPoints} (delta=${delta > 0 ? '+' : ''}${delta})`);

    // Update prediction with correct points
    batch.update(predDoc.ref, {
      pointsEarned1: points1,
      pointsEarned2: points2,
      pointsEarned: newPoints,
      evaluatedAt: Timestamp.now(),
      reevaluatedAt: Timestamp.now(),
    });

    // Apply delta to leaderboard (only if something changed)
    if (delta !== 0) {
      for (const tId of affectedTournamentIds) {
        const leaderboardRef = db.collection("tournaments").doc(tId).collection("leaderboard").doc(pred.userId);
        const leaderboardDoc = await leaderboardRef.get();
        if (leaderboardDoc.exists) {
          const updates: Record<string, unknown> = {
            totalPoints: FieldValue.increment(delta),
            lastUpdated: Timestamp.now(),
          };
          // Adjust exactScores counter if the 3-point category changed
          const oldWasExact = oldPoints === 3;
          const newIsExact  = newPoints === 3;
          if (!oldWasExact && newIsExact)  updates.exactScores   = FieldValue.increment(1);
          if (oldWasExact  && !newIsExact) updates.exactScores   = FieldValue.increment(-1);
          // Adjust correctResults counter
          const oldWasCorrect = oldPoints === 1;
          const newIsCorrect  = newPoints === 1;
          if (!oldWasCorrect && newIsCorrect)  updates.correctResults = FieldValue.increment(1);
          if (oldWasCorrect  && !newIsCorrect) updates.correctResults = FieldValue.increment(-1);
          // If prediction was never counted before (pointsEarned was null), count it now
          if (pred.pointsEarned === null || pred.pointsEarned === undefined) {
            updates.predictions = FieldValue.increment(1);
          }
          batch.update(leaderboardRef, updates);
        }
      }
    }
  }

  await batch.commit();
  console.log(`${TAG} [RE-EVAL] ✓ Re-evaluación completada para ${predictionsSnap.size} pronósticos`);
  return { count: predictionsSnap.size, tournamentIds: affectedTournamentIds };
}

// ─── Recalculate ranks in a tournament ───────────────────────────────────────
async function recalculateRanks(tournamentId: string): Promise<void> {
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
}
