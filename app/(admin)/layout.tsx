// app/(admin)/layout.tsx — Admin-only layout
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { ShieldCheck } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace("/");
      else if (userDoc && userDoc.role !== "admin") router.replace("/dashboard");
    }
  }, [user, userDoc, loading, router]);

  if (loading || !user || !userDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (userDoc.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-mesh max-w-lg mx-auto">
      {/* Admin header */}
      <header className="sticky top-0 z-40 px-4 py-3 glass-card border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <h1 className="text-lg font-black text-amber-400">Panel Admin</h1>
          <span className="text-xs text-white/30 ml-auto">Quiniela</span>
        </div>
      </header>
      <main className="pb-10">{children}</main>
    </div>
  );
}
