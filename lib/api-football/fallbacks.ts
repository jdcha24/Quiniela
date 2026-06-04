// lib/api-football/fallbacks.ts
import { ApiLeagueResponse, ApiFixtureResponse } from "@/types/api-football";

export const FALLBACK_LEAGUES: ApiLeagueResponse[] = [
  {
    league: {
      id: 2014,
      name: "Primera Division (La Liga - España)",
      type: "League",
      logo: "https://crests.football-data.org/PD.png"
    },
    country: {
      name: "Spain",
      code: "ES",
      flag: "https://crests.football-data.org/760.svg"
    },
    seasons: [
      { year: 2024, start: "2024-08-15", end: "2025-05-25", current: true, coverage: {} as any }
    ]
  },
  {
    league: {
      id: 2021,
      name: "Premier League (Inglaterra)",
      type: "League",
      logo: "https://crests.football-data.org/PL.png"
    },
    country: {
      name: "England",
      code: "GB",
      flag: "https://crests.football-data.org/770.svg"
    },
    seasons: [
      { year: 2024, start: "2024-08-16", end: "2025-05-25", current: true, coverage: {} as any }
    ]
  },
  {
    league: {
      id: 2002,
      name: "Bundesliga (Alemania)",
      type: "League",
      logo: "https://crests.football-data.org/BL1.png"
    },
    country: {
      name: "Germany",
      code: "DE",
      flag: "https://crests.football-data.org/759.svg"
    },
    seasons: [
      { year: 2024, start: "2024-08-23", end: "2025-05-17", current: true, coverage: {} as any }
    ]
  },
  {
    league: {
      id: 2001,
      name: "UEFA Champions League",
      type: "Cup",
      logo: "https://crests.football-data.org/CL.png"
    },
    country: {
      name: "World",
      code: "world",
      flag: "https://crests.football-data.org/world.svg"
    },
    seasons: [
      { year: 2024, start: "2024-07-09", end: "2025-05-31", current: true, coverage: {} as any }
    ]
  }
];

export const FALLBACK_FIXTURES: ApiFixtureResponse[] = [
  // Premier League (2021)
  {
    fixture: {
      id: 4001,
      referee: "Anthony Taylor",
      timezone: "UTC",
      date: "2024-09-14T11:30:00+00:00",
      timestamp: 1726313400,
      periods: { first: null, second: null },
      venue: { id: 6, name: "Tottenham Hotspur Stadium", city: "London" },
      status: { long: "Not Started", short: "NS", elapsed: null }
    },
    league: { id: 2021, name: "Premier League", country: "England", logo: "https://crests.football-data.org/PL.png", flag: "https://crests.football-data.org/770.svg", season: 2024, round: "4" },
    teams: {
      home: { id: 73, name: "Tottenham Hotspur FC", logo: "https://crests.football-data.org/73.svg", winner: null },
      away: { id: 57, name: "Arsenal FC", logo: "https://crests.football-data.org/57.svg", winner: null }
    },
    goals: { home: null, away: null },
    score: { halftime: { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } }
  },
  {
    fixture: {
      id: 4002,
      referee: "Michael Oliver",
      timezone: "UTC",
      date: "2024-09-15T15:30:00+00:00",
      timestamp: 1726414200,
      periods: { first: null, second: null },
      venue: { id: 7, name: "Etihad Stadium", city: "Manchester" },
      status: { long: "Not Started", short: "NS", elapsed: null }
    },
    league: { id: 2021, name: "Premier League", country: "England", logo: "https://crests.football-data.org/PL.png", flag: "https://crests.football-data.org/770.svg", season: 2024, round: "4" },
    teams: {
      home: { id: 65, name: "Manchester City FC", logo: "https://crests.football-data.org/65.svg", winner: null },
      away: { id: 64, name: "Liverpool FC", logo: "https://crests.football-data.org/64.svg", winner: null }
    },
    goals: { home: null, away: null },
    score: { halftime: { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } }
  },

  // La Liga (2014)
  {
    fixture: {
      id: 4003,
      referee: "Jesús Gil Manzano",
      timezone: "UTC",
      date: "2024-09-14T19:00:00+00:00",
      timestamp: 1726340400,
      periods: { first: null, second: null },
      venue: { id: 4, name: "Santiago Bernabéu", city: "Madrid" },
      status: { long: "Not Started", short: "NS", elapsed: null }
    },
    league: { id: 2014, name: "Primera Division", country: "Spain", logo: "https://crests.football-data.org/PD.png", flag: "https://crests.football-data.org/760.svg", season: 2024, round: "5" },
    teams: {
      home: { id: 86, name: "Real Madrid CF", logo: "https://crests.football-data.org/86.svg", winner: null },
      away: { id: 81, name: "FC Barcelona", logo: "https://crests.football-data.org/81.svg", winner: null }
    },
    goals: { home: null, away: null },
    score: { halftime: { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } }
  },
  {
    fixture: {
      id: 4004,
      referee: "José María Sánchez Martínez",
      timezone: "UTC",
      date: "2024-09-15T16:30:00+00:00",
      timestamp: 1726417800,
      periods: { first: null, second: null },
      venue: { id: 5, name: "Cívitas Metropolitano", city: "Madrid" },
      status: { long: "Not Started", short: "NS", elapsed: null }
    },
    league: { id: 2014, name: "Primera Division", country: "Spain", logo: "https://crests.football-data.org/PD.png", flag: "https://crests.football-data.org/760.svg", season: 2024, round: "5" },
    teams: {
      home: { id: 78, name: "Club Atlético de Madrid", logo: "https://crests.football-data.org/78.svg", winner: null },
      away: { id: 95, name: "Valencia CF", logo: "https://crests.football-data.org/95.svg", winner: null }
    },
    goals: { home: null, away: null },
    score: { halftime: { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } }
  }
];

export function getFallbackFixtures(leagueId: number): ApiFixtureResponse[] {
  const filtered = FALLBACK_FIXTURES.filter((f) => f.league.id === leagueId);
  return filtered.length > 0 ? filtered : FALLBACK_FIXTURES;
}
