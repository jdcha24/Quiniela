// app/page.tsx — Landing / Login page
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Trophy, Zap, Users, Star } from "lucide-react";
import Image from "next/image";

export default function LandingPage() {
  const { user, userDoc, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (!userDoc?.onboardingComplete) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, userDoc, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-mesh flex flex-col items-center justify-between px-5 py-10 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-900/10 blur-3xl" />
      </div>

      {/* Hero Section */}
      <div className="relative w-full max-w-md flex flex-col items-center gap-6 animate-fade-up">
        {/* Logo / Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center glow-primary">
            <Trophy className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-neon-green animate-bounce flex items-center justify-center">
            <Zap className="w-3 h-3 text-black fill-black" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              QUINIELA
            </span>
          </h1>
          <p className="text-white/50 text-sm font-medium tracking-widest uppercase">
            ⚽ Predice · Compite · Gana
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { icon: Zap, label: "Tiempo real", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
            { icon: Users, label: "Tabla general", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
            { icon: Star, label: "Gamificación", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
          ].map(({ icon: Icon, label, color }) => (
            <span
              key={label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${color}`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Score mockup card */}
      <div
        className="relative w-full max-w-md animate-fade-up"
        style={{ animationDelay: "0.15s" }}
      >
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-live-pulse" />
            <span className="text-xs font-bold text-red-400 tracking-wider uppercase">
              En vivo
            </span>
            <span className="text-xs text-white/40 ml-auto">72&apos;</span>
          </div>

          {/* Mock match */}
          {[
            {
              home: "México", away: "Argentina",
              scoreH: 1, scoreA: 2,
              predH: 1, predA: 1,
              pts: 1,
            },
            {
              home: "España", away: "Brasil",
              scoreH: 2, scoreA: 2,
              predH: 2, predA: 2,
              pts: 3,
            },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="flex-1 text-right text-sm font-semibold text-white/90">{m.home}</div>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 min-w-[72px] justify-center">
                <span className="text-lg font-black text-white">{m.scoreH}</span>
                <span className="text-white/30 text-sm">-</span>
                <span className="text-lg font-black text-white">{m.scoreA}</span>
              </div>
              <div className="flex-1 text-left text-sm font-semibold text-white/90">{m.away}</div>
              <div className={`stat-badge ${m.pts === 3 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                +{m.pts}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-white/40">Tu posición actual</span>
            <div className="flex items-center gap-1.5">
              <span className="rank-gold text-lg font-black">#2</span>
              <span className="text-xs text-white/50">de 48</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div
        className="relative w-full max-w-md space-y-4 animate-fade-up"
        style={{ animationDelay: "0.3s" }}
      >
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-4 px-6
            rounded-2xl font-bold text-white text-base
            bg-gradient-to-r from-violet-600 to-purple-600
            hover:from-violet-500 hover:to-purple-500
            active:scale-95 transition-all duration-200 glow-primary"
          id="btn-google-login"
        >
          {/* Google icon */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Entrar con Google
        </button>

        <p className="text-center text-xs text-white/30">
          Al ingresar, aceptas los términos de uso. Acceso gratuito.
        </p>
      </div>
    </main>
  );
}
