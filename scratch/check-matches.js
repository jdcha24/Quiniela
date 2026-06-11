// scratch/check-matches.js
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

  const list = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      home: data.homeTeam?.name,
      away: data.awayTeam?.name,
      kickoffTime: data.kickoffTime ? data.kickoffTime.toDate().toISOString() : "N/A",
      status: data.status,
      isLocked: data.isLocked,
    };
  });

  // Sort by kickoffTime
  list.sort((a, b) => a.kickoffTime.localeCompare(b.kickoffTime));

  console.log("\nMatches list:");
  list.forEach((m) => {
    console.log(
      `ID: ${m.id} | ${m.home} vs ${m.away} | Kickoff (UTC): ${m.kickoffTime} | Status: ${m.status} | isLocked (DB): ${m.isLocked}`
    );
  });
}

run().catch(console.error);
