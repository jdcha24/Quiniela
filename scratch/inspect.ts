// scratch/inspect.ts
import { db } from "../lib/firebase/admin";

async function run() {
  try {
    console.log("Fetching predictions...");
    const predictionsSnap = await db.collection("predictions").get();
    console.log(`Total predictions in DB: ${predictionsSnap.size}`);
    
    const predictions: any[] = [];
    predictionsSnap.forEach(doc => {
      predictions.push({ id: doc.id, ...doc.data() });
    });
    
    // Group predictions by userId
    const byUser: Record<string, any[]> = {};
    predictions.forEach(p => {
      if (!byUser[p.userId]) byUser[p.userId] = [];
      byUser[p.userId].push(p);
    });
    
    console.log("\nUsers with predictions:");
    for (const [userId, preds] of Object.entries(byUser)) {
      console.log(`\nUser ID: ${userId} - Name in predictions: ${preds[0].userNickname || 'N/A'}`);
      
      // Fetch user doc from users collection
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        console.log(`User Doc exists! Nickname: ${userDoc.data()?.nickname}, activeTournamentIds: ${JSON.stringify(userDoc.data()?.activeTournamentIds)}`);
      } else {
        console.log(`User Doc DOES NOT exist for uid ${userId}`);
      }
      
      preds.forEach(p => {
        console.log(`  - Match: ${p.homeTeamName} vs ${p.awayTeamName} (${p.matchId})`);
        console.log(`    Predicted: ${p.predictedHome}-${p.predictedAway} | pointsEarned: ${p.pointsEarned}`);
      });
    }

    // Check all leaderboard collections
    console.log("\n--- LEADERBOARDS ---");
    const tournamentsSnap = await db.collection("tournaments").get();
    for (const tDoc of tournamentsSnap.docs) {
      const tData = tDoc.data();
      console.log(`Tournament: ${tData.name} (${tDoc.id})`);
      const lbSnap = await db.collection("tournaments").doc(tDoc.id).collection("leaderboard").get();
      console.log(`  Leaderboard entries: ${lbSnap.size}`);
      lbSnap.docs.forEach(entryDoc => {
        const entry = entryDoc.data();
        console.log(`    - User ${entryDoc.id} (${entry.nickname}): totalPoints=${entry.totalPoints}, predictions=${entry.predictions}`);
      });
    }

  } catch (err) {
    console.error("Error running inspect:", err);
  }
}

run();
