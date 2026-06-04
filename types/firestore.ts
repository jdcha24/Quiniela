// types/firestore.ts
import { Timestamp } from "firebase/firestore";
import type { AvatarConfig } from "@/lib/utils/dicebear";

// ─── Users ───────────────────────────────────────────────────────────────────
export interface UserDocument {
  uid: string;
  email: string;
  nickname: string;
  avatarSeed: string;
  avatarStyle: string;
  avatarConfig?: AvatarConfig;
  role: "user" | "admin";
  onboardingComplete: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  activeTournamentIds: string[];
}

// ─── Avatars ──────────────────────────────────────────────────────────────────
export type AvatarStyle =
  | "bottts"
  | "adventurer"
  | "lorelei"
  | "fun-emoji"
  | "pixel-art"
  | "thumbs";

export type { AvatarConfig };

// ─── Tournaments ──────────────────────────────────────────────────────────────
export type TournamentStatus = "draft" | "open" | "in_progress" | "finished";

export interface ScoringRules {
  exactScore: number;
  correctResult: number;
  wrong: number;
}

export interface TournamentDocument {
  id: string;
  name: string;
  description?: string;
  status: TournamentStatus;
  matchIds: string[];
  leagueIds: number[];
  season: number;
  allowLateJoin: boolean;
  createdBy: string;
  createdAt: Timestamp;
  startDate: Timestamp;
  endDate: Timestamp;
  participantCount: number;
  scoringRules: ScoringRules;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  avatarSeed: string;
  avatarStyle: AvatarStyle;
  avatarConfig?: AvatarConfig;
  totalPoints: number;
  exactScores: number;
  correctResults: number;
  predictions: number;
  rank: number;
  lastUpdated: Timestamp;
  projectedPoints: number;
  projectedRank: number;
}

// ─── Matches ──────────────────────────────────────────────────────────────────
export type MatchStatus = "NS" | "LIVE" | "HT" | "FT" | "PST" | "CANC";

export interface TeamInfo {
  id: number;
  name: string;
  logo: string;
  shortName: string;
}

export interface LiveScore {
  home: number | null;
  away: number | null;
  elapsed: number | null;
}

export interface FinalScore {
  home: number | null;
  away: number | null;
}

export interface MatchDocument {
  id: string;
  fixtureId: number;
  tournamentId: string;
  leagueId: number;
  leagueName: string;
  leagueLogo: string;
  season: number;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  kickoffTime: Timestamp;
  status: MatchStatus;
  liveScore: LiveScore;
  finalScore: FinalScore;
  lastSyncedAt: Timestamp;
  isLocked: boolean;
}

// ─── Predictions ─────────────────────────────────────────────────────────────
export interface PredictionDocument {
  id: string; // {userId}_{fixtureId}
  userId: string;
  matchId: string;
  tournamentId: string;
  // Option 1 (Primary)
  predictedHome: number;
  predictedAway: number;
  // Option 2 (Secondary - Double Chance)
  predictedHome2: number | null;
  predictedAway2: number | null;
  submittedAt: Timestamp;
  updatedAt: Timestamp;
  // Evaluation fields
  pointsEarned1?: number | null;
  pointsEarned2?: number | null;
  pointsEarned: number | null;
  evaluatedAt: Timestamp | null;
  homeTeamName: string;
  awayTeamName: string;
  kickoffTime: Timestamp;
}

// ─── API Meta ─────────────────────────────────────────────────────────────────
export interface ApiLeagueCache {
  leagueId: number;
  name: string;
  type: "League" | "Cup";
  logo: string;
  country: string;
  countryFlag: string;
  currentSeason: number;
  cachedAt: Timestamp;
}
