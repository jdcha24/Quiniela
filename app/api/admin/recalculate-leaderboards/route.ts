// app/api/admin/recalculate-leaderboards/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, verifyAdminSession } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    await verifyAdminSession(req);
  } catch (err) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[RECALCULATE] Iniciando recalculación de tablas de posiciones...");

    // 1. Obtener todos los torneos
    const tournamentsSnap = await db.collection("tournaments").get();
    const tournamentResults: any[] = [];

    // 2. Obtener todas las predicciones del sistema
    const predictionsSnap = await db.collection("predictions").get();
    const allPredictions = predictionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    for (const tournamentDoc of tournamentsSnap.docs) {
      const tournamentId = tournamentDoc.id;
      const tournamentData = tournamentDoc.data();
      const matchIds = (tournamentData.matchIds || []) as string[];

      console.log(`[RECALCULATE] Procesando torneo: ${tournamentData.name} (${tournamentId})`);

      if (matchIds.length === 0) {
        console.log(`[RECALCULATE]   Sin partidos asignados. Omitiendo.`);
        continue;
      }

      const matchIdsSet = new Set(matchIds);
      
      // Filtrar predicciones que corresponden a este torneo
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
        
        // Si no está evaluado, omitir de la suma de puntos
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

      // 4. Actualizar tabla de clasificación en Firestore
      const batch = db.batch();
      const leaderboardCol = db.collection("tournaments").doc(tournamentId).collection("leaderboard");

      // Obtener usuarios existentes en la clasificación
      const existingLeaderboardSnap = await leaderboardCol.get();
      const existingUserIds = new Set(existingLeaderboardSnap.docs.map(doc => doc.id));

      // Obtener usuarios activos asignados a este torneo
      const tournamentUsersSnap = await db.collection("users")
        .where("activeTournamentIds", "array-contains", tournamentId)
        .get();
      const activeUserIds = new Set(tournamentUsersSnap.docs.map(doc => doc.id));

      // Unión de todos los usuarios
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

        if (activeUserIds.has(userId) || stats.predictionsCount > 0) {
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
            lastUpdated: Timestamp.now(),
            rank: 999,
            projectedPoints: stats.totalPoints,
            projectedRank: 999,
          }, { merge: true });
        } else {
          // Limpiar entradas huérfanas si el usuario no tiene predicciones ni está en el torneo
          batch.delete(leaderboardDocRef);
        }
      }

      await batch.commit();

      // 5. Recalcular las posiciones (ranks)
      await recalculateRanks(tournamentId);

      tournamentResults.push({
        tournamentId,
        name: tournamentData.name,
        participantsProcessed: allUserIds.size,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Tablas recalculadas con éxito.",
      tournaments: tournamentResults,
    });

  } catch (err: any) {
    console.error("[RECALCULATE] Error recalculating leaderboards:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
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
