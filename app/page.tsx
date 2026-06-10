// app/page.tsx — Landing / Login page
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

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
    <main className="min-h-screen bg-mesh flex flex-col items-center justify-center px-5 py-10 overflow-hidden relative">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-900/10 blur-3xl" />
      </div>

      <div className="w-full max-w-xs flex flex-col items-center gap-12 z-10 text-center animate-fade-up">
        {/* Logo / Icon */}
        <div className="relative w-40 h-40 select-none animate-splash-logo-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Quiniela Logo"
            className="w-full h-full object-contain filter invert drop-shadow-[0_0_20px_rgba(124,58,237,0.4)]"
            draggable={false}
          />
        </div>

        {/* CTA Section */}
        <div className="w-full">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-4 px-6
              rounded-2xl font-bold text-white text-base
              bg-gradient-to-r from-violet-600 to-purple-600
              hover:from-violet-500 hover:to-purple-500
              active:scale-95 transition-all duration-200 glow-primary cursor-pointer"
            id="btn-google-login"
          >
            {/* Google icon */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar con Google
          </button>
        </div>
      </div>
    </main>
  );
}
