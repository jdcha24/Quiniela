// lib/api-football/mappers.ts
// Maps API-Football v3 responses to Firestore document shapes
import { ApiFixtureResponse } from "@/types/api-football";
import { MatchDocument } from "@/types/firestore";
import { Timestamp } from "firebase-admin/firestore";

export function mapFixtureToMatch(
  fixture: ApiFixtureResponse,
  tournamentId: string
): MatchDocument {
  const kickoffDate = new Date(fixture.fixture.date);
  const mappedStatus = mapApiStatus(fixture.fixture.status.short);
  const isFinished = ["FT", "AET", "PEN"].includes(fixture.fixture.status.short);

  return {
    id: String(fixture.fixture.id),
    fixtureId: fixture.fixture.id,
    tournamentId,
    tournamentIds: [tournamentId],
    leagueId: fixture.league.id,
    leagueName: fixture.league.name,
    leagueLogo: fixture.league.logo,
    season: fixture.league.season,
    homeTeam: {
      id: fixture.teams.home.id,
      name: fixture.teams.home.name,
      logo: fixture.teams.home.logo,
      shortName: buildShortName(fixture.teams.home.name),
    },
    awayTeam: {
      id: fixture.teams.away.id,
      name: fixture.teams.away.name,
      logo: fixture.teams.away.logo,
      shortName: buildShortName(fixture.teams.away.name),
    },
    kickoffTime: Timestamp.fromDate(kickoffDate) as unknown as import("firebase/firestore").Timestamp,
    status: mappedStatus,
    liveScore: {
      home: fixture.goals.home,
      away: fixture.goals.away,
      elapsed: fixture.fixture.status.elapsed,
    },
    finalScore: {
      home: isFinished ? fixture.goals.home : null,
      away: isFinished ? fixture.goals.away : null,
    },
    lastSyncedAt: Timestamp.now() as unknown as import("firebase/firestore").Timestamp,
    isLocked: mappedStatus !== "NS" || kickoffDate <= new Date(),
  };
}

function buildShortName(fullName: string): string {
  // Try to get meaningful 3-letter abbreviation
  const words = fullName.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  // Use first letters of each significant word (max 3)
  return words
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Map API status short code to our internal MatchStatus
 */
export function mapApiStatus(
  apiStatus: string
): MatchDocument["status"] {
  const liveStatuses = ["1H", "2H", "HT", "ET", "BT", "P", "INT", "LIVE"];
  if (liveStatuses.includes(apiStatus)) return "LIVE";

  switch (apiStatus) {
    case "NS": return "NS";
    case "FT":
    case "AET":
    case "PEN":
      return "FT";
    case "HT": return "HT";
    case "PST": return "PST";
    case "CANC":
    case "ABD":
    case "AWD":
    case "WO":
      return "CANC";
    default: return "NS";
  }
}
