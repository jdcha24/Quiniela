// scratch/fix-leaderboards.js
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

// Load .env.local variables
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\n/g, "\n");
      }
      process.env[key] = value;
    }
  });
}

const serviceAccount = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "quiniela-2d83c-firebase-adminsdk-fbsvc-a0f1114bbd.json"),
    "utf-8"
  )
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function fixLeaderboards() {
  const tournamentIds = ["00VtKOtbLSSCxl2et15k", "08Xj4kmbQWj0TyGW0PRS", "tjOPQjNVHg01JUDfJ1Y0"];

  for (const tournamentId of tournamentIds) {
    console.log(`\n================ PROCESSING TOURNAMENT: ${tournamentId} ================`);
    
    // 1. Get all matches in this tournament that are LIVE or HT
    const tournamentDoc = await db.collection("tournaments").doc(tournamentId).get();
    if (!tournamentDoc.exists) {
      console.warn(`Tournament ${tournamentId} not found`);
      continue;
    }
    const matchIds = tournamentDoc.data().matchIds || [];
    if (matchIds.length === 0) {
      console.log("No matches in tournament.");
      continue;
    }

    const liveMatchesSnap = await db
      .collection("matches")
      .where("status", "in", ["LIVE", "HT"])
      .get();
    
    const liveMatchIds = liveMatchesSnap.docs
      .map((d) => d.id)
      .filter((id) => matchIds.includes(id));
    
    console.log(`Live match IDs in tournament:`, liveMatchIds);

    // 2. Fetch all predictions for these live matches
    const livePointsByUser = {}; // userId -> points
    if (liveMatchIds.length > 0) {
      const predsSnap = await db
        .collection("predictions")
        .where("matchId", "in", liveMatchIds)
        .get();
      
      predsSnap.docs.forEach((doc) => {
        const d = doc.data();
        const pts = Number(d.pointsEarned || 0);
        livePointsByUser[d.userId] = (livePointsByUser[d.userId] || 0) + pts;
      });
    }
    console.log("Live points calculated per user:", livePointsByUser);

    // 3. Fetch and update the leaderboard entries
    const leaderboardSnap = await db
      .collection("tournaments")
      .doc(tournamentId)
      .collection("leaderboard")
      .get();
    
    const batch = db.batch();
    for (const doc of leaderboardSnap.docs) {
      const data = doc.data();
      const totalPoints = Number(data.totalPoints || 0);
      const livePoints = Number(livePointsByUser[doc.id] || 0);
      const newProjectedPoints = totalPoints + livePoints;

      console.log(
        `User ${data.nickname}: totalPoints=${totalPoints} + livePoints=${livePoints} → projectedPoints=${newProjectedPoints} (was ${data.projectedPoints})`
      );

      batch.update(doc.ref, {
        projectedPoints: newProjectedPoints,
      });
    }

    await batch.commit();
    console.log(`Leaderboard projectedPoints updated for ${tournamentId}`);

    // 4. Recalculate official rank (totalPoints desc) and projectedRank (projectedPoints desc)
    await recalculateRanksForTournament(tournamentId);
  }
}

async function recalculateRanksForTournament(tournamentId) {
  console.log(`Recalculating ranks for ${tournamentId}...`);
  // Ranks
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
    const points = doc.data().totalPoints || 0;
    if (index > 0 && points < prevPoints) {
      currentRank = index + 1;
    }
    batch.update(doc.ref, { rank: currentRank });
    prevPoints = points;
  });
  await batch.commit();

  // Projected Ranks
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
    const points = doc.data().projectedPoints || 0;
    if (index > 0 && points < prevPointsProj) {
      currentRankProj = index + 1;
    }
    batchProj.update(doc.ref, { projectedRank: currentRankProj });
    prevPointsProj = points;
  });
  await batchProj.commit();
  console.log(`Ranks recalculated successfully for ${tournamentId}`);
}

fixLeaderboards().catch(console.error);
