// app/(app)/profile/page.tsx
"use client";

import { useState } from "react";
import { doc, updateDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { AvatarBuilder } from "@/components/avatar/AvatarBuilder";
import { AvatarConfig, getAvatarUrlFromConfig, defaultAvatarConfig } from "@/lib/utils/dicebear";
import { LogOut, Edit3, X, ShieldCheck } from "lucide-react";

export default function ProfilePage() {
  const { user, userDoc, signOut } = useAuth();
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!userDoc || !user) return null;

  const avatarConfig: AvatarConfig =
    userDoc.avatarConfig ?? defaultAvatarConfig(userDoc.avatarSeed);

  const avatarUrl = getAvatarUrlFromConfig(avatarConfig, 200);

  const handleSaveAvatar = async (newConfig: AvatarConfig) => {
    setSaving(true);
    const batch = writeBatch(db);

    // Update user doc
    batch.update(doc(db, "users", user.uid), {
      avatarConfig: newConfig,
      avatarStyle: newConfig.style,
      avatarSeed: newConfig.seed,
      updatedAt: serverTimestamp(),
    });

    // Update active tournaments leaderboard entries
    if (userDoc.activeTournamentIds && userDoc.activeTournamentIds.length > 0) {
      userDoc.activeTournamentIds.forEach((tId) => {
        const leaderboardRef = doc(db, "tournaments", tId, "leaderboard", user.uid);
        batch.set(leaderboardRef, {
          avatarConfig: newConfig,
          avatarStyle: newConfig.style,
          avatarSeed: newConfig.seed,
          lastUpdated: serverTimestamp(),
        }, { merge: true });
      });
    }

    await batch.commit();
    setSaving(false);
    setSaved(true);
    setEditingAvatar(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-4 py-6 space-y-6 animate-fade-up">
      <h2 className="text-2xl font-black text-white">Mi Perfil</h2>

      {/* ── Avatar section ──────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Avatar</h3>
          <button
            onClick={() => setEditingAvatar((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              editingAvatar
                ? "bg-white/10 text-white/60 hover:bg-white/15"
                : "bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25"
            }`}
          >
            {editingAvatar ? (
              <><X className="w-3.5 h-3.5" /> Cerrar</>
            ) : (
              <><Edit3 className="w-3.5 h-3.5" /> Editar</>
            )}
          </button>
        </div>

        {!editingAvatar ? (
          /* Compact avatar display */
          <div className="flex items-center gap-4">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-violet-500/40 shadow-xl shadow-violet-500/10 flex-shrink-0"
              style={{
                background: avatarConfig.backgroundColor
                  ? `#${avatarConfig.backgroundColor}`
                  : "#1a1a28",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt="Tu avatar" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-white text-lg">@{userDoc.nickname}</p>
              <p className="text-xs text-white/40">
                Toca <strong className="text-violet-400">Editar</strong> para personalizar tu avatar
              </p>
              {saved && (
                <p className="text-xs text-emerald-400 font-semibold animate-fade-up">
                  ✓ Avatar actualizado
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Full avatar builder */
          <AvatarBuilder
            initialConfig={avatarConfig}
            onSave={handleSaveAvatar}
            saving={saving}
            saved={saved}
          />
        )}
      </div>

      {/* ── Account info ────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Cuenta</h3>
        <div className="space-y-3">
          {[
            { label: "Nickname", value: `@${userDoc.nickname}`, className: "text-white font-bold" },
            { label: "Email", value: userDoc.email, className: "text-white/70 truncate max-w-[180px] text-right" },
            { label: "Torneos activos", value: String(userDoc.activeTournamentIds?.length ?? 0), className: "text-violet-400 font-bold" },
          ].map(({ label, value, className }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-white/50">{label}</span>
              <span className={`text-sm ${className}`}>{value}</span>
            </div>
          ))}

          {/* Role badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">Rol</span>
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
              userDoc.role === "admin"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-white/5 text-white/40 border-white/10"
            }`}>
              {userDoc.role === "admin" && <ShieldCheck className="w-3 h-3" />}
              {userDoc.role === "admin" ? "Administrador" : "Jugador"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sign out ─────────────────────────────────────────────────────── */}
      <button
        id="btn-sign-out"
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
          bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm
          hover:bg-red-500/20 active:scale-95 transition-all"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
