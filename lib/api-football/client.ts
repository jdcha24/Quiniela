// lib/api-football/client.ts
import { ApiLeagueResponse, ApiFixtureResponse } from "@/types/api-football";

const BASE_URL = "https://api.football-data.org/v4";

/**
 * Maps football-data.org v4 Match to API-Football v3 Fixture response shape
 */
function mapFootballDataMatchToApiFootballFixture(m: any, comp: any, seasonYear: number): ApiFixtureResponse {
  const kickoffDate = new Date(m.utcDate);

  let shortStatus = "NS";
  const statusUpper = m.status?.toUpperCase() || "";
  if (statusUpper === "FINISHED") {
    shortStatus = "FT";
  } else if (statusUpper === "IN_PLAY") {
    shortStatus = "LIVE";
  } else if (statusUpper === "PAUSED") {
    shortStatus = "HT";
  } else if (statusUpper === "POSTPONED") {
    shortStatus = "PST";
  } else if (statusUpper === "CANCELLED" || statusUpper === "CANCELED") {
    shortStatus = "CANC";
  }

  const homeGoals = m.score?.fullTime?.home !== null && m.score?.fullTime?.home !== undefined ? Number(m.score.fullTime.home) : null;
  const awayGoals = m.score?.fullTime?.away !== null && m.score?.fullTime?.away !== undefined ? Number(m.score.fullTime.away) : null;

  return {
    fixture: {
      id: Number(m.id),
      referee: m.referee?.name || null,
      timezone: "UTC",
      date: kickoffDate.toISOString(),
      timestamp: Math.floor(kickoffDate.getTime() / 1000),
      periods: { first: null, second: null },
      venue: { id: null, name: m.venue || null, city: null },
      status: {
        short: shortStatus,
        long: m.status || "",
        elapsed: null,
      },
    },
    league: {
      id: Number(comp?.id || 0),
      name: comp?.name || "",
      country: m.area?.name || "World",
      logo: comp?.emblem || "https://crests.football-data.org/soccer.png",
      flag: m.area?.flag || null,
      season: seasonYear,
      round: m.matchday ? String(m.matchday) : "1",
    },
    teams: {
      home: {
        id: Number(m.homeTeam.id),
        name: m.homeTeam.name,
        logo: m.homeTeam.crest || "https://crests.football-data.org/team.png",
        winner: m.score?.winner === "HOME_TEAM" ? true : m.score?.winner === "AWAY_TEAM" ? false : null,
      },
      away: {
        id: Number(m.awayTeam.id),
        name: m.awayTeam.name,
        logo: m.awayTeam.crest || "https://crests.football-data.org/team.png",
        winner: m.score?.winner === "AWAY_TEAM" ? true : m.score?.winner === "HOME_TEAM" ? false : null,
      },
    },
    goals: {
      home: homeGoals,
      away: awayGoals,
    },
    score: {
      halftime: { 
        home: m.score?.halfTime?.home !== null && m.score?.halfTime?.home !== undefined ? Number(m.score.halfTime.home) : null,
        away: m.score?.halfTime?.away !== null && m.score?.halfTime?.away !== undefined ? Number(m.score.halfTime.away) : null
      },
      fulltime: { home: homeGoals, away: awayGoals },
      extratime: { 
        home: m.score?.extraTime?.home !== null && m.score?.extraTime?.home !== undefined ? Number(m.score.extraTime.home) : null,
        away: m.score?.extraTime?.away !== null && m.score?.extraTime?.away !== undefined ? Number(m.score.extraTime.away) : null
      },
      penalty: { 
        home: m.score?.penalties?.home !== null && m.score?.penalties?.home !== undefined ? Number(m.score.penalties.home) : null,
        away: m.score?.penalties?.away !== null && m.score?.penalties?.away !== undefined ? Number(m.score.penalties.away) : null
      },
    },
  };
}

// ─── Leagues ─────────────────────────────────────────────────────────────────
export async function fetchLeagues(params?: {
  season?: number;
  country?: string;
  type?: "League" | "Cup";
  search?: string;
}) {
  const apiKey = process.env.FOOTBALL_DATA_KEY || "";
  const url = `${BASE_URL}/competitions`;

  const res = await fetch(url, {
    headers: { "X-Auth-Token": apiKey },
    cache: "force-cache",
  });
  
  if (!res.ok) {
    throw new Error(`football-data.org competitions error: ${res.status}`);
  }
  
  const data = await res.json();
  const comps = data.competitions || [];

  const response = comps.map((c: any) => ({
    league: {
      id: Number(c.id),
      name: c.name,
      logo: c.emblem || "https://crests.football-data.org/soccer.png",
      type: c.type === "CUP" ? "Cup" : "League",
    },
    country: {
      name: c.area?.name || "World",
      flag: c.area?.flag || null,
    },
    seasons: [
      { year: params?.season || 2024, current: true },
    ],
  }));

  return { response };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────
export async function fetchFixtures(params: {
  league?: number;
  season?: number;
  from?: string;
  to?: string;
  status?: string;
}) {
  const { league, season, from, to, status } = params;
  if (!league) return { response: [] };

  const apiKey = process.env.FOOTBALL_DATA_KEY || "";
  const url = `${BASE_URL}/competitions/${league}/matches?season=${season || 2024}`;

  const res = await fetch(url, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  
  if (!res.ok) {
    throw new Error(`football-data.org matches error: ${res.status}`);
  }
  
  const data = await res.json();
  const matches = data.matches || [];
  const compInfo = data.competition;

  let mapped = matches.map((m: any) => 
    mapFootballDataMatchToApiFootballFixture(m, compInfo, Number(season || 2024))
  );

  if (from) {
    const fromTime = new Date(`${from}T00:00:00Z`).getTime();
    mapped = mapped.filter((f: any) => new Date(f.fixture.date).getTime() >= fromTime);
  }
  if (to) {
    const toTime = new Date(`${to}T23:59:59Z`).getTime();
    mapped = mapped.filter((f: any) => new Date(f.fixture.date).getTime() <= toTime);
  }

  if (status && status !== "ALL") {
    mapped = mapped.filter((f: any) => f.fixture.status.short === status);
  }

  return { response: mapped };
}

// ─── Live Fixtures ────────────────────────────────────────────────────────────
export async function fetchLiveFixtures(fixtureIds: number[], dateFrom?: string, dateTo?: string) {
  if (fixtureIds.length === 0) return { response: [] };

  const apiKey = process.env.FOOTBALL_DATA_KEY || "";
  let url = `${BASE_URL}/matches`;
  if (dateFrom && dateTo) {
    url += `?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  }

  const res = await fetch(url, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  
  if (!res.ok) {
    throw new Error(`football-data.org live matches error: ${res.status}`);
  }
  
  const data = await res.json();
  const todayMatches = data.matches || [];

  const trackedMatches = todayMatches.filter((m: any) => fixtureIds.includes(Number(m.id)));

  const mapped = trackedMatches.map((m: any) => 
    mapFootballDataMatchToApiFootballFixture(m, m.competition, new Date(m.utcDate).getFullYear())
  );

  return { response: mapped };
}
