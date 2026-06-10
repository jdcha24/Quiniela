// app/(admin)/admin/tournaments/new/page.tsx
// 2-Step admin tournament builder: Step 1 = Pick leagues, Step 2 = Pick fixtures
"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { ApiLeagueResponse, ApiFixtureResponse } from "@/types/api-football";
import {
  Search, ChevronLeft, ChevronRight, Check, Loader2,
  Globe, Trophy, Calendar, Filter, Plus, ArrowRight, Flame
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { TournamentDocument } from "@/types/firestore";

type Step = 1 | 2 | 3;

async function getIdToken(user: { getIdToken: () => Promise<string> }) {
  return user.getIdToken();
}

export default function NewTournamentPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-sm text-white/50">Cargando constructor...</span>
      </div>
    }>
      <NewTournamentContent />
    </Suspense>
  );
}

function NewTournamentContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editTournamentId = searchParams.get("tournamentId");
  const [targetTournament, setTargetTournament] = useState<TournamentDocument | null>(null);
  const [step, setStep] = useState<Step>(1);

  // Season & Status Configurations
  const [season, setSeason] = useState(() => {
    const currentYear = new Date().getFullYear();
    return currentYear > 2024 ? "2024" : String(currentYear);
  });
  const [fixtureStatus, setFixtureStatus] = useState("NS");
  const [isFallbackActive, setIsFallbackActive] = useState(false);

  // Step 1
  const [leagues, setLeagues] = useState<ApiLeagueResponse[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [selectedLeagues, setSelectedLeagues] = useState<Set<number>>(new Set());
  const [leagueSearch, setLeagueSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  // Step 2
  const [fixtures, setFixtures] = useState<ApiFixtureResponse[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [selectedFixtures, setSelectedFixtures] = useState<Set<number>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Step 3
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDesc, setTournamentDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Load target tournament if editTournamentId is present
  useEffect(() => {
    if (!editTournamentId) return;

    const fetchTournament = async () => {
      try {
        const docRef = doc(db, "tournaments", editTournamentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as TournamentDocument;
          setTargetTournament(data);
          setTournamentName(data.name);
          setTournamentDesc(data.description || "");
          // Pre-select existing leagues
          if (data.leagueIds && data.leagueIds.length > 0) {
            setSelectedLeagues(new Set(data.leagueIds));
          }
        }
      } catch (err) {
        console.error("Error loading tournament details:", err);
      }
    };
    fetchTournament();
  }, [editTournamentId]);

  function todayStr() {
    return new Date().toISOString().split("T")[0];
  }
  function weeksFromNow(weeks: number) {
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    return d.toISOString().split("T")[0];
  }

  // Adjust date range when season changes
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    if (String(currentYear) === season) {
      setDateFrom(todayStr());
      setDateTo(weeksFromNow(2));
    } else {
      // Historical seasons default to September range to easily find valid fixtures
      setDateFrom(`${season}-09-01`);
      setDateTo(`${season}-09-15`);
    }
  }, [season]);

  // ── Step 1: Fetch leagues ─────────────────────────────────────────────────
  const fetchLeagues = async () => {
    if (!user) return;
    setLeaguesLoading(true);
    const token = await getIdToken(user);
    const params = new URLSearchParams({ season });

    try {
      const res = await fetch(`/api/admin/leagues?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const isFallbackHeader = res.headers.get("X-API-Fallback") === "true";
      setIsFallbackActive(isFallbackHeader);

      const data = await res.json();
      setLeagues(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading leagues:", err);
      setIsFallbackActive(true);
      setLeagues([]);
    } finally {
      setLeaguesLoading(false);
    }
  };

  useEffect(() => {
    if (step === 1) fetchLeagues();
  }, [step, season]);

  const filteredLeagues = Array.isArray(leagues)
    ? leagues.filter(
        (l) =>
          (l.league.name.toLowerCase().includes(leagueSearch.toLowerCase()) ||
          l.country.name?.toLowerCase().includes(leagueSearch.toLowerCase())) &&
          (countryFilter.trim() === "" ||
            l.country.name?.toLowerCase().includes(countryFilter.trim().toLowerCase()))
      )
    : [];

  const toggleLeague = (id: number) => {
    setSelectedLeagues((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Step 2: Fetch fixtures ────────────────────────────────────────────────
  const fetchFixtures = async () => {
    if (!user || selectedLeagues.size === 0) return;
    setFixturesLoading(true);
    const token = await getIdToken(user);

    const allFixtures: ApiFixtureResponse[] = [];
    let fallbackDetected = false;
    for (const leagueId of selectedLeagues) {
      const params = new URLSearchParams({
        league: String(leagueId),
        season,
        from: dateFrom,
        to: dateTo,
        status: fixtureStatus,
      });
      try {
        const res = await fetch(`/api/admin/fixtures?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const isFallbackHeader = res.headers.get("X-API-Fallback") === "true";
        if (isFallbackHeader) {
          fallbackDetected = true;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          allFixtures.push(...data);
        }
      } catch (err) {
        console.error(`Error loading fixtures for league ${leagueId}:`, err);
        fallbackDetected = true;
      }
    }

    setIsFallbackActive(fallbackDetected);

    // Sort by date
    allFixtures.sort(
      (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
    );
    setFixtures(allFixtures);
    setFixturesLoading(false);
  };

  useEffect(() => {
    if (step === 2) fetchFixtures();
  }, [step]);

  const toggleFixture = (id: number) => {
    setSelectedFixtures((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Step 3: Create tournament ─────────────────────────────────────────────
  const createTournament = async () => {
    if (!user || !tournamentName.trim() || selectedFixtures.size === 0) return;
    setCreating(true);
    const token = await getIdToken(user);

    const selectedFixtureData = fixtures.filter((f) =>
      selectedFixtures.has(f.fixture.id)
    );

    const res = await fetch("/api/admin/assign-matches", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tournamentId: editTournamentId || undefined,
        name: tournamentName.trim(),
        description: tournamentDesc.trim(),
        leagueIds: [...selectedLeagues],
        fixtures: selectedFixtureData,
      }),
    });

    const data = await res.json();
    setCreating(false);

    if (data.success) {
      router.push(`/admin`);
    }
  };

  // ── Step indicators ───────────────────────────────────────────────────────
  const steps = [
    { num: 1, label: "Ligas" },
    { num: 2, label: "Partidos" },
    { num: 3, label: targetTournament ? "Agregar" : "Crear" },
  ];

  return (
    <div className="px-4 py-5 space-y-5 animate-fade-up">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {steps.map(({ num, label }, i) => (
          <div key={num} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${
              step === num
                ? "bg-amber-500 text-black"
                : step > num
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-white/5 text-white/30 border border-white/10"
            }`}>
              {step > num ? <Check className="w-4 h-4" /> : num}
            </div>
            <span className={`text-xs font-semibold ${step === num ? "text-white" : "text-white/40"}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${step > num ? "bg-emerald-500/40" : "bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Fallback warning banner */}
      {isFallbackActive && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <span className="animate-pulse">⚠️</span> Modo Simulación Offline Activo
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            La clave de API de deportes superó su límite de consultas gratuitas (Error 429) o el servidor de datos no respondió adecuadamente para la temporada seleccionada. Para que puedas seguir probando y creando torneos, el sistema cargó automáticamente ligas y partidos de demostración históricos.
          </p>
        </div>
      )}

      {/* ── Step 1: League selector ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-white">
              {targetTournament ? `Agregar partidos a: ${targetTournament.name}` : "Paso 1: Selecciona ligas"}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {targetTournament 
                ? "Elige ligas adicionales o mantén las seleccionadas para importar nuevos partidos." 
                : "Elige las ligas/copas de las que quieres importar partidos."}
            </p>
          </div>

          {/* Season Selector */}
          <div className="flex items-center justify-between gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Temporada del API:
            </span>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50 cursor-pointer font-bold"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024 (Recomendada - Plan Gratis)</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>

          {/* Search + country filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Buscar liga..."
                value={leagueSearch}
                onChange={(e) => setLeagueSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Filtrar por país (ej. Mexico, Spain)..."
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40"
              />
            </div>
          </div>

          {/* Selected count badge */}
          {selectedLeagues.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">
                {selectedLeagues.size} liga(s) seleccionada(s)
              </span>
            </div>
          )}

          {/* League list */}
          {leaguesLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {filteredLeagues.map((item) => {
                const selected = selectedLeagues.has(item.league.id);
                const currentSeason = item.seasons.find((s) => s.current);
                return (
                  <button
                    key={item.league.id}
                    onClick={() => toggleLeague(item.league.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      selected
                        ? "bg-amber-500/15 border border-amber-500/40"
                        : "bg-white/3 border border-transparent hover:bg-white/6"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.league.logo} alt={item.league.name} className="w-8 h-8 object-contain" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{item.league.name}</div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        {item.country.flag && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.country.flag} alt="" className="w-3 h-3" />
                        )}
                        {item.country.name}
                        <span>·</span>
                        <span className={`${item.league.type === "Cup" ? "text-violet-400" : "text-cyan-400"}`}>
                          {item.league.type}
                        </span>
                        {currentSeason && <span>· {currentSeason.year}</span>}
                      </div>
                    </div>
                    {selected && <Check className="w-5 h-5 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={selectedLeagues.size === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base
              bg-amber-500 text-black hover:bg-amber-400 active:scale-95 transition-all
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente: Ver partidos
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Step 2: Fixture selector ────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <ChevronLeft className="w-4 h-4 text-white/70" />
            </button>
            <div>
              <h2 className="text-xl font-black text-white">Paso 2: Elige partidos</h2>
              <p className="text-xs text-white/40">De {selectedLeagues.size} liga(s) seleccionada(s)</p>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Desde", value: dateFrom, setter: setDateFrom },
              { label: "Hasta", value: dateTo, setter: setDateTo },
            ].map(({ label, value, setter }) => (
              <div key={label} className="space-y-1">
                <label className="text-xs text-white/40 font-medium">{label}</label>
                <input
                  type="date"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-500/40"
                />
              </div>
            ))}
          </div>

          {/* Status selector + Update Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 flex items-center justify-between gap-3 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
              <span className="text-xs font-semibold text-white/70 flex items-center gap-1.5 whitespace-nowrap">
                <Filter className="w-3.5 h-3.5 text-emerald-500" />
                Estado de partidos:
              </span>
              <select
                value={fixtureStatus}
                onChange={(e) => setFixtureStatus(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer font-bold"
              >
                <option value="NS">Sin empezar (NS)</option>
                <option value="FT">Finalizados (FT)</option>
                <option value="ALL">Todos</option>
              </select>
            </div>
            
            <button
              onClick={fetchFixtures}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs transition-all active:scale-95 shrink-0"
            >
              <Filter className="w-3.5 h-3.5" />
              Actualizar partidos
            </button>
          </div>

          {/* Selected count */}
          {selectedFixtures.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <Flame className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">
                {selectedFixtures.size} partido(s) seleccionado(s)
              </span>
            </div>
          )}

          {/* Fixture list */}
          {fixturesLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : fixtures.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center space-y-2">
              <Calendar className="w-10 h-10 text-white/20 mx-auto" />
              <p className="text-white/40 text-sm">No hay partidos en ese rango de fechas.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {fixtures.map((f) => {
                const selected = selectedFixtures.has(f.fixture.id);
                const kickoff = new Date(f.fixture.date);
                return (
                  <button
                    key={f.fixture.id}
                    onClick={() => toggleFixture(f.fixture.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      selected
                        ? "bg-emerald-500/10 border border-emerald-500/30"
                        : "bg-white/3 border border-transparent hover:bg-white/6"
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.league.logo} alt="" className="w-3.5 h-3.5 object-contain" />
                        <span className="truncate">{f.league.name}</span>
                        <span>·</span>
                        <span>{kickoff.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}</span>
                        <span>{kickoff.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.teams.home.logo} alt="" className="w-5 h-5 object-contain" />
                          <span className="truncate">{f.teams.home.name}</span>
                        </div>
                        <span className="text-white/30 shrink-0">vs</span>
                        <div className="flex items-center gap-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.teams.away.logo} alt="" className="w-5 h-5 object-contain" />
                          <span className="truncate">{f.teams.away.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                      selected ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                    }`}>
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setStep(3)}
            disabled={selectedFixtures.size === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base
              bg-amber-500 text-black hover:bg-amber-400 active:scale-95 transition-all
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {targetTournament ? "Siguiente: Confirmar adición" : "Siguiente: Crear torneo"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Step 3: Tournament details ──────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(2)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <ChevronLeft className="w-4 h-4 text-white/70" />
            </button>
            <div>
              <h2 className="text-xl font-black text-white">
                {targetTournament ? "Paso 3: Confirmar adición" : "Paso 3: Detalles del torneo"}
              </h2>
              <p className="text-xs text-white/40">{selectedFixtures.size} partidos seleccionados</p>
            </div>
          </div>

          {/* Summary */}
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">Resumen</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Ligas</span>
              <span className="font-bold text-white">{selectedLeagues.size}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Partidos nuevos</span>
              <span className="font-bold text-emerald-400">{selectedFixtures.size}</span>
            </div>
          </div>

          {/* Tournament name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Nombre del torneo *</label>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="ej. Liga MX Jornada 12 · Champions"
              maxLength={60}
              disabled={!!targetTournament}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
                placeholder-white/25 text-sm focus:outline-none focus:border-amber-500/40 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Descripción (opcional)</label>
            <textarea
              value={tournamentDesc}
              onChange={(e) => setTournamentDesc(e.target.value)}
              placeholder="Breve descripción del torneo..."
              rows={2}
              maxLength={200}
              disabled={!!targetTournament}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
                placeholder-white/25 text-sm focus:outline-none focus:border-amber-500/40 resize-none disabled:opacity-50"
            />
          </div>

          {/* Scoring info */}
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">Puntuación automática</h4>
            {[
              { pts: "3 pts", label: "Marcador exacto", color: "text-emerald-400" },
              { pts: "1 pt", label: "Resultado correcto", color: "text-amber-400" },
              { pts: "0 pts", label: "Fallo total", color: "text-red-400" },
            ].map(({ pts, label, color }) => (
              <div key={pts} className="flex items-center justify-between text-sm">
                <span className="text-white/50">{label}</span>
                <span className={`font-black ${color}`}>{pts}</span>
              </div>
            ))}
          </div>

          {/* Create button */}
          <button
            onClick={createTournament}
            disabled={!tournamentName.trim() || creating}
            id="btn-create-tournament"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base
              bg-gradient-to-r from-amber-500 to-orange-500 text-black
              hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? (
              targetTournament ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Agregando partidos...</>
              ) : (
                <><Loader2 className="w-5 h-5 animate-spin" /> Creando torneo...</>
              )
            ) : (
              targetTournament ? (
                <><Plus className="w-5 h-5" /> Agregar partidos al torneo</>
              ) : (
                <><Plus className="w-5 h-5" /> Crear torneo</>
              )
            )}
          </button>
        </div>
      )}
    </div>
  );
}
