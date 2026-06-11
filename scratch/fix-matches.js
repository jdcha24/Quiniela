// scratch/fix-matches.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load .env.local variables
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
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

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials in env");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const db = admin.firestore();

async function run() {
  console.log("Fetching matches from Firestore...");
  const snap = await db.collection("matches").get();
  console.log(`Found ${snap.size} matches.`);

  const now = new Date();
  let updatedCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const kickoffDate = data.kickoffTime ? data.kickoffTime.toDate() : null;

    if (kickoffDate && kickoffDate > now && data.isLocked === true) {
      console.log(`Found incorrectly locked future match: ${data.homeTeam?.name} vs ${data.awayTeam?.name} (Kickoff: ${kickoffDate.toISOString()})`);
      await doc.ref.update({
        isLocked: false
      });
      console.log("-> Unlocked successfully");
      updatedCount++;
    }
  }

  console.log(`\nDone. Unlocked ${updatedCount} matches.`);
}

run().catch(console.error);
