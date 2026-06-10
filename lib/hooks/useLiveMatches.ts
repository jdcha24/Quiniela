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

export function useLiveMatches(tournamentIdOrIds: string | string[] | null) {
  const [matches, setMatches] = useState<MatchDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentIdOrIds || (Array.isArray(tournamentIdOrIds) && tournamentIdOrIds.length === 0)) {
      setMatches([]);
      setLoading(false);
      return;
    }

    let q;
    if (Array.isArray(tournamentIdOrIds)) {
      // Chunk to max 30 items for array-contains-any
      const chunk = tournamentIdOrIds.slice(0, 30);
      q = query(
        collection(db, "matches"),
        where("tournamentIds", "array-contains-any", chunk)
      );
    } else {
      q = query(
        collection(db, "matches"),
        where("tournamentIds", "array-contains", tournamentIdOrIds)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as MatchDocument);
      // Sort chronologically by kickoffTime (ascending)
      data.sort((a, b) => {
        const timeA = a.kickoffTime?.seconds || 0;
        const timeB = b.kickoffTime?.seconds || 0;
        return timeA - timeB;
      });
      setMatches(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tournamentIdOrIds]);

  return { matches, loading };
}
