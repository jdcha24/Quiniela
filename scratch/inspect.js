// scratch/inspect.js
const { getDb } = require('../lib/firebase/admin');

async function run() {
  try {
    const db = getDb();
    console.log("Firebase initialized successfully");
    
    // Fetch predictions
    const predictionsSnap = await db.collection("predictions").get();
    console.log(`Total predictions: ${predictionsSnap.size}`);
    
    const predictions = [];
    predictionsSnap.forEach(doc => {
      predictions.push({ id: doc.id, ...doc.data() });
    });
    
    // Group predictions by userId
    const byUser = {};
    predictions.forEach(p => {
      if (!byUser[p.userId]) byUser[p.userId] = [];
      byUser[p.userId].push(p);
    });
    
    console.log("\nUsers with predictions:");
    for (const [userId, preds] of Object.entries(byUser)) {
      console.log(`User ID: ${userId} - Name: ${preds[0].userNickname} - count: ${preds.length}`);
      preds.forEach(p => {
        console.log(`  Prediction: ${p.homeTeamName} vs ${p.awayTeamName} | scores: ${p.predictedHome}-${p.predictedAway} | pointsEarned: ${p.pointsEarned}`);
      });
    }
  } catch (err) {
    console.error("Error running inspect:", err);
  }
}

run();
