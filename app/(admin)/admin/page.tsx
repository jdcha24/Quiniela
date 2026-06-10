// app/(admin)/admin/page.tsx — Admin dashboard
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { TournamentDocument } from "@/types/firestore";
import { Plus, BarChart3, Users, Calendar, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";

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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
