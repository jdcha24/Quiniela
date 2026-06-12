// components/MatchCard.tsx
"use client";

import { useState, useEffect } from "react";
import { Lock, Loader2, Check, Minus, Plus, Radio, Clock, ChevronDown, ChevronUp, Users } from "lucide-react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { MatchDocument, LeaderboardEntry, PredictionDocument } from "@/types/firestore";
import { isMatchLocked, formatKickoff } from "@/lib/utils/dates";
import { getAvatarUrlFromConfig } from "@/lib/utils/dicebear";
import { useAuth } from "@/lib/hooks/useAuth";

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

// ─── Match Card Component ─────────────────────────────────────────────────────
export function MatchCard({
  match,
  userId,
  predictions,
  saving,
  onSave,
  participants,
  tournamentNames,
}: {
  match: MatchDocument;
  userId: string;
  predictions: Map<string, PredictionDocument>;
  saving: string | null;
  onSave: (
    matchId: string,
    home1: number,
    away1: number,
    home2: number | null,
    away2: number | null
  ) => void;
  participants?: LeaderboardEntry[];
  tournamentNames?: string[]; // Optional names of tournaments this match belongs to
}) {
  const { userDoc } = useAuth();
  const isAdmin = userDoc?.role === "admin";

  const [showAdminAudit, setShowAdminAudit] = useState(false);
  const [auditPredictions, setAuditPredictions] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [copiedAudit, setCopiedAudit] = useState(false);

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

  const [showGroupPreds, setShowGroupPreds] = useState(false);
  const [groupPredictions, setGroupPredictions] = useState<any[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(false);

  useEffect(() => {
    if (!showGroupPreds || !locked) return;
    
    const fetchGroupPredictions = async () => {
      setLoadingGroup(true);
      try {
        const q = query(
          collection(db, "predictions"),
          where("matchId", "==", match.id)
        );
        const snap = await getDocs(q);
        const preds = snap.docs.map(d => d.data());
        
        let list = preds;
        if (participants && participants.length > 0) {
          const participantIds = new Set(participants.map(p => p.userId));
          list = preds.filter(p => participantIds.has(p.userId));
        }
        
        list.sort((a, b) => {
          const pointsA = a.pointsEarned ?? -1;
          const pointsB = b.pointsEarned ?? -1;
          if (pointsB !== pointsA) return pointsB - pointsA;
          
          const nameA = a.userNickname || "";
          const nameB = b.userNickname || "";
          return nameA.localeCompare(nameB);
        });

        setGroupPredictions(list);
      } catch (err) {
        console.error("Error fetching group predictions:", err);
      } finally {
        setLoadingGroup(false);
      }
    };
    
    fetchGroupPredictions();
  }, [showGroupPreds, locked, match.id, participants]);

  // Load predictions for administrator audit view
  useEffect(() => {
    if (!showAdminAudit || !isAdmin) return;

    const fetchAuditPredictions = async () => {
      setLoadingAudit(true);
      try {
        const q = query(
          collection(db, "predictions"),
          where("matchId", "==", match.id)
        );
        const snap = await getDocs(q);
        const preds = snap.docs.map(d => d.data());
        setAuditPredictions(preds);
      } catch (err) {
        console.error("Error fetching audit predictions:", err);
      } finally {
        setLoadingAudit(false);
      }
    };

    fetchAuditPredictions();
  }, [showAdminAudit, match.id, isAdmin]);

  const getAuditLists = () => {
    if (!participants || participants.length === 0) return { ready: [], pending: [] };
    const predictorIds = new Set(auditPredictions.map(p => p.userId));

    const ready = participants.filter(p => predictorIds.has(p.userId));
    const pending = participants.filter(p => !predictorIds.has(p.userId));

    return { ready, pending };
  };

  const { ready: auditReady, pending: auditPending } = getAuditLists();

  const copyReminder = () => {
    if (auditPending.length === 0) return;

    const namesList = auditPending.map(p => `@${p.nickname || "Jugador"}`).join(", ");
    const text = `⚠️ *Recordatorio Quiniela* ⚽\n\nFaltan por pronosticar para el partido *${match.homeTeam.name} vs ${match.awayTeam.name}*:\n👉 ${namesList}\n\n¡Tienen hasta antes del inicio para registrar su marcador! ⏳`;

    navigator.clipboard.writeText(text);
    setCopiedAudit(true);
    setTimeout(() => setCopiedAudit(false), 2000);
  };

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
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={match.leagueLogo}
              alt={match.leagueName}
              className="w-4 h-4 object-contain opacity-70"
            />
            <span className="text-xs text-white/40 font-medium truncate">{match.leagueName}</span>
          </div>
          {/* Tournament badges */}
          {tournamentNames && tournamentNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {tournamentNames.map((name) => (
                <span
                  key={name}
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 font-semibold"
                >
                  🏆 {name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isLive && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-live-pulse" />
              <Radio className="w-3 h-3 text-red-400" />
              <span className="text-xs font-bold text-red-400">
                {match.liveScore.elapsed ?? "HT"}&apos;
              </span>
            </div>
          )}
          {((isFinished || isLive) && existing?.pointsEarned !== null && existing?.pointsEarned !== undefined) && (
            <div className={`px-2.5 py-1 rounded-full text-xs font-black border ${pointsColor(existing.pointsEarned)}`}>
              {isLive ? "En vivo: " : ""}+{existing.pointsEarned} pts
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

      {/* Admin Audit Panel */}
      {isAdmin && (
        <div className="border-t border-white/5 pt-3 mt-1">
          <button
            onClick={() => setShowAdminAudit(!showAdminAudit)}
            className="w-full flex items-center justify-between text-xs text-amber-400 hover:text-amber-300 font-bold py-1 transition-all"
          >
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {showAdminAudit ? "Ocultar panel de auditoría" : "Auditar pronósticos del grupo"}
            </span>
            {participants && (
              <span className="text-[10px] bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 text-amber-300 font-semibold">
                {participants.length} jug.
              </span>
            )}
          </button>

          {showAdminAudit && (
            <div className="mt-3 space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 animate-fade-down">
              {loadingAudit ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40 font-medium">
                      Progreso: <strong className="text-white">{auditReady.length} / {participants?.length || 0}</strong>
                    </span>
                    {auditPending.length > 0 && (
                      <button
                        onClick={copyReminder}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1
                          bg-amber-500 text-black hover:bg-amber-400"
                      >
                        {copiedAudit ? "¡Copiado! ✓" : "Copiar recordatorio 📋"}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        Pendientes ({auditPending.length})
                      </div>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {auditPending.length === 0 ? (
                          <p className="text-[10px] text-emerald-400 italic">¡Todos listos! 🎉</p>
                        ) : (
                          auditPending.map(p => (
                            <div key={p.userId} className="flex items-center gap-1.5 py-0.5 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                              <span className="text-white/70 font-medium truncate">{p.nickname || "Jugador"}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        Listos ({auditReady.length})
                      </div>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {auditReady.length === 0 ? (
                          <p className="text-[10px] text-white/30 italic">Ninguno listo aún</p>
                        ) : (
                          auditReady.map(p => (
                            <div key={p.userId} className="flex items-center gap-1.5 py-0.5 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-white/70 font-medium truncate">{p.nickname || "Jugador"}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Group predictions transparent panel (only when locked/started) */}
      {locked && (
        <div className="border-t border-white/5 pt-3 mt-1">
          <button
            onClick={() => setShowGroupPreds(!showGroupPreds)}
            className="w-full flex items-center justify-between text-xs text-violet-400 hover:text-violet-300 font-bold py-1 transition-all"
          >
            <span className="flex items-center gap-1">
              {showGroupPreds ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showGroupPreds ? "Ocultar pronósticos del grupo" : "Ver pronósticos del grupo"}
            </span>
            {participants && (
              <span className="text-[10px] bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 text-violet-300 font-semibold">
                {participants.length} jug.
              </span>
            )}
          </button>
          
          {showGroupPreds && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1 animate-fade-down">
              {loadingGroup ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                </div>
              ) : groupPredictions.length === 0 && (!participants || participants.length === 0) ? (
                <p className="text-center text-xs text-white/30 italic py-2">No hay pronósticos registrados</p>
              ) : (
                <div className="space-y-1.5">
                  {/* Predictions */}
                  {groupPredictions.map((pred) => {
                    const participant = participants?.find(p => p.userId === pred.userId);
                    const nickname = pred.userNickname || participant?.nickname || "Jugador";
                    const avatarSeed = pred.userAvatarSeed || participant?.avatarSeed || "";
                    const avatarStyle = pred.userAvatarStyle || participant?.avatarStyle || "bottts";
                    const avatarConfig = pred.userAvatarConfig || participant?.avatarConfig;
                    const isSelf = pred.userId === userId;
                    
                    return (
                      <div
                        key={pred.userId}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                          isSelf ? "bg-violet-500/10 border border-violet-500/20" : "bg-white/[0.02] border border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatarConfig ? getAvatarUrlFromConfig(avatarConfig, 28) : `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${avatarSeed}&size=28`}
                            alt={nickname}
                            className="w-7 h-7 rounded-lg border border-white/10 bg-surface-2 shrink-0"
                            style={{
                              background: avatarConfig?.backgroundColor
                                ? `#${avatarConfig.backgroundColor}`
                                : "#1a1a28",
                            }}
                          />
                          <span className={`font-bold truncate ${isSelf ? "text-violet-300" : "text-white/80"}`}>
                            {nickname} {isSelf && "(tú)"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Predictions display */}
                          <div className="flex gap-1.5">
                            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg font-black text-white/90">
                              {pred.predictedHome} - {pred.predictedAway}
                            </span>
                            {pred.predictedHome2 !== null && pred.predictedHome2 !== undefined && (
                              <span className="bg-cyan-500/5 border border-cyan-500/10 px-2 py-0.5 rounded-lg font-black text-cyan-300">
                                {pred.predictedHome2} - {pred.predictedAway2}
                              </span>
                            )}
                          </div>
                          {/* Points */}
                          {pred.pointsEarned !== null && pred.pointsEarned !== undefined && (
                            <span className={`font-black px-1.5 py-0.5 rounded text-[10px] ${
                              pred.pointsEarned === 3 ? "text-emerald-400 bg-emerald-500/10" :
                              pred.pointsEarned === 1 ? "text-amber-400 bg-amber-500/10" : "text-red-400 bg-red-500/10"
                            }`}>
                              +{pred.pointsEarned} pts
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Non-predictors */}
                  {participants && participants.filter(p => !groupPredictions.some(pred => pred.userId === p.userId)).map((p) => {
                    const isSelf = p.userId === userId;
                    return (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between p-2 rounded-xl text-xs opacity-50 bg-white/[0.01] border border-dashed border-white/5"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.avatarConfig ? getAvatarUrlFromConfig(p.avatarConfig, 28) : `https://api.dicebear.com/9.x/${p.avatarStyle}/svg?seed=${p.avatarSeed}&size=28`}
                            alt={p.nickname}
                            className="w-7 h-7 rounded-lg border border-white/10 bg-surface-2 shrink-0"
                            style={{
                              background: p.avatarConfig?.backgroundColor
                                ? `#${p.avatarConfig.backgroundColor}`
                                : "#1a1a28",
                            }}
                          />
                          <span className={`font-bold truncate ${isSelf ? "text-violet-300" : "text-white/60"}`}>
                            {p.nickname} {isSelf && "(tú)"}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/30 italic">Sin pronóstico</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
