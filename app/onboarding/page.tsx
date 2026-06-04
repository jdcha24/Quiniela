// app/onboarding/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, getDocs, collection, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { AvatarBuilder } from "@/components/avatar/AvatarBuilder";
import { AvatarConfig, defaultAvatarConfig, randomAvatarConfig } from "@/lib/utils/dicebear";
import { Loader2, ArrowRight, User } from "lucide-react";

type Step = "nickname" | "avatar";

export default function OnboardingPage() {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("nickname");
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [checkingNick, setCheckingNick] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // If already onboarded, redirect
  useEffect(() => {
    if (userDoc?.onboardingComplete) router.replace("/dashboard");
  }, [userDoc, router]);

  // If no user, redirect to login
  useEffect(() => {
    if (!loading && user === null) router.replace("/");
  }, [user, loading, router]);

  // Initialize avatar config with a random one based on display name
  useEffect(() => {
    if (user && !avatarConfig) {
      const seed = user.displayName || user.uid.slice(0, 8);
      setAvatarConfig(randomAvatarConfig(seed));
    }
  }, [user, avatarConfig]);

  // ── Nickname validation ───────────────────────────────────────────────────
  const validateNickname = (value: string) => {
    if (value.length < 3) return "Mínimo 3 caracteres";
    if (value.length > 20) return "Máximo 20 caracteres";
    if (!/^[a-zA-Z0-9_\-]+$/.test(value)) return "Solo letras, números, _ y -";
    return "";
  };

  const checkNicknameAvailable = async (nick: string): Promise<boolean> => {
    const q = query(collection(db, "users"), where("nickname", "==", nick.toLowerCase()));
    const snap = await getDocs(q);
    return snap.empty;
  };

  const handleNicknameNext = async () => {
    const trimmed = nickname.trim();
    const error = validateNickname(trimmed);
    if (error) { setNicknameError(error); return; }

    setCheckingNick(true);
    const available = await checkNicknameAvailable(trimmed);
    setCheckingNick(false);

    if (!available) {
      setNicknameError("Ese nickname ya está en uso, elige otro");
      return;
    }

    setNicknameError("");
    // Update avatar seed to use the nickname
    setAvatarConfig((prev) =>
      prev ? { ...prev, seed: trimmed.toLowerCase() } : randomAvatarConfig(trimmed.toLowerCase())
    );
    setStep("avatar");
  };

  // ── Save to Firestore ─────────────────────────────────────────────────────
  const handleSave = async (finalConfig: AvatarConfig) => {
    if (!user) return;
    setSaving(true);

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      nickname: nickname.trim().toLowerCase(),
      avatarSeed: nickname.trim().toLowerCase(),
      avatarStyle: "adventurer",
      avatarConfig: finalConfig,
      role: "user",
      onboardingComplete: true,
      activeTournamentIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    router.replace("/dashboard");
  };

  if (!user || !avatarConfig) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh max-w-lg mx-auto">
      <div className="px-4 py-8 space-y-6 animate-fade-up">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/30">
            <User className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mt-3">
            {step === "nickname" ? "Elige tu nombre" : "Crea tu avatar"}
          </h1>
          <p className="text-sm text-white/40">
            {step === "nickname"
              ? "Tu nombre de jugador único en la quiniela"
              : "Personaliza cada detalle de tu personaje"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center">
          {(["nickname", "avatar"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                step === s
                  ? "bg-violet-600 text-white"
                  : step === "avatar" && s === "nickname"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-white/10 text-white/30"
              }`}>
                {step === "avatar" && s === "nickname" ? "✓" : i + 1}
              </div>
              {i === 0 && <div className="w-8 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Nickname ──────────────────────────────────────────── */}
        {step === "nickname" && (
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80">
                Nickname
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 font-bold">@</span>
                <input
                  id="input-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setNicknameError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleNicknameNext()}
                  placeholder="tunombre"
                  maxLength={20}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  className={`w-full pl-8 pr-4 py-3.5 rounded-xl bg-white/5 border text-white font-bold
                    text-base placeholder-white/20 focus:outline-none transition-colors
                    ${nicknameError ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-violet-500/60"}`}
                />
              </div>
              {nicknameError && (
                <p className="text-xs text-red-400 font-medium">{nicknameError}</p>
              )}
              <p className="text-xs text-white/25">
                Solo letras, números, _ y - · {nickname.length}/20
              </p>
            </div>

            <button
              id="btn-nickname-next"
              onClick={handleNicknameNext}
              disabled={nickname.trim().length < 3 || checkingNick}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base
                bg-gradient-to-r from-violet-600 to-purple-600 text-white
                hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all
                disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
            >
              {checkingNick ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</>
              ) : (
                <>Siguiente <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        )}

        {/* ── Step 2: Avatar Builder ────────────────────────────────────── */}
        {step === "avatar" && (
          <div className="glass-card rounded-2xl p-5">
            <AvatarBuilder
              initialConfig={avatarConfig}
              onSave={handleSave}
              saving={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
}
