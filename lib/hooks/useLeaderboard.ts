// lib/hooks/useLeaderboard.ts
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { LeaderboardEntry } from "@/types/firestore";

export function useLeaderboard(tournamentId: string | null) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "tournaments", tournamentId, "leaderboard"),
      orderBy("totalPoints", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as LeaderboardEntry);
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tournamentId]);

  return { entries, loading };
}
