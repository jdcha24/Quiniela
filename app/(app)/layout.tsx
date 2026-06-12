// app/(app)/layout.tsx — Protected app layout with bottom nav
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { LayoutDashboard, Target, Trophy, User, ShieldCheck, RefreshCw } from "lucide-react";
import { getAvatarUrlFromConfig, defaultAvatarConfig } from "@/lib/utils/dicebear";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, id: "nav-dashboard" },
  { href: "/tournament", label: "Partidos", icon: Target, id: "nav-tournament" },
  { href: "/leaderboard", label: "Tabla", icon: Trophy, id: "nav-leaderboard" },
  { href: "/profile", label: "Perfil", icon: User, id: "nav-profile" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/cron/sync-scores", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Sincronización exitosa:\n• Partidos actualizados: ${data.synced}\n• Evaluados en vivo: ${data.evaluated}`);
      } else {
        alert(`Error al sincronizar: ${data.error || 'Desconocido'}`);
      }
    } catch (err) {
      alert(`Error al sincronizar: ${err instanceof Error ? err.message : 'Error de red'}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/");
      } else if (userDoc && !userDoc.onboardingComplete) {
        router.replace("/onboarding");
      }
    }
  }, [user, userDoc, loading, router]);

  if (loading || !user || !userDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh flex flex-col max-w-md mx-auto relative">
      {/* Top header */}
      <header className="sticky top-0 z-40 px-4 py-3 glass-card border-b border-white/5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            QUINIELA ⚽
          </h1>
          <div className="flex items-center gap-2">
            {userDoc.role === "admin" && (
              <>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-bold transition-all disabled:opacity-50 hover:bg-violet-500/20 active:scale-95 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  Sync
                </button>
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              </>
            )}
            <Link href="/profile" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAvatarUrlFromConfig(userDoc.avatarConfig ?? defaultAvatarConfig(userDoc.avatarSeed), 40)}
                alt={userDoc.nickname}
                className="w-9 h-9 rounded-xl border border-violet-500/30 bg-surface-2"
                style={{
                  background: (userDoc.avatarConfig ?? defaultAvatarConfig(userDoc.avatarSeed)).backgroundColor
                    ? `#${(userDoc.avatarConfig ?? defaultAvatarConfig(userDoc.avatarSeed)).backgroundColor}`
                    : "#1a1a28",
                }}
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 glass-card border-t border-white/5 bottom-nav-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon, id }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                id={id}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                  active
                    ? "text-violet-400 bg-violet-500/10"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${active ? "scale-110" : ""}`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className="text-[10px] font-semibold">{label}</span>
                {active && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-violet-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
