// scratch/inspect-leaderboard.js
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

async function main() {
  const tournamentIds = ["00VtKOtbLSSCxl2et15k", "08Xj4kmbQWj0TyGW0PRS", "tjOPQjNVHg01JUDfJ1Y0"];

  for (const tId of tournamentIds) {
    console.log(`\n================ TOURNAMENT: ${tId} ================`);
    const leaderboardSnap = await db
      .collection("tournaments")
      .doc(tId)
      .collection("leaderboard")
      .get();

    console.log(`Leaderboard entries: ${leaderboardSnap.size}`);
    for (const doc of leaderboardSnap.docs) {
      const data = doc.data();
      console.log(
        `User: ${data.nickname} (${doc.id}) | totalPoints: ${data.totalPoints} | projectedPoints: ${data.projectedPoints} | exact: ${data.exactScores} | correct: ${data.correctResults}`
      );
    }
  }

  console.log("\nPredictions with non-zero or interesting status:");
  const predsSnap = await db.collection("predictions").get();
  console.log(`Total predictions in system: ${predsSnap.size}`);
  predsSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.pointsEarned !== null || d.isLive) {
      console.log(
        `Pred: ${doc.id} | Match: ${d.matchId} | User: ${d.userId} | Points: ${d.pointsEarned} | isLive: ${d.isLive} | Pred: ${d.predictedHome}-${d.predictedAway}`
      );
    }
  });
}

main().catch(console.error);
