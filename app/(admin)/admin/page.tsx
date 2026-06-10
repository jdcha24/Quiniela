// app/(admin)/admin/page.tsx — Admin dashboard
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, setDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { TournamentDocument, UserDocument } from "@/types/firestore";
import { Plus, BarChart3, Users, Calendar, CheckCircle, RefreshCw, Loader2, X } from "lucide-react";
import Link from "next/link";
import { getAvatarUrlFromConfig } from "@/lib/utils/dicebear";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<TournamentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced?: number; finished?: number } | null>(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentDocument)));
    setLoading(false);
  };

  const triggerSync = async () => {
    if (!user) return;
    setSyncing(true);
    const token = await user.getIdToken();
    try {
      const res = await fetch("/api/cron/sync-scores", {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? "quiniela_cron_secret_changeme_2024"}` },
      });
      const data = await res.json();
      setSyncResult(data);
    } catch {}
    setSyncing(false);
  };

  const updateStatus = async (id: string, status: TournamentDocument["status"]) => {
    await updateDoc(doc(db, "tournaments", id), { status });
    fetchTournaments();
  };

  const [selectedTournament, setSelectedTournament] = useState<TournamentDocument | null>(null);
  const [systemUsers, setSystemUsers] = useState<UserDocument[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  const openParticipantsModal = async (tournament: TournamentDocument) => {
    setSelectedTournament(tournament);
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map(d => d.data() as UserDocument);
      // Sort alphabetically by nickname
      list.sort((a, b) => (a.nickname || "").localeCompare(b.nickname || ""));
      setSystemUsers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleParticipant = async (userToToggle: UserDocument) => {
    if (!selectedTournament) return;
    const tournamentId = selectedTournament.id;
    const isCurrentlyParticipant = userToToggle.activeTournamentIds?.includes(tournamentId) ?? false;
    
    setTogglingUser(userToToggle.uid);
    try {
      const userRef = doc(db, "users", userToToggle.uid);
      const leaderboardRef = doc(db, "tournaments", tournamentId, "leaderboard", userToToggle.uid);
      const tournamentRef = doc(db, "tournaments", tournamentId);

      if (isCurrentlyParticipant) {
        // Remove from tournament
        await updateDoc(userRef, {
          activeTournamentIds: arrayRemove(tournamentId)
        });
        await deleteDoc(leaderboardRef);
        await updateDoc(tournamentRef, {
          participantCount: Math.max(0, (selectedTournament.participantCount || 1) - 1)
        });

        setSystemUsers(prev => prev.map(u => {
          if (u.uid === userToToggle.uid) {
            return {
              ...u,
              activeTournamentIds: (u.activeTournamentIds || []).filter(id => id !== tournamentId)
            };
          }
          return u;
        }));
        setSelectedTournament(prev => prev ? {
          ...prev,
          participantCount: Math.max(0, (prev.participantCount || 1) - 1)
        } : null);
      } else {
        // Add to tournament
        await updateDoc(userRef, {
          activeTournamentIds: arrayUnion(tournamentId)
        });
        await setDoc(leaderboardRef, {
          userId: userToToggle.uid,
          nickname: userToToggle.nickname || "Jugador",
          avatarSeed: userToToggle.avatarSeed || "",
          avatarStyle: userToToggle.avatarStyle || "bottts",
          avatarConfig: userToToggle.avatarConfig || null,
          totalPoints: 0,
          exactScores: 0,
          correctResults: 0,
          predictions: 0,
          rank: 999,
          lastUpdated: serverTimestamp(),
          projectedPoints: 0,
          projectedRank: 999,
        });
        await updateDoc(tournamentRef, {
          participantCount: (selectedTournament.participantCount || 0) + 1
        });

        setSystemUsers(prev => prev.map(u => {
          if (u.uid === userToToggle.uid) {
            return {
              ...u,
              activeTournamentIds: [...(u.activeTournamentIds || []), tournamentId]
            };
          }
          return u;
        }));
        setSelectedTournament(prev => prev ? {
          ...prev,
          participantCount: (prev.participantCount || 0) + 1
        } : null);
      }
      
      fetchTournaments();
    } catch (err) {
      console.error("Error toggling participant:", err);
    } finally {
      setTogglingUser(null);
    }
  };

  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  const runMigration = async () => {
    setMigrating(true);
    setMigrationResult(null);
    try {
      // 1. Migrate Matches (adding tournamentIds array containing tournamentId)
      const matchesSnap = await getDocs(collection(db, "matches"));
      let updatedMatches = 0;
      for (const matchDoc of matchesSnap.docs) {
        const data = matchDoc.data();
        if (!data.tournamentIds && data.tournamentId) {
          await updateDoc(matchDoc.ref, {
            tournamentIds: [data.tournamentId]
          });
          updatedMatches++;
        }
      }

      // 2. Migrate Predictions (adding user metadata snapshots)
      const predictionsSnap = await getDocs(collection(db, "predictions"));
      const usersSnap = await getDocs(collection(db, "users"));
      const usersMap = new Map();
      usersSnap.docs.forEach((u) => usersMap.set(u.id, u.data()));

      let updatedPredictions = 0;
      for (const predDoc of predictionsSnap.docs) {
        const data = predDoc.data();
        if (!data.userNickname && data.userId) {
          const userProfile = usersMap.get(data.userId);
          if (userProfile) {
            await updateDoc(predDoc.ref, {
              userNickname: userProfile.nickname || "Jugador",
              userAvatarSeed: userProfile.avatarSeed || "",
              userAvatarStyle: userProfile.avatarStyle || "bottts",
              userAvatarConfig: userProfile.avatarConfig || null
            });
            updatedPredictions++;
          }
        }
      }

      setMigrationResult(`Migración completada: ${updatedMatches} partidos y ${updatedPredictions} pronósticos actualizados.`);
    } catch (err) {
      console.error(err);
      setMigrationResult("Error al ejecutar la migración.");
    } finally {
      setMigrating(false);
    }
  };

  const statusColor = {
    draft: "text-white/40 bg-white/5 border-white/10",
    open: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    in_progress: "text-red-400 bg-red-500/10 border-red-500/30",
    finished: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  };

  return (
    <div className="px-4 py-5 space-y-5 animate-fade-up">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Torneos", value: tournaments.length, icon: BarChart3, color: "text-violet-400" },
          { label: "Activos", value: tournaments.filter((t) => t.status === "in_progress").length, icon: Calendar, color: "text-red-400" },
          { label: "Abiertos", value: tournaments.filter((t) => t.status === "open").length, icon: CheckCircle, color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card rounded-2xl p-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <div className={`text-xl font-black ${color}`}>{value}</div>
            <div className="text-[10px] text-white/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Link
            href="/admin/tournaments/new"
            id="btn-new-tournament"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo torneo
          </Link>

          <button
            onClick={triggerSync}
            disabled={syncing}
            id="btn-manual-sync"
            className="flex items-center gap-2 px-4 py-3 rounded-xl
              bg-white/5 border border-white/10 text-white/70 text-sm font-semibold
              hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync
          </button>
        </div>

        <button
          onClick={runMigration}
          disabled={migrating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
            bg-violet-600/20 border border-violet-500/30 text-violet-400 text-xs font-bold
            hover:bg-violet-600/30 active:scale-95 transition-all disabled:opacity-50 animate-fade-in"
        >
          {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Migrar Datos (Partidos y Pronósticos)
        </button>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400">
          ✓ Sync: {syncResult.synced ?? 0} partidos actualizados, {syncResult.finished ?? 0} finalizados
        </div>
      )}

      {/* Migration result */}
      {migrationResult && (
        <div className="px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-400 animate-fade-in">
          {migrationResult}
        </div>
      )}

      {/* Tournament list */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Todos los torneos</h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-white/30 text-sm">Crea tu primer torneo 👆</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tournaments.map((t) => (
              <div key={t.id} className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white truncate">{t.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                      <span>{t.matchIds.length} partidos</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {t.participantCount}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border shrink-0 ${statusColor[t.status]}`}>
                    {t.status === "draft" ? "Borrador" :
                     t.status === "open" ? "Abierto" :
                     t.status === "in_progress" ? "En curso" : "Finalizado"}
                  </span>
                </div>

                {/* Status controls */}
                <div className="flex gap-1.5 flex-wrap">
                  {(["open", "in_progress", "finished"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(t.id, s)}
                      disabled={t.status === s}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        t.status === s
                          ? "bg-white/10 text-white/50 cursor-default"
                          : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white active:scale-95"
                      }`}
                    >
                      → {s === "open" ? "Abrir" : s === "in_progress" ? "Iniciar" : "Finalizar"}
                    </button>
                  ))}
                  <Link
                    href={`/tournament/${t.id}`}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
                  >
                    Ver →
                  </Link>
                  <Link
                    href={`/admin/tournaments/new?tournamentId=${t.id}`}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
                  >
                    + Partidos
                  </Link>
                  <button
                    onClick={() => openParticipantsModal(t)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all active:scale-95"
                  >
                    Participantes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage Participants Modal */}
      {selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card w-full max-w-md rounded-3xl p-6 space-y-4 border border-white/10 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setSelectedTournament(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Asignar Participantes
              </h3>
              <p className="text-xs text-white/40 font-medium truncate">
                Torneo: {selectedTournament.name}
              </p>
            </div>

            <div className="border-t border-white/5 pt-3 max-h-[50vh] overflow-y-auto pr-1 space-y-2">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs text-white/40">Cargando usuarios...</span>
                </div>
              ) : systemUsers.length === 0 ? (
                <p className="text-center text-xs text-white/30 italic py-4">No hay usuarios registrados</p>
              ) : (
                systemUsers.map((item) => {
                  const isParticipant = item.activeTournamentIds?.includes(selectedTournament.id) ?? false;
                  const isToggling = togglingUser === item.uid;

                  return (
                    <div
                      key={item.uid}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.avatarConfig ? getAvatarUrlFromConfig(item.avatarConfig, 36) : `https://api.dicebear.com/9.x/${item.avatarStyle}/svg?seed=${item.avatarSeed}&size=36`}
                          alt={item.nickname || "Usuario"}
                          className="w-9 h-9 rounded-xl border border-white/10 bg-surface-2 shrink-0"
                          style={{
                            background: item.avatarConfig?.backgroundColor
                              ? `#${item.avatarConfig.backgroundColor}`
                              : "#1a1a28",
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{item.nickname || "Sin nickname"}</div>
                          <div className="text-[10px] text-white/40 truncate">{item.email}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleParticipant(item)}
                        disabled={isToggling}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 ${
                          isParticipant
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isParticipant ? (
                          <>Asignado ✓</>
                        ) : (
                          <>Asignar</>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/5 pt-3 flex justify-end">
              <button
                onClick={() => setSelectedTournament(null)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold hover:bg-white/10 transition-all active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
