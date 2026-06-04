// types/api-football.ts
// TypeScript interfaces for API-Football v3 responses

export interface ApiResponse<T> {
  get: string;
  parameters: Record<string, unknown>;
  errors: unknown[];
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

// ─── League Endpoint (/leagues) ───────────────────────────────────────────────
export interface ApiLeagueCountry {
  name: string;
  code: string | null;
  flag: string | null;
}

export interface ApiLeagueSeason {
  year: number;
  start: string;
  end: string;
  current: boolean;
  coverage: {
    fixtures: { events: boolean; lineups: boolean; statistics_fixtures: boolean; statistics_players: boolean };
    standings: boolean;
    players: boolean;
    top_scorers: boolean;
    top_assists: boolean;
    top_cards: boolean;
    injuries: boolean;
    predictions: boolean;
    odds: boolean;
  };
}

export interface ApiLeague {
  id: number;
  name: string;
  type: "League" | "Cup";
  logo: string;
}

export interface ApiLeagueResponse {
  league: ApiLeague;
  country: ApiLeagueCountry;
  seasons: ApiLeagueSeason[];
}

// ─── Fixture Endpoint (/fixtures) ─────────────────────────────────────────────
export interface ApiFixtureInfo {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;             // ISO date string
  timestamp: number;
  periods: { first: number | null; second: number | null };
  venue: { id: number | null; name: string | null; city: string | null };
  status: {
    long: string;
    short: string;          // NS, 1H, HT, 2H, ET, P, FT, AET, PEN, BT, SUSP, INT, PST, CANC, ABD, AWD, WO, LIVE
    elapsed: number | null;
  };
}

export interface ApiTeam {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface ApiLeagueInFixture {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string | null;
  season: number;
  round: string;
}

export interface ApiGoals {
  home: number | null;
  away: number | null;
}

export interface ApiScore {
  halftime: ApiGoals;
  fulltime: ApiGoals;
  extratime: ApiGoals;
  penalty: ApiGoals;
}

export interface ApiFixtureResponse {
  fixture: ApiFixtureInfo;
  league: ApiLeagueInFixture;
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: ApiGoals;
  score: ApiScore;
}
