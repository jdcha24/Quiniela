// lib/hooks/useLeaderboard.ts
"use client";

import { useEffect, useState } from "react";
import { LeaderboardEntry } from "@/types/firestore";
import { mockLeaderboard } from "@/lib/mockData";

export function useLeaderboard(tournamentId: string | null) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      // Sort in descending order just in case
      const sorted = [...mockLeaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
      setEntries(sorted);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [tournamentId]);

  return { entries, loading };
}

