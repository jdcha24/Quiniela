// scratch/rebuild-leaderboards.ts
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

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
  console.error("Missing Firebase Admin credentials in env. Please make sure they are defined or that .env.local exists.");
  process.exit(1);
}

// Initialize firebase admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = admin.firestore();

async function run() {
  console.log("[CLI] Iniciando recalculación de tablas de posiciones...");

  // 1. Obtener todos los torneos
  const tournamentsSnap = await db.collection("tournaments").get();
  
  // 2. Obtener todas las predicciones del sistema
  const predictionsSnap = await db.collection("predictions").get();
  const allPredictions = predictionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  for (const tournamentDoc of tournamentsSnap.docs) {
    const tournamentId = tournamentDoc.id;
    const tournamentData = tournamentDoc.data();
    const matchIds = (tournamentData.matchIds || []) as string[];

    console.log(`\nProcesando torneo: ${tournamentData.name} (${tournamentId})`);

    if (matchIds.length === 0) {
      console.log(`  Sin partidos asignados. Omitiendo.`);
      continue;
    }

    const matchIdsSet = new Set(matchIds);
    const tournamentPredictions = allPredictions.filter(p => matchIdsSet.has(p.matchId));

    // 3. Agrupar estadísticas por usuario
    const userStats: Record<string, {
      userId: string;
      nickname: string;
      avatarSeed: string;
      avatarStyle: string;
      avatarConfig: any;
      totalPoints: number;
      exactScores: number;
      correctResults: number;
      predictionsCount: number;
    }> = {};

    for (const pred of tournamentPredictions) {
      const userId = pred.userId;
      const points = typeof pred.pointsEarned === "number" ? pred.pointsEarned : 0;
      
      // Omitir si no está evaluado
      if (pred.pointsEarned === null || pred.pointsEarned === undefined) {
        continue;
      }

      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          nickname: pred.userNickname || "Jugador",
          avatarSeed: pred.userAvatarSeed || "",
          avatarStyle: pred.userAvatarStyle || "bottts",
          avatarConfig: pred.userAvatarConfig || null,
          totalPoints: 0,
          exactScores: 0,
          correctResults: 0,
          predictionsCount: 0,
        };
      }

      const stats = userStats[userId];
      stats.totalPoints += points;
      stats.predictionsCount += 1;
      if (points === 3) stats.exactScores += 1;
      if (points === 1) stats.correctResults += 1;
    }

    // 4. Escribir clasificación
    const batch = db.batch();
    const leaderboardCol = db.collection("tournaments").doc(tournamentId).collection("leaderboard");

    // Clasificación existente
    const existingLeaderboardSnap = await leaderboardCol.get();
    const existingUserIds = new Set(existingLeaderboardSnap.docs.map(doc => doc.id));

    // Usuarios del torneo
    const tournamentUsersSnap = await db.collection("users")
      .where("activeTournamentIds", "array-contains", tournamentId)
      .get();
    const activeUserIds = new Set(tournamentUsersSnap.docs.map(doc => doc.id));

    const allUserIds = new Set([...existingUserIds, ...activeUserIds, ...Object.keys(userStats)]);

    for (const userId of allUserIds) {
      const stats = userStats[userId] || {
        userId,
        nickname: "Jugador",
        avatarSeed: "",
        avatarStyle: "bottts",
        avatarConfig: null,
        totalPoints: 0,
        exactScores: 0,
        correctResults: 0,
        predictionsCount: 0,
      };

      const userDoc = tournamentUsersSnap.docs.find(d => d.id === userId) || await db.collection("users").doc(userId).get();
      let nickname = stats.nickname;
      let avatarSeed = stats.avatarSeed;
      let avatarStyle = stats.avatarStyle;
      let avatarConfig = stats.avatarConfig;

      if (userDoc.exists) {
        const userData = userDoc.data();
        nickname = userData?.nickname || nickname;
        avatarSeed = userData?.avatarSeed || avatarSeed;
        avatarStyle = userData?.avatarStyle || avatarStyle;
        avatarConfig = userData?.avatarConfig || avatarConfig;
      }

      const leaderboardDocRef = leaderboardCol.doc(userId);

      if (activeUserIds.has(userId)) {
        console.log(`  -> Actualizando clasificación usuario ${userId} (${nickname}): totalPoints=${stats.totalPoints}`);
        batch.set(leaderboardDocRef, {
          userId,
          nickname,
          avatarSeed,
          avatarStyle,
          avatarConfig,
          totalPoints: stats.totalPoints,
          exactScores: stats.exactScores,
          correctResults: stats.correctResults,
          predictions: stats.predictionsCount,
          lastUpdated: admin.firestore.Timestamp.now(),
          rank: 999,
          projectedPoints: stats.totalPoints,
          projectedRank: 999,
        }, { merge: true });
      } else {
        console.log(`  -> Eliminando clasificación huérfana para usuario ${userId}`);
        batch.delete(leaderboardDocRef);
      }
    }

    await batch.commit();

    // 5. Recalcular ranks
    await recalculateRanks(tournamentId);
    console.log(`  ✓ Posiciones y clasificaciones recalculadas para ${allUserIds.size} usuarios.`);
  }

  console.log("\n[CLI] Completado con éxito.");
}

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

run().catch(console.error);
