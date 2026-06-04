// app/(app)/tournament/[tournamentId]/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLiveMatches } from "@/lib/hooks/useLiveMatches";
import { usePredictions } from "@/lib/hooks/usePredictions";
import { MatchDocument } from "@/types/firestore";
import { isMatchLocked, formatKickoff } from "@/lib/utils/dates";
import { Lock, Loader2, Check, Minus, Plus, Radio, Clock } from "lucide-react";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";

// ─── Score Input Component ────────────────────────────────────────────────────
function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="score-btn bg-white/5 border border-white/10 text-white/60
            hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
        >
          <Minus className="w-3 h-3" />
        </button>
        <div className="score-display">{value}</div>
        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          className="score-btn bg-white/5 border border-white/10 text-white/60
            hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-400"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { PredictionDocument } from "@/types/firestore";

// ─── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({
  match,
  userId,
  tournamentId,
  predictions,
  saving,
  onSave,
}: {
  match: MatchDocument;
  userId: string;
  tournamentId: string;
  predictions: Map<string, PredictionDocument>;
  saving: string | null;
  onSave: (
    matchId: string,
    home1: number,
    away1: number,
    home2: number | null,
    away2: number | null
  ) => void;
}) {
  const existing = predictions.get(match.id);
  const [home1, setHome1] = useState(existing?.predictedHome ?? 0);
  const [away1, setAway1] = useState(existing?.predictedAway ?? 0);

  const [hasOption2, setHasOption2] = useState(
    existing?.predictedHome2 !== null && existing?.predictedHome2 !== undefined
  );
  const [home2, setHome2] = useState(existing?.predictedHome2 ?? 0);
  const [away2, setAway2] = useState(existing?.predictedAway2 ?? 0);

  const locked = match.isLocked || isMatchLocked(match.kickoffTime);
  const isLive = match.status === "LIVE" || match.status === "HT";
  const isFinished = match.status === "FT";
  const isSaving = saving === match.id;

  // Sync state with incoming database updates (e.g. initial load)
  useEffect(() => {
    if (existing) {
      setHome1(existing.predictedHome);
      setAway1(existing.predictedAway);
      const opt2 = existing.predictedHome2 !== null && existing.predictedHome2 !== undefined;
      setHasOption2(opt2);
      setHome2(existing.predictedHome2 ?? 0);
      setAway2(existing.predictedAway2 ?? 0);
    }
  }, [existing]);

  const hasChanged =
    !existing ||
    home1 !== existing.predictedHome ||
    away1 !== existing.predictedAway ||
    hasOption2 !== (existing.predictedHome2 !== null && existing.predictedHome2 !== undefined) ||
    (hasOption2 && (home2 !== existing.predictedHome2 || away2 !== existing.predictedAway2));

  const pointsColor = (pts: number | null) => {
    if (pts === 3) return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
    if (pts === 1) return "text-amber-400 bg-amber-500/15 border-amber-500/30";
    if (pts === 0) return "text-red-400 bg-red-500/15 border-red-500/30";
    return "";
  };

  return (
    <div className={`glass-card rounded-2xl p-4 space-y-3 transition-all duration-200 ${
      isLive ? "border-red-500/30 glow-orange" : ""
    }`}>
      {/* Match header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={match.leagueLogo}
            alt={match.leagueName}
            className="w-4 h-4 object-contain opacity-70"
          />
          <span className="text-xs text-white/40 font-medium">{match.leagueName}</span>
        </div>

        <div className="flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-live-pulse" />
              <Radio className="w-3 h-3 text-red-400" />
              <span className="text-xs font-bold text-red-400">
                {match.liveScore.elapsed ?? "HT"}&apos;
              </span>
            </div>
          )}
          {isFinished && existing?.pointsEarned !== null && existing?.pointsEarned !== undefined && (
            <div className={`px-2.5 py-1 rounded-full text-xs font-black border ${pointsColor(existing.pointsEarned)}`}>
              +{existing.pointsEarned} pts
            </div>
          )}
          {locked && !isLive && !isFinished && (
            <div className="flex items-center gap-1 text-white/30 text-xs">
              <Lock className="w-3 h-3" />
              Cerrado
            </div>
          )}
          {!locked && (
            <div className="flex items-center gap-1 text-white/40 text-xs">
              <Clock className="w-3 h-3" />
              {formatKickoff(match.kickoffTime)}
            </div>
          )}
        </div>
      </div>

      {/* Teams row */}
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={match.homeTeam.logo}
            alt={match.homeTeam.name}
            className="w-8 h-8 object-contain"
          />
          <span className="text-sm font-bold text-white leading-tight line-clamp-2 flex-1">
            {match.homeTeam.name}
          </span>
        </div>

        {/* Live score OR VS */}
        <div className="flex flex-col items-center shrink-0">
          {(isLive || isFinished) ? (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-xl ${
              isLive ? "bg-red-500/10 text-white" : "bg-white/5 text-white/70"
            }`}>
              <span>{match.liveScore.home ?? match.finalScore.home ?? "?"}</span>
              <span className="text-white/30 text-base">-</span>
              <span>{match.liveScore.away ?? match.finalScore.away ?? "?"}</span>
            </div>
          ) : (
            <span className="text-white/20 font-bold text-sm">VS</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex items-center gap-2 justify-end text-right">
          <span className="text-sm font-bold text-white leading-tight line-clamp-2 flex-1 text-right">
            {match.awayTeam.name}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={match.awayTeam.logo}
            alt={match.awayTeam.name}
            className="w-8 h-8 object-contain"
          />
        </div>
      </div>

      {/* Prediction inputs or locked state */}
      {locked ? (
        <div className="flex flex-col items-center justify-center gap-2 py-2 border-t border-white/5">
          {existing ? (
            <div className="space-y-2 w-full flex flex-col items-center">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Tus pronósticos:</span>
              <div className="flex gap-2.5 flex-wrap justify-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 ${
                  existing.pointsEarned1 !== undefined && existing.pointsEarned1 !== null ? pointsColor(existing.pointsEarned1) : ""
                }`}>
                  <span className="text-xs text-violet-400 font-bold">1:</span>
                  <span className="font-black text-white">{existing.predictedHome}</span>
                  <span className="text-white/30">-</span>
                  <span className="font-black text-white">{existing.predictedAway}</span>
                  {existing.pointsEarned1 !== undefined && existing.pointsEarned1 !== null && (
                    <span className="text-[10px] font-black">({existing.pointsEarned1} pts)</span>
                  )}
                </div>
                {existing.predictedHome2 !== null && existing.predictedHome2 !== undefined && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 ${
                    existing.pointsEarned2 !== undefined && existing.pointsEarned2 !== null ? pointsColor(existing.pointsEarned2) : ""
                  }`}>
                    <span className="text-xs text-cyan-400 font-bold">2:</span>
                    <span className="font-black text-white">{existing.predictedHome2}</span>
                    <span className="text-white/30">-</span>
                    <span className="font-black text-white">{existing.predictedAway2}</span>
                    {existing.pointsEarned2 !== undefined && existing.pointsEarned2 !== null && (
                      <span className="text-[10px] font-black">({existing.pointsEarned2} pts)</span>
                    )}
                  </div>
                )}
              </div>
              {existing.pointsEarned === null && (
                <span className="text-[10px] text-white/30 italic mt-1">Por evaluar</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-white/30 italic flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Sin pronóstico registrado
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-3 pt-2 border-t border-white/5">
          {/* Prediction 1 */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
            <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Pronóstico Principal</div>
            <div className="flex items-center justify-between gap-4">
              <ScoreInput value={home1} onChange={setHome1} label="Local" />
              <div className="text-white/20 font-bold text-sm">-</div>
              <ScoreInput value={away1} onChange={setAway1} label="Visita" />
            </div>
          </div>

          {/* Prediction 2 Toggle / Form */}
          {hasOption2 ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2 relative animate-fade-down">
              <div className="flex justify-between items-center">
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Pronóstico Secundario (Doble Op.)</div>
                <button
                  onClick={() => setHasOption2(false)}
                  className="text-[10px] text-red-400 font-semibold hover:underline"
                >
                  Quitar
                </button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <ScoreInput value={home2} onChange={setHome2} label="Local" />
                <div className="text-white/20 font-bold text-sm">-</div>
                <ScoreInput value={away2} onChange={setAway2} label="Visita" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setHasOption2(true);
                setHome2(home1);
                setAway2(away1);
              }}
              className="w-full py-2 border border-dashed border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/5 rounded-xl text-xs text-white/40 hover:text-cyan-400 font-semibold transition-all"
            >
              + Agregar Segundo Pronóstico
            </button>
          )}
        </div>
      )}

      {/* Save button (only if not locked and has changes) */}
      {!locked && (
        <button
          onClick={() => onSave(match.id, home1, away1, hasOption2 ? home2 : null, hasOption2 ? away2 : null)}
          disabled={isSaving}
          id={`btn-save-prediction-${match.id}`}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2
            ${hasChanged
              ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 active:scale-95 glow-primary"
              : "bg-white/5 border border-white/10 text-white/30 cursor-default"
            }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {existing && !hasChanged ? "Guardado ✓" : "Guardar pronóstico"}
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Tournament Page ──────────────────────────────────────────────────────────
export default function TournamentPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const { user } = useAuth();

  const { matches, loading: matchesLoading } = useLiveMatches(tournamentId);
  const { predictions, loading: predLoading, saving, savePrediction } = usePredictions(
    user?.uid ?? null
  );

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

    await savePrediction(matchId, home1, away1, home2, away2, {
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      kickoffTime: match.kickoffTime as Timestamp,
    });
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
            tournamentId={tournamentId}
            predictions={predictions}
            saving={saving}
            onSave={handleSave}
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
