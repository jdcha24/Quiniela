// app/(app)/leaderboard/page.tsx — Global leaderboard across all active tournaments
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { TournamentDocument, LeaderboardEntry } from "@/types/firestore";
import { getAvatarUrlFromConfig } from "@/lib/utils/dicebear";
import { Crown, Trophy, ChevronRight, Flame } from "lucide-react";
import Link from "next/link";

export default function GlobalLeaderboardPage() {
  const { user, userDoc } = useAuth();
  const [tournaments, setTournaments] = useState<TournamentDocument[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { entries, loading: leaderboardLoading } = useLeaderboard(selectedTournament);

  useEffect(() => {
    const fetchTournaments = async () => {
      if (!userDoc?.activeTournamentIds || userDoc.activeTournamentIds.length === 0) {
        setTournaments([]);
        setSelectedTournament(null);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "tournaments"),
        where("status", "in", ["open", "in_progress", "finished"])
      );
      const snap = await getDocs(q);
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as TournamentDocument))
        .filter((t) => userDoc.activeTournamentIds.includes(t.id));

      setTournaments(docs);

      // Auto-select first tournament
      setSelectedTournament(docs[0]?.id ?? null);
      setLoading(false);
    };
    fetchTournaments();
  }, [userDoc]);

  const selectedTournamentDoc = tournaments.find((t) => t.id === selectedTournament);

  return (
    <div className="px-4 py-5 space-y-5 animate-fade-up">
      <div className="flex items-center gap-2">
        <Crown className="w-6 h-6 text-amber-400" />
        <h2 className="text-2xl font-black text-white">Tabla General</h2>
      </div>

      {/* Tournament tabs */}
      {tournaments.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTournament(t.id)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedTournament === t.id
                  ? "bg-violet-600 text-white"
                  : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              {t.name.length > 25 ? t.name.substring(0, 25) + "..." : t.name}
            </button>
          ))}
        </div>
      )}

      {/* Tournament title */}
      {selectedTournamentDoc && (
        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">{selectedTournamentDoc.name}</h3>
            <p className="text-xs text-white/40">{entries.length} participantes</p>
          </div>
          <Link
            href={`/tournament/${selectedTournament}/leaderboard`}
            className="flex items-center gap-1 text-xs text-violet-400 font-semibold"
          >
            Detalle <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Leaderboard */}
      {loading || leaderboardLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-2">
          <Crown className="w-10 h-10 text-white/20 mx-auto" />
          <p className="text-white/40 text-sm">No hay posiciones aún.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {(() => {
            const hasLive = entries.some((e) => (typeof e.projectedPoints === "number" ? e.projectedPoints : e.totalPoints) !== e.totalPoints);
            const sortedEntries = [...entries];
            if (hasLive) {
              sortedEntries.sort((a, b) => {
                const ptsA = typeof a.projectedPoints === "number" ? a.projectedPoints : a.totalPoints;
                const ptsB = typeof b.projectedPoints === "number" ? b.projectedPoints : b.totalPoints;
                return ptsB - ptsA;
              });
            }

            return sortedEntries.map((entry, index) => {
              const isMe = entry.userId === user?.uid;
              const rankToDisplay = hasLive ? (entry.projectedRank ?? entry.rank) : entry.rank;
              const rankColor =
                rankToDisplay === 1 ? "rank-gold" :
                rankToDisplay === 2 ? "rank-silver" :
                rankToDisplay === 3 ? "rank-bronze" : "text-white/50";

              return (
                <div
                  key={entry.userId}
                  id={`leaderboard-row-${entry.userId}`}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    isMe
                      ? "bg-violet-500/15 border border-violet-500/30"
                      : "bg-white/3 border border-transparent"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {rankToDisplay <= 3 ? (
                      <span className={`text-xl font-black ${rankColor}`}>
                        {rankToDisplay === 1 ? "🥇" : rankToDisplay === 2 ? "🥈" : "🥉"}
                      </span>
                    ) : (
                      <span className="text-white/40 text-sm font-bold">{rankToDisplay}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.avatarConfig ? getAvatarUrlFromConfig(entry.avatarConfig, 40) : `https://api.dicebear.com/9.x/${entry.avatarStyle}/svg?seed=${entry.avatarSeed}&size=40`}
                    alt={entry.nickname}
                    className={`w-10 h-10 rounded-xl border ${isMe ? "border-violet-500/50" : "border-white/10"}`}
                    style={{
                      background: entry.avatarConfig?.backgroundColor
                        ? `#${entry.avatarConfig.backgroundColor}`
                        : "#1a1a28",
                    }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={`font-bold text-sm ${isMe ? "text-violet-300" : "text-white"}`}>
                        {entry.nickname}
                      </span>
                      {isMe && <span className="text-[10px] text-violet-400">(tú)</span>}
                    </div>
                    <div className="text-xs text-white/30">
                      {entry.exactScores}✓ exactos · {entry.correctResults}✓ resultados
                    </div>
                  </div>

                  {/* Points */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-xl font-black ${isMe ? "text-violet-300" : "text-white"}`}>
                      {hasLive ? (entry.projectedPoints ?? entry.totalPoints) : entry.totalPoints}
                    </span>
                    {hasLive && (entry.projectedPoints ?? entry.totalPoints) > entry.totalPoints && (
                      <div className="flex items-center gap-0.5 text-cyan-400 mt-0.5">
                        <Flame className="w-3 h-3 animate-pulse text-cyan-400" />
                        <span className="text-[10px] font-bold">+{entry.projectedPoints - entry.totalPoints}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
