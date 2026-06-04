// app/(app)/tournament/page.tsx — Redirect to dashboard if no tournamentId
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TournamentIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
