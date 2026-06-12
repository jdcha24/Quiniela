// app/(app)/tournament/[tournamentId]/leaderboard/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { useLiveMatches } from "@/lib/hooks/useLiveMatches";
import { usePredictions } from "@/lib/hooks/usePredictions";
import { LeaderboardEntry, PredictionDocument } from "@/types/firestore";
import { projectScore } from "@/lib/scoring/calculator";
import { getAvatarUrlFromConfig } from "@/lib/utils/dicebear";
import { ArrowLeft, Crown, Flame, Sparkles } from "lucide-react";
import Link from "next/link";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />;
  if (rank === 2) return <span className="rank-silver text-lg font-black">2°</span>;
  if (rank === 3) return <span className="rank-bronze text-lg font-black">3°</span>;
  return <span className="text-white/50 text-base font-bold">{rank}°</span>;
}

function LeaderboardRow({
  entry,
  isCurrentUser,
  projectedBonus,
  displayRank,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  projectedBonus: number;
  displayRank: number;
}) {
  const projectedTotal = entry.totalPoints + projectedBonus;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 ${
        isCurrentUser
          ? "bg-violet-500/15 border border-violet-500/30 glow-primary"
          : "bg-white/3 border border-transparent hover:bg-white/5"
      }`}
    >
      {/* Rank */}
      <div className="w-8 flex justify-center shrink-0">
        <RankBadge rank={displayRank} />
      </div>

      {/* Avatar */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.avatarConfig ? getAvatarUrlFromConfig(entry.avatarConfig, 40) : `https://api.dicebear.com/9.x/${entry.avatarStyle}/svg?seed=${entry.avatarSeed}&size=40`}
        alt={entry.nickname}
        className={`w-10 h-10 rounded-xl border shrink-0 ${
          isCurrentUser ? "border-violet-500/50" : "border-white/10"
        }`}
        style={{
          background: entry.avatarConfig?.backgroundColor
            ? `#${entry.avatarConfig.backgroundColor}`
            : "#1a1a28",
        }}
      />

      {/* Name and stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold text-sm truncate ${isCurrentUser ? "text-violet-300" : "text-white"}`}>
            {entry.nickname}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] text-violet-400 font-semibold">(tú)</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-white/30">{entry.exactScores} exactos</span>
          <span className="text-white/15">·</span>
          <span className="text-xs text-white/30">{entry.correctResults} resultados</span>
        </div>
      </div>

      {/* Points */}
      <div className="flex flex-col items-end shrink-0">
        <span className={`text-xl font-black ${isCurrentUser ? "text-violet-300" : "text-white"}`}>
          {entry.totalPoints}
        </span>
        {projectedBonus > 0 && (
          <div className="flex items-center gap-0.5 text-cyan-400">
            <Flame className="w-3 h-3" />
            <span className="text-xs font-bold">+{projectedBonus}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const { user, userDoc, loading: authLoading } = useAuth();

  const { entries, loading } = useLeaderboard(tournamentId);
  const { matches } = useLiveMatches(tournamentId);
  const { predictions } = usePredictions(user?.uid ?? null);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (userDoc && userDoc.role !== "admin" && !userDoc.activeTournamentIds?.includes(tournamentId)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-mesh text-center space-y-4 animate-fade-up">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-bold text-red-400">Acceso no autorizado</h2>
        <p className="text-white/40 text-sm max-w-xs">No estás registrado en este torneo. Contacta al administrador para solicitar acceso.</p>
        <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-sm transition-all">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  // Calculate live projected bonuses per user from database projectedPoints
  const liveMatches = matches.filter((m) => m.status === "LIVE" || m.status === "HT");
  const hasLive = liveMatches.length > 0;

  const myEntry = entries.find((e) => e.userId === user?.uid);
  const myProjectedPoints = myEntry ? (typeof myEntry.projectedPoints === "number" ? myEntry.projectedPoints : myEntry.totalPoints) : 0;
  const myProjectedBonus = myEntry ? Math.max(0, myProjectedPoints - myEntry.totalPoints) : 0;

  const sortedEntries = [...entries];
  if (hasLive) {
    sortedEntries.sort((a, b) => {
      const ptsA = typeof a.projectedPoints === "number" ? a.projectedPoints : a.totalPoints;
      const ptsB = typeof b.projectedPoints === "number" ? b.projectedPoints : b.totalPoints;
      return ptsB - ptsA;
    });
  }

  return (
    <div className="px-4 py-5 space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/tournament/${tournamentId}`}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center
            hover:bg-white/10 active:scale-90 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-white/70" />
        </Link>
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Tabla de posiciones
          </h2>
          <p className="text-xs text-white/40">{entries.length} participantes</p>
        </div>
      </div>

      {/* Live projection banner */}
      {liveMatches.length > 0 && (
        <div className="glass-card rounded-2xl p-4 border border-red-500/30 glow-orange">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-live-pulse" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">
              {liveMatches.length} partido(s) en vivo
            </span>
          </div>
          <p className="text-xs text-white/50">
            Los puntos proyectados (
            <Flame className="inline w-3 h-3 text-cyan-400" />
            ) muestran lo que ganarías con los marcadores actuales.
          </p>
          {myProjectedBonus > 0 && (
            <div className="mt-2 flex items-center gap-2 text-cyan-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold">
                Tú proyectas +{myProjectedBonus} puntos más
              </span>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-2">
          <Crown className="w-10 h-10 text-white/20 mx-auto" />
          <p className="text-white/40 text-sm">Nadie ha registrado puntos aún.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sortedEntries.map((entry, i) => {
            const entryProjPoints = typeof entry.projectedPoints === "number" ? entry.projectedPoints : entry.totalPoints;
            const bonus = Math.max(0, entryProjPoints - entry.totalPoints);
            const displayRank = hasLive ? (entry.projectedRank ?? entry.rank) : entry.rank;
            return (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                isCurrentUser={entry.userId === user?.uid}
                projectedBonus={bonus}
                displayRank={displayRank}
              />
            );
          })}
        </div>
      )}

      {/* Scoring legend */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">Sistema de puntos</h4>
        <div className="space-y-2">
          {[
            { pts: 3, label: "Marcador exacto", color: "text-emerald-400 bg-emerald-500/15" },
            { pts: 1, label: "Resultado correcto (G/E/P)", color: "text-amber-400 bg-amber-500/15" },
            { pts: 0, label: "Fallo total", color: "text-red-400 bg-red-500/15" },
          ].map(({ pts, label, color }) => (
            <div key={pts} className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${color}`}>
                {pts}
              </span>
              <span className="text-xs text-white/50">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
