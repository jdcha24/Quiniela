// app/(app)/tournament/[tournamentId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLiveMatches } from "@/lib/hooks/useLiveMatches";
import { usePredictions } from "@/lib/hooks/usePredictions";
import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { MatchDocument, LeaderboardEntry } from "@/types/firestore";
import { isMatchLocked, formatKickoff } from "@/lib/utils/dates";
import { Lock, Loader2, Check, Minus, Plus, Radio, Clock, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { MatchCard } from "@/components/MatchCard";

// ─── Tournament Page ──────────────────────────────────────────────────────────
export default function TournamentPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const { user, userDoc, loading: authLoading } = useAuth();

  const { matches, loading: matchesLoading } = useLiveMatches(tournamentId);
  const { entries: participants } = useLeaderboard(tournamentId);
  const { predictions, loading: predLoading, saving, savePrediction } = usePredictions(
    user?.uid ?? null
  );

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

  const handleSave = async (
    matchId: string,
    home1: number,
    away1: number,
    home2: number | null,
    away2: number | null
  ) => {
    if (!user) return;
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    await savePrediction(
      matchId,
      home1,
      away1,
      home2,
      away2,
      {
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        kickoffTime: match.kickoffTime as Timestamp,
      },
      {
        nickname: userDoc?.nickname || "Jugador",
        avatarSeed: userDoc?.avatarSeed || "",
        avatarStyle: userDoc?.avatarStyle || "bottts",
        avatarConfig: userDoc?.avatarConfig || null,
      }
    );
  };

  const liveMatches = matches.filter((m) => m.status === "LIVE" || m.status === "HT");
  const pendingMatches = matches.filter((m) => m.status === "NS");
  const finishedMatches = matches.filter((m) => m.status === "FT" || m.status === "CANC");

  const renderSection = (title: string, items: MatchDocument[], emoji: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white/60 uppercase tracking-wider px-1">
          <span>{emoji}</span> {title}
          <span className="text-xs font-normal text-white/30">({items.length})</span>
        </h3>
        {items.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            userId={user?.uid ?? ""}
            predictions={predictions}
            saving={saving}
            onSave={handleSave}
            participants={participants}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="px-4 py-5 space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white">Mis Pronósticos</h2>
        <Link
          href={`/tournament/${tournamentId}/leaderboard`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
            bg-amber-500/10 border border-amber-500/30 text-amber-400
            hover:bg-amber-500/20 transition-all"
        >
          Ver tabla 🏆
        </Link>
      </div>

      {matchesLoading || predLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl h-44 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-3">
          <div className="text-4xl">⚽</div>
          <p className="text-white/40 text-sm">El admin aún no ha asignado partidos a este torneo.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {renderSection("En vivo", liveMatches, "🔴")}
          {renderSection("Próximos", pendingMatches, "📅")}
          {renderSection("Finalizados", finishedMatches, "✅")}
        </div>
      )}
    </div>
  );
}
