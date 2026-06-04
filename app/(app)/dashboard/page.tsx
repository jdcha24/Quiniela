// app/(app)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { TournamentDocument, LeaderboardEntry } from "@/types/firestore";
import { Trophy, Calendar, Users, Zap, Plus, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { formatKickoff } from "@/lib/utils/dates";

export default function DashboardPage() {
  const { user, userDoc } = useAuth();
  const [tournaments, setTournaments] = useState<TournamentDocument[]>([]);
  const [myStats, setMyStats] = useState<Map<string, LeaderboardEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchTournaments();
  }, [user]);

  const fetchTournaments = async () => {
    const q = query(
      collection(db, "tournaments"),
      where("status", "in", ["open", "in_progress"])
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentDocument));
    setTournaments(docs);

    // Fetch my leaderboard entries for each tournament
    const statsMap = new Map<string, LeaderboardEntry>();
    await Promise.all(
      docs.map(async (t) => {
        if (user && userDoc?.activeTournamentIds?.includes(t.id)) {
          const entryDoc = await getDocs(
            query(collection(db, "tournaments", t.id, "leaderboard"), where("userId", "==", user.uid))
          );
          if (!entryDoc.empty) {
            statsMap.set(t.id, entryDoc.docs[0].data() as LeaderboardEntry);
          }
        }
      })
    );
    setMyStats(statsMap);
    setLoading(false);
  };

  const joinTournament = async (tournamentId: string) => {
    if (!user || !userDoc) return;
    setJoining(tournamentId);

    // Add user to leaderboard subcollection
    const leaderboardRef = doc(db, "tournaments", tournamentId, "leaderboard", user.uid);
    await setDoc(leaderboardRef, {
      userId: user.uid,
      nickname: userDoc.nickname,
      avatarSeed: userDoc.avatarSeed,
      avatarStyle: userDoc.avatarStyle,
      avatarConfig: userDoc.avatarConfig || null,
      totalPoints: 0,
      exactScores: 0,
      correctResults: 0,
      predictions: 0,
      rank: 999,
      lastUpdated: serverTimestamp(),
      projectedPoints: 0,
      projectedRank: 999,
    });

    // Update user's activeTournamentIds
    await updateDoc(doc(db, "users", user.uid), {
      activeTournamentIds: arrayUnion(tournamentId),
      updatedAt: serverTimestamp(),
    });

    // Update tournament participant count
    const tournamentRef = doc(db, "tournaments", tournamentId);
    const t = tournaments.find((t) => t.id === tournamentId);
    if (t) {
      await updateDoc(tournamentRef, {
        participantCount: (t.participantCount || 0) + 1,
      });
    }

    setJoining(null);
    fetchTournaments(); // refresh
  };

  const isJoined = (tournamentId: string) =>
    userDoc?.activeTournamentIds?.includes(tournamentId) ?? false;

  return (
    <div className="px-4 py-6 space-y-6 animate-fade-up">
      {/* Greeting */}
      <div className="space-y-1">
        <p className="text-white/50 text-sm">Bienvenido de vuelta,</p>
        <h2 className="text-2xl font-black text-white">
          {userDoc?.nickname ?? "jugador"}
          <span className="text-violet-400"> 👋</span>
        </h2>
      </div>

      {/* Quick stats row */}
      {myStats.size > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[...myStats.values()].slice(0, 1).map((entry) => (
            <>
              <div key="rank" className="glass-card rounded-2xl p-3 text-center">
                <div className="rank-gold text-2xl font-black">#{entry.rank}</div>
                <div className="text-xs text-white/40 mt-1">Posición</div>
              </div>
              <div key="pts" className="glass-card rounded-2xl p-3 text-center">
                <div className="text-2xl font-black text-violet-400">{entry.totalPoints}</div>
                <div className="text-xs text-white/40 mt-1">Puntos</div>
              </div>
              <div key="exact" className="glass-card rounded-2xl p-3 text-center">
                <div className="text-2xl font-black text-emerald-400">{entry.exactScores}</div>
                <div className="text-xs text-white/40 mt-1">Exactos</div>
              </div>
            </>
          ))}
        </div>
      )}

      {/* Tournaments section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white/80 text-sm uppercase tracking-wider">
            Torneos activos
          </h3>
          <span className="text-xs text-violet-400 font-semibold">{tournaments.length} disponibles</span>
        </div>

        {loading ? (
          // Skeleton
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="glass-card rounded-2xl h-32 animate-pulse bg-white/5" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center space-y-2">
            <Calendar className="w-10 h-10 text-white/20 mx-auto" />
            <p className="text-white/40 text-sm">No hay torneos activos.</p>
            <p className="text-white/25 text-xs">El admin creará uno pronto.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((tournament) => {
              const joined = isJoined(tournament.id);
              const stats = myStats.get(tournament.id);

              return (
                <div key={tournament.id} className="glass-card rounded-2xl p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-base leading-tight truncate">
                        {tournament.name}
                      </h4>
                      {tournament.description && (
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
                          {tournament.description}
                        </p>
                      )}
                    </div>
                    {/* Status badge */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shrink-0 ${
                      tournament.status === "in_progress"
                        ? "bg-red-500/15 text-red-400 border border-red-500/30"
                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    }`}>
                      {tournament.status === "in_progress" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-live-pulse" />
                      )}
                      {tournament.status === "in_progress" ? "En curso" : "Abierto"}
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {tournament.matchIds.length} partidos
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {tournament.participantCount} participantes
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tournament.startDate ? formatKickoff(tournament.startDate) : "—"}
                    </div>
                  </div>

                  {/* My stats if joined */}
                  {joined && stats && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <span className="text-sm font-black rank-gold">#{stats.rank}</span>
                      <span className="text-xs text-white/50">·</span>
                      <span className="text-sm font-bold text-violet-400">{stats.totalPoints} pts</span>
                      <span className="text-xs text-white/50">·</span>
                      <span className="text-xs text-white/50">{stats.exactScores} exactos</span>
                    </div>
                  )}

                  {/* CTA */}
                  {joined ? (
                    <Link
                      href={`/tournament/${tournament.id}`}
                      id={`btn-enter-tournament-${tournament.id}`}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                        bg-gradient-to-r from-violet-600 to-purple-600 font-bold text-white text-sm
                        hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all"
                    >
                      Ver mis pronósticos
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => joinTournament(tournament.id)}
                      disabled={joining === tournament.id}
                      id={`btn-join-tournament-${tournament.id}`}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                        bg-white/5 border border-white/10 font-bold text-white/80 text-sm
                        hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {joining === tournament.id ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-transparent animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Unirme al torneo
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
