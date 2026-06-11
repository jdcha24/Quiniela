// app/api/cron/sync-scores/route.ts
// Called every 15 minutes by cron-job.org or Vercel Crons
// Smart polling: only fetches API if there are active matches today
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { fetchLiveFixtures } from "@/lib/api-football/client";
import { calculateScore } from "@/lib/scoring/calculator";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { mapApiStatus } from "@/lib/api-football/mappers";
import { ApiFixtureResponse } from "@/types/api-football";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all active matches (Not Started, Live, Halftime)
  const matchesSnap = await db
    .collection("matches")
    .where("status", "in", ["NS", "LIVE", "HT"])
    .get();

  const now = new Date();
  // Filter active matches in memory: only sync matches that kicked off in the past or start in the next 30 minutes
  const timeThreshold = new Date(now.getTime() + 30 * 60 * 1000);
  const activeMatchesDocs = matchesSnap.docs.filter((doc) => {
    const data = doc.data();
    const kickoff = data.kickoffTime?.toDate();
    return kickoff && kickoff <= timeThreshold;
  });

  if (activeMatchesDocs.length === 0) {
    return NextResponse.json({ message: "No active matches to sync, skipping API call" });
  }

  // Determine dynamic date range (dateFrom / dateTo) in UTC based on kickoff dates of the matches to sync
  const kickoffDates = activeMatchesDocs.map((d) => d.data().kickoffTime.toDate() as Date);
  const minDate = new Date(Math.min(...kickoffDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...kickoffDates.map((d) => d.getTime())));

  const dateFrom = minDate.toISOString().split("T")[0];
  const dateTo = maxDate.toISOString().split("T")[0];

  const fixtureIds = activeMatchesDocs.map(
    (d) => d.data().fixtureId as number
  );

  let apiData: { response: ApiFixtureResponse[] };
  try {
    apiData = await fetchLiveFixtures(fixtureIds, dateFrom, dateTo) as { response: ApiFixtureResponse[] };
  } catch (err) {
    console.error("[CRON] API fetch failed:", err);
    return NextResponse.json({ error: "API fetch failed" }, { status: 502 });
  }

  const batch = db.batch();
  const newlyFinished: ApiFixtureResponse[] = [];

  for (const fixture of apiData.response) {
    const matchRef = db.collection("matches").doc(String(fixture.fixture.id));
    const apiStatus = fixture.fixture.status.short;
    const hasGoals = fixture.goals.home !== null && fixture.goals.away !== null;
    const isFinished = ["FT", "AET", "PEN"].includes(apiStatus) && hasGoals;
    const mappedStatus = isFinished ? "FT" : (["FT", "AET", "PEN"].includes(apiStatus) ? "LIVE" : mapApiStatus(apiStatus));

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
      newlyFinished.push(fixture);
    }
  }

  await batch.commit();

  // Evaluate predictions for newly finished matches
  let totalEvaluated = 0;
  const tournamentSet = new Set<string>();

  for (const fixture of newlyFinished) {
    const evaluated = await evaluateMatchPredictions(fixture);
    totalEvaluated += evaluated.count;
    evaluated.tournamentIds.forEach((tId) => tournamentSet.add(tId));
  }

  // Recalculate ranks for affected tournaments
  for (const tournamentId of tournamentSet) {
    await recalculateRanks(tournamentId);
  }

  return NextResponse.json({
    synced: apiData.response.length,
    finished: newlyFinished.length,
    predictionsEvaluated: totalEvaluated,
    ranksUpdated: [...tournamentSet],
  });
}

// ─── Evaluate predictions for a finished match ───────────────────────────────
async function evaluateMatchPredictions(
  fixture: ApiFixtureResponse
): Promise<{ count: number; tournamentIds: string[] }> {
  const matchId = String(fixture.fixture.id);
  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;

  // Find all tournaments containing this match
  const tournamentsSnap = await db
    .collection("tournaments")
    .where("matchIds", "array-contains", matchId)
    .get();

  const affectedTournamentIds = tournamentsSnap.docs.map((d) => d.id);

  const predictionsSnap = await db
    .collection("predictions")
    .where("matchId", "==", matchId)
    .where("pointsEarned", "==", null)
    .get();

  if (predictionsSnap.empty) return { count: 0, tournamentIds: affectedTournamentIds };

  const batch = db.batch();

  for (const predDoc of predictionsSnap.docs) {
    const pred = predDoc.data();

    // Option 1 evaluation
    const points1 = calculateScore(
      { predictedHome: pred.predictedHome, predictedAway: pred.predictedAway },
      { homeGoals, awayGoals }
    );

    // Option 2 evaluation if present
    let points2: number | null = null;
    if (
      pred.predictedHome2 !== null &&
      pred.predictedHome2 !== undefined &&
      pred.predictedAway2 !== null &&
      pred.predictedAway2 !== undefined
    ) {
      points2 = calculateScore(
        { predictedHome: pred.predictedHome2, predictedAway: pred.predictedAway2 },
        { homeGoals, awayGoals }
      );
    }

    const maxPoints = points2 !== null ? Math.max(points1, points2) : points1;

    // Update prediction document
    batch.update(predDoc.ref, {
      pointsEarned1: points1,
      pointsEarned2: points2,
      pointsEarned: maxPoints,
      evaluatedAt: Timestamp.now(),
    });

    // Update leaderboard entry in all tournaments containing this match where the user participates
    for (const tId of affectedTournamentIds) {
      const leaderboardRef = db
        .collection("tournaments")
        .doc(tId)
        .collection("leaderboard")
        .doc(pred.userId);

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
    // Tied players share the same rank
    if (index > 0 && points < prevPoints) {
      currentRank = index + 1;
    }
    batch.update(doc.ref, { rank: currentRank });
    prevPoints = points;
  });

  await batch.commit();
}
