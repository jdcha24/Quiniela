// app/(app)/tournament/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLiveMatches } from "@/lib/hooks/useLiveMatches";
import { usePredictions } from "@/lib/hooks/usePredictions";
import { MatchDocument, TournamentDocument, LeaderboardEntry } from "@/types/firestore";
import { MatchCard } from "@/components/MatchCard";
import { Target, Trophy, Clock, Loader2, LayoutGrid, ArrowRight } from "lucide-react";
import Link from "next/link";

type TabType = "pending" | "upcoming" | "results";

export default function TournamentIndexPage() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("pending");

  // Load matches & predictions
  const { matches, loading: matchesLoading } = useLiveMatches(userDoc?.activeTournamentIds ?? []);
  const { predictions, loading: predLoading, saving, savePrediction } = usePredictions(
    user?.uid ?? null
  );

  // Tournaments dictionary to map tournamentId to name
  const [tournaments, setTournaments] = useState<Map<string, TournamentDocument>>(new Map());
  const [tournamentsLoading, setTournamentsLoading] = useState(true);

  // Group-wide participants list
  const [participants, setParticipants] = useState<LeaderboardEntry[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const snap = await getDocs(collection(db, "tournaments"));
        const map = new Map<string, TournamentDocument>();
        snap.docs.forEach((doc) => {
          const t = doc.data() as TournamentDocument;
          map.set(t.id, t);
        });
        setTournaments(map);
      } catch (err) {
        console.error("Error fetching tournaments:", err);
      } finally {
        setTournamentsLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (!userDoc?.activeTournamentIds || userDoc.activeTournamentIds.length === 0) {
      setParticipants([]);
      setParticipantsLoading(false);
      return;
    }

    const fetchParticipants = async () => {
      setParticipantsLoading(true);
      try {
        const list: LeaderboardEntry[] = [];
        const seen = new Set<string>();
        
        await Promise.all(
          userDoc.activeTournamentIds.map(async (tId) => {
            const snap = await getDocs(collection(db, "tournaments", tId, "leaderboard"));
            snap.docs.forEach((doc) => {
              const entry = doc.data() as LeaderboardEntry;
              if (!seen.has(entry.userId)) {
                seen.add(entry.userId);
                list.push(entry);
              }
            });
          })
        );
        setParticipants(list);
      } catch (err) {
        console.error("Error fetching group participants:", err);
      } finally {
        setParticipantsLoading(false);
      }
    };
    
    fetchParticipants();
  }, [userDoc?.activeTournamentIds]);

  const handleSave = async (
    matchId: string,
    home1: number,
    away1: number,
    home2: number | null,
    away2: number | null
  ) => {
    if (!user) return;
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    await savePrediction(
      matchId,
      home1,
      away1,
      home2,
      away2,
      {
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        kickoffTime: match.kickoffTime as Timestamp,
      },
      {
        nickname: userDoc?.nickname || "Jugador",
        avatarSeed: userDoc?.avatarSeed || "",
        avatarStyle: userDoc?.avatarStyle || "bottts",
        avatarConfig: userDoc?.avatarConfig || null,
      }
    );
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // If the user hasn't joined any tournament, show a beautiful helper card
  const hasNoTournaments = !userDoc?.activeTournamentIds || userDoc.activeTournamentIds.length === 0;

  if (hasNoTournaments) {
    return (
      <div className="px-4 py-8 space-y-6 max-w-md mx-auto animate-fade-up">
        <div className="glass-card rounded-3xl p-8 text-center space-y-5 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg glow-primary">
            <Target className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white">¿Listo para pronosticar?</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Actualmente no estás participando en ningún torneo. Únete a un torneo en la página de inicio para ver los partidos disponibles.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl
              bg-gradient-to-r from-violet-600 to-purple-600 font-bold text-white text-sm
              hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all shadow-md"
          >
            Ir al Inicio
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Filter matches into Tabs
  // Tab 1: Pending (Upcoming, and no predictions submitted yet)
  const pendingMatches = matches.filter((m) => {
    const isLocked = m.isLocked || (m.kickoffTime?.toDate?.() || new Date(m.kickoffTime as any)) <= new Date();
    const hasPrediction = predictions.has(m.id);
    return !isLocked && !hasPrediction;
  });

  // Tab 2: Upcoming (All upcoming matches, regardless of prediction)
  const upcomingMatches = matches.filter((m) => {
    const isLocked = m.isLocked || (m.kickoffTime?.toDate?.() || new Date(m.kickoffTime as any)) <= new Date();
    return !isLocked;
  });

  // Tab 3: Results (LIVE or finished or locked matches)
  const resultMatches = matches.filter((m) => {
    const isLocked = m.isLocked || (m.kickoffTime?.toDate?.() || new Date(m.kickoffTime as any)) <= new Date();
    const isLive = m.status === "LIVE" || m.status === "HT";
    const isFinished = m.status === "FT" || m.status === "CANC" || m.status === "PST";
    return isLocked || isLive || isFinished;
  });

  // For results tab, show newest results first (sort descending by date)
  const sortedResultMatches = [...resultMatches].sort((a, b) => {
    const timeA = a.kickoffTime?.seconds || 0;
    const timeB = b.kickoffTime?.seconds || 0;
    return timeB - timeA;
  });

  const activeMatchesList = 
    activeTab === "pending" ? pendingMatches :
    activeTab === "upcoming" ? upcomingMatches :
    sortedResultMatches;

  const isLoading = matchesLoading || predLoading || tournamentsLoading || participantsLoading;

  return (
    <div className="px-4 py-5 space-y-5 animate-fade-up">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-400" />
          Partidos
        </h2>
        <p className="text-xs text-white/40 mt-1">
          Tus pronósticos son válidos para todos los torneos que compartan estos partidos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
        {[
          { id: "pending", label: "Pendientes", count: pendingMatches.length },
          { id: "upcoming", label: "Próximos", count: upcomingMatches.length },
          { id: "results", label: "Resultados", count: resultMatches.length },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
                active ? "bg-violet-600 text-white shadow" : "text-white/40 hover:text-white/60"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? "bg-white/20 text-white" : "bg-white/5 text-white/40"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Match List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl h-44 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : activeMatchesList.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-3">
          <div className="text-4xl">⚽</div>
          <p className="text-white/40 text-sm">
            {activeTab === "pending" ? "¡Felicidades! Has completado todos tus pronósticos." :
             activeTab === "upcoming" ? "No hay partidos próximos programados." :
             "Aún no hay resultados de partidos registrados."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeMatchesList.map((m) => {
            // Find which tournament(s) this match belongs to
            const belongsToNames: string[] = [];
            tournaments.forEach((t) => {
              if (t.matchIds.includes(m.id) && userDoc?.activeTournamentIds.includes(t.id)) {
                belongsToNames.push(t.name);
              }
            });

            return (
              <MatchCard
                key={m.id}
                match={m}
                userId={user?.uid ?? ""}
                predictions={predictions}
                saving={saving}
                onSave={handleSave}
                participants={participants}
                tournamentNames={belongsToNames}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
