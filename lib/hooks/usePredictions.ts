// lib/hooks/usePredictions.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PredictionDocument } from "@/types/firestore";

export function usePredictions(
  userId: string | null
) {
  const [predictions, setPredictions] = useState<
    Map<string, PredictionDocument>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // matchId being saved

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "predictions"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map = new Map<string, PredictionDocument>();
      snapshot.docs.forEach((d) => {
        const pred = d.data() as PredictionDocument;
        map.set(pred.matchId, pred);
      });
      setPredictions(map);
      setLoading(false);
    });

    return () => unsubscribe();
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
      }
    ) => {
      if (!userId) return;

      const docId = `${userId}_${matchId}`;
      const docRef = doc(db, "predictions", docId);
      setSaving(matchId);

      try {
        const existing = predictions.get(matchId);
        const now = serverTimestamp();

        await setDoc(
          docRef,
          {
            id: docId,
            userId,
            matchId,
            tournamentId: "global",
            predictedHome,
            predictedAway,
            predictedHome2,
            predictedAway2,
            updatedAt: now,
            ...(!existing && {
              submittedAt: now,
              pointsEarned: null,
              pointsEarned1: null,
              pointsEarned2: null,
              evaluatedAt: null,
              ...matchMeta,
            }),
          },
          { merge: true }
        );
      } finally {
        setSaving(null);
      }
    },
    [userId, predictions]
  );

  return { predictions, loading, saving, savePrediction };
}
