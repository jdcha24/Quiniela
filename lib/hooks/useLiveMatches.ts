// lib/hooks/useLiveMatches.ts
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { MatchDocument } from "@/types/firestore";

export function useLiveMatches(tournamentId: string | null) {
  const [matches, setMatches] = useState<MatchDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "matches"),
      where("tournamentId", "==", tournamentId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as MatchDocument);
      // Sort: LIVE first, then NS by kickoff, then FT last
      data.sort((a, b) => {
        const order = { LIVE: 0, HT: 0, NS: 1, PST: 2, FT: 3, CANC: 4 };
        return (order[a.status] ?? 1) - (order[b.status] ?? 1);
      });
      setMatches(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tournamentId]);

  return { matches, loading };
}
