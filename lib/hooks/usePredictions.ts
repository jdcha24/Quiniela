// lib/hooks/usePredictions.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { PredictionDocument } from "@/types/firestore";
import { mockUserPredictions } from "@/lib/mockData";
import { Timestamp } from "firebase/firestore";

export function usePredictions(userId: string | null) {
  const [predictions, setPredictions] = useState<Map<string, PredictionDocument>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // matchId being saved

  useEffect(() => {
    if (!userId) {
      setPredictions(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      // Create a fresh copy of mockUserPredictions
      setPredictions(new Map(mockUserPredictions));
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [userId]);

  const savePrediction = useCallback(
    async (
      matchId: string,
      predictedHome: number,
      predictedAway: number,
      predictedHome2: number | null,
      predictedAway2: number | null,
      matchMeta: {
        homeTeamName: string;
        awayTeamName: string;
        kickoffTime: Timestamp;
      },
      userMeta: {
        nickname: string;
        avatarSeed: string;
        avatarStyle: string;
        avatarConfig?: any;
      }
    ) => {
      if (!userId) return;

      setSaving(matchId);

      // Simulate a small network save delay (600ms)
      await new Promise((resolve) => setTimeout(resolve, 600));

      const docId = `${userId}_${matchId}`;
      const now = Timestamp.fromDate(new Date());

      setPredictions((prev) => {
        const next = new Map(prev);
        const existing = next.get(matchId);

        next.set(matchId, {
          id: docId,
          userId,
          matchId,
          tournamentId: "global",
          predictedHome,
          predictedAway,
          predictedHome2,
          predictedAway2,
          updatedAt: now,
          userNickname: userMeta.nickname,
          userAvatarSeed: userMeta.avatarSeed,
          userAvatarStyle: userMeta.avatarStyle,
          userAvatarConfig: userMeta.avatarConfig || null,
          submittedAt: existing?.submittedAt || now,
          pointsEarned: existing?.pointsEarned ?? null,
          pointsEarned1: existing?.pointsEarned1 ?? null,
          pointsEarned2: existing?.pointsEarned2 ?? null,
          evaluatedAt: existing?.evaluatedAt ?? null,
          homeTeamName: matchMeta.homeTeamName,
          awayTeamName: matchMeta.awayTeamName,
          kickoffTime: matchMeta.kickoffTime,
        });

        return next;
      });

      setSaving(null);
    },
    [userId]
  );

  return { predictions, loading, saving, savePrediction };
}

