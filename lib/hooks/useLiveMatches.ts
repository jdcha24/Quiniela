// lib/hooks/useLiveMatches.ts
"use client";

import { useEffect, useState } from "react";
import { MatchDocument } from "@/types/firestore";
import { mockMatches } from "@/lib/mockData";

export function useLiveMatches(tournamentIdOrIds: string | string[] | null) {
  const [matches, setMatches] = useState<MatchDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentIdOrIds || (Array.isArray(tournamentIdOrIds) && tournamentIdOrIds.length === 0)) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      let filtered: MatchDocument[] = [];

      if (Array.isArray(tournamentIdOrIds)) {
        const idsSet = new Set(tournamentIdOrIds);
        filtered = mockMatches.filter((match) =>
          match.tournamentIds.some((tId) => idsSet.has(tId))
        );
      } else {
        filtered = mockMatches.filter((match) =>
          match.tournamentIds.includes(tournamentIdOrIds)
        );
      }

      // Sort chronologically by kickoffTime (ascending)
      filtered.sort((a, b) => {
        const timeA = a.kickoffTime?.seconds || 0;
        const timeB = b.kickoffTime?.seconds || 0;
        return timeA - timeB;
      });

      setMatches(filtered);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [tournamentIdOrIds]);

  return { matches, loading };
}

