// lib/mockData.ts
import { Timestamp } from "firebase/firestore";
import { TournamentDocument, MatchDocument, LeaderboardEntry, PredictionDocument, UserDocument } from "@/types/firestore";

// Helper to create timestamps relative to current date
const getRelativeTimestamp = (daysOffset: number, hoursOffset: number = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(date.getHours() + hoursOffset);
  return Timestamp.fromDate(date);
};

// 1. Mock Logged-In User
export const mockUser: UserDocument = {
  uid: "mock-user-tatan",
  email: "tatan@quiniela.com",
  nickname: "Tatan_Crack",
  avatarSeed: "tatan-seed",
  avatarStyle: "adventurer",
  role: "user",
  onboardingComplete: true,
  createdAt: getRelativeTimestamp(-30),
  updatedAt: getRelativeTimestamp(0),
  activeTournamentIds: ["champions-2026", "ligamx-2026"],
  avatarConfig: {
    seed: "tatan-seed",
    style: "adventurer",
    backgroundColor: "7c3aed"
  }
};

// 2. Mock Tournaments
export const mockTournaments: TournamentDocument[] = [
  {
    id: "champions-2026",
    name: "UEFA Champions League 2026 🏆",
    description: "Fase final de la Champions League. Pronostica los mejores encuentros de Europa.",
    status: "in_progress",
    matchIds: ["match-1", "match-2", "match-3", "match-4", "match-5"],
    leagueIds: [2],
    season: 2026,
    allowLateJoin: false,
    createdBy: "admin-1",
    createdAt: getRelativeTimestamp(-10),
    startDate: getRelativeTimestamp(-2),
    endDate: getRelativeTimestamp(10),
    participantCount: 12,
    scoringRules: {
      exactScore: 3,
      correctResult: 1,
      wrong: 0
    }
  },
  {
    id: "ligamx-2026",
    name: "Liga MX Apertura 2026 🇲🇽",
    description: "Torneo de simulación de la liga mexicana. ¡Compite por el trono nacional!",
    status: "open",
    matchIds: ["match-6", "match-7"],
    leagueIds: [262],
    season: 2026,
    allowLateJoin: true,
    createdBy: "admin-1",
    createdAt: getRelativeTimestamp(-5),
    startDate: getRelativeTimestamp(3),
    endDate: getRelativeTimestamp(20),
    participantCount: 12,
    scoringRules: {
      exactScore: 3,
      correctResult: 1,
      wrong: 0
    }
  }
];

// 3. Mock Matches
export const mockMatches: MatchDocument[] = [
  // Finished Matches
  {
    id: "match-1",
    fixtureId: 101,
    tournamentIds: ["champions-2026"],
    leagueId: 2,
    leagueName: "UEFA Champions League",
    leagueLogo: "https://media.api-sports.io/football/leagues/2.png",
    season: 2026,
    homeTeam: { id: 541, name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png", shortName: "RMA" },
    awayTeam: { id: 529, name: "Bayern Munich", logo: "https://media.api-sports.io/football/teams/529.png", shortName: "FCB" },
    kickoffTime: getRelativeTimestamp(-2), // 2 days ago
    status: "FT",
    liveScore: { home: null, away: null, elapsed: null },
    finalScore: { home: 3, away: 1 },
    lastSyncedAt: getRelativeTimestamp(-2),
    isLocked: true
  },
  {
    id: "match-2",
    fixtureId: 102,
    tournamentIds: ["champions-2026"],
    leagueId: 2,
    leagueName: "UEFA Champions League",
    leagueLogo: "https://media.api-sports.io/football/leagues/2.png",
    season: 2026,
    homeTeam: { id: 85, name: "Paris Saint Germain", logo: "https://media.api-sports.io/football/teams/85.png", shortName: "PSG" },
    awayTeam: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png", shortName: "MCI" },
    kickoffTime: getRelativeTimestamp(-1), // 1 day ago
    status: "FT",
    liveScore: { home: null, away: null, elapsed: null },
    finalScore: { home: 1, away: 2 },
    lastSyncedAt: getRelativeTimestamp(-1),
    isLocked: true
  },
  // Live Match
  {
    id: "match-3",
    fixtureId: 103,
    tournamentIds: ["champions-2026"],
    leagueId: 2,
    leagueName: "UEFA Champions League",
    leagueLogo: "https://media.api-sports.io/football/leagues/2.png",
    season: 2026,
    homeTeam: { id: 529, name: "Barcelona", logo: "https://media.api-sports.io/football/teams/529.png", shortName: "FCB" },
    awayTeam: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", shortName: "LIV" },
    kickoffTime: getRelativeTimestamp(0, -1), // Started 1 hour ago
    status: "LIVE",
    liveScore: { home: 2, away: 2, elapsed: 75 },
    finalScore: { home: null, away: null },
    lastSyncedAt: getRelativeTimestamp(0),
    isLocked: true
  },
  // Locked but not started (Starts in 15 minutes)
  {
    id: "match-4",
    fixtureId: 104,
    tournamentIds: ["champions-2026"],
    leagueId: 2,
    leagueName: "UEFA Champions League",
    leagueLogo: "https://media.api-sports.io/football/leagues/2.png",
    season: 2026,
    homeTeam: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png", shortName: "ARS" },
    awayTeam: { id: 505, name: "Inter Milan", logo: "https://media.api-sports.io/football/teams/505.png", shortName: "INT" },
    kickoffTime: getRelativeTimestamp(0, 0.25), // Starts in 15 min
    status: "NS",
    liveScore: { home: null, away: null, elapsed: null },
    finalScore: { home: null, away: null },
    lastSyncedAt: getRelativeTimestamp(0),
    isLocked: true
  },
  // Upcoming match (Not locked)
  {
    id: "match-5",
    fixtureId: 105,
    tournamentIds: ["champions-2026"],
    leagueId: 2,
    leagueName: "UEFA Champions League",
    leagueLogo: "https://media.api-sports.io/football/leagues/2.png",
    season: 2026,
    homeTeam: { id: 489, name: "AC Milan", logo: "https://media.api-sports.io/football/teams/489.png", shortName: "MIL" },
    awayTeam: { id: 165, name: "Borussia Dortmund", logo: "https://media.api-sports.io/football/teams/165.png", shortName: "BVB" },
    kickoffTime: getRelativeTimestamp(1), // Tomorrow
    status: "NS",
    liveScore: { home: null, away: null, elapsed: null },
    finalScore: { home: null, away: null },
    lastSyncedAt: getRelativeTimestamp(0),
    isLocked: false
  },
  // Liga MX Matches
  {
    id: "match-6",
    fixtureId: 201,
    tournamentIds: ["ligamx-2026"],
    leagueId: 262,
    leagueName: "Liga MX",
    leagueLogo: "https://media.api-sports.io/football/leagues/262.png",
    season: 2026,
    homeTeam: { id: 2281, name: "Club America", logo: "https://media.api-sports.io/football/teams/2281.png", shortName: "AME" },
    awayTeam: { id: 2287, name: "Chivas Guadalajara", logo: "https://media.api-sports.io/football/teams/2287.png", shortName: "CHI" },
    kickoffTime: getRelativeTimestamp(3), // In 3 days
    status: "NS",
    liveScore: { home: null, away: null, elapsed: null },
    finalScore: { home: null, away: null },
    lastSyncedAt: getRelativeTimestamp(0),
    isLocked: false
  },
  {
    id: "match-7",
    fixtureId: 202,
    tournamentIds: ["ligamx-2026"],
    leagueId: 262,
    leagueName: "Liga MX",
    leagueLogo: "https://media.api-sports.io/football/leagues/262.png",
    season: 2026,
    homeTeam: { id: 2289, name: "Cruz Azul", logo: "https://media.api-sports.io/football/teams/2289.png", shortName: "CAZ" },
    awayTeam: { id: 2282, name: "Pumas UNAM", logo: "https://media.api-sports.io/football/teams/2282.png", shortName: "PUM" },
    kickoffTime: getRelativeTimestamp(4), // In 4 days
    status: "NS",
    liveScore: { home: null, away: null, elapsed: null },
    finalScore: { home: null, away: null },
    lastSyncedAt: getRelativeTimestamp(0),
    isLocked: false
  }
];

// 4. Mock Leaderboard Entries
export const mockLeaderboard: LeaderboardEntry[] = [
  {
    userId: "user-1",
    nickname: "Santi_Gol ⚽",
    avatarSeed: "santi-seed",
    avatarStyle: "adventurer",
    avatarConfig: { seed: "santi-seed", style: "adventurer", backgroundColor: "fbbf24" },
    totalPoints: 24,
    exactScores: 6,
    correctResults: 6,
    predictions: 12,
    rank: 1,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 24,
    projectedRank: 1
  },
  {
    userId: "user-2",
    nickname: "LaHinchada",
    avatarSeed: "hinchada-seed",
    avatarStyle: "bottts",
    avatarConfig: { seed: "hinchada-seed", style: "bottts", backgroundColor: "94a3b8" },
    totalPoints: 21,
    exactScores: 5,
    correctResults: 6,
    predictions: 12,
    rank: 2,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 21,
    projectedRank: 2
  },
  {
    userId: "user-3",
    nickname: "Rafa_Net 🕸️",
    avatarSeed: "rafa-seed",
    avatarStyle: "fun-emoji",
    avatarConfig: { seed: "rafa-seed", style: "funEmoji", backgroundColor: "a78bfa" },
    totalPoints: 18,
    exactScores: 4,
    correctResults: 6,
    predictions: 12,
    rank: 3,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 18,
    projectedRank: 3
  },
  {
    userId: "user-4",
    nickname: "Gaby_Preds",
    avatarSeed: "gaby-seed",
    avatarStyle: "avataaars" as any, // Fallback to avataaars style
    avatarConfig: { seed: "gaby-seed", style: "avataaars", backgroundColor: "ec4899" },
    totalPoints: 16,
    exactScores: 3,
    correctResults: 7,
    predictions: 12,
    rank: 4,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 16,
    projectedRank: 4
  },
  {
    userId: "mock-user-tatan", // Current user
    nickname: "Tatan_Crack (tú)",
    avatarSeed: "tatan-seed",
    avatarStyle: "adventurer",
    avatarConfig: { seed: "tatan-seed", style: "adventurer", backgroundColor: "7c3aed" },
    totalPoints: 15,
    exactScores: 3,
    correctResults: 6,
    predictions: 12,
    rank: 5,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 15,
    projectedRank: 5
  },
  {
    userId: "user-6",
    nickname: "Diego10",
    avatarSeed: "diego-seed",
    avatarStyle: "pixel-art",
    avatarConfig: { seed: "diego-seed", style: "pixelArt", backgroundColor: "10b981" },
    totalPoints: 12,
    exactScores: 2,
    correctResults: 6,
    predictions: 12,
    rank: 6,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 12,
    projectedRank: 6
  },
  {
    userId: "user-7",
    nickname: "Fede_Py",
    avatarSeed: "fede-seed",
    avatarStyle: "bottts",
    avatarConfig: { seed: "fede-seed", style: "bottts", backgroundColor: "f59e0b" },
    totalPoints: 11,
    exactScores: 1,
    correctResults: 8,
    predictions: 12,
    rank: 7,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 11,
    projectedRank: 7
  },
  {
    userId: "user-8",
    nickname: "MessiFan",
    avatarSeed: "messi-seed",
    avatarStyle: "fun-emoji",
    avatarConfig: { seed: "messi-seed", style: "funEmoji", backgroundColor: "06b6d4" },
    totalPoints: 9,
    exactScores: 1,
    correctResults: 6,
    predictions: 12,
    rank: 8,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 9,
    projectedRank: 8
  },
  {
    userId: "user-9",
    nickname: "Zizou_Vb",
    avatarSeed: "zizou-seed",
    avatarStyle: "avataaars" as any,
    avatarConfig: { seed: "zizou-seed", style: "avataaars", backgroundColor: "f43f5e" },
    totalPoints: 8,
    exactScores: 1,
    correctResults: 5,
    predictions: 11,
    rank: 9,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 8,
    projectedRank: 9
  },
  {
    userId: "user-10",
    nickname: "Cris7",
    avatarSeed: "cris-seed",
    avatarStyle: "adventurer",
    avatarConfig: { seed: "cris-seed", style: "adventurer", backgroundColor: "3b82f6" },
    totalPoints: 7,
    exactScores: 0,
    correctResults: 7,
    predictions: 12,
    rank: 10,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 7,
    projectedRank: 10
  },
  {
    userId: "user-11",
    nickname: "Chicharito",
    avatarSeed: "chicha-seed",
    avatarStyle: "pixel-art",
    avatarConfig: { seed: "chicha-seed", style: "pixelArt", backgroundColor: "ea580c" },
    totalPoints: 4,
    exactScores: 0,
    correctResults: 4,
    predictions: 10,
    rank: 11,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 4,
    projectedRank: 11
  },
  {
    userId: "user-12",
    nickname: "ElProfe",
    avatarSeed: "profe-seed",
    avatarStyle: "bottts",
    avatarConfig: { seed: "profe-seed", style: "bottts", backgroundColor: "4b5563" },
    totalPoints: 1,
    exactScores: 0,
    correctResults: 1,
    predictions: 6,
    rank: 12,
    lastUpdated: getRelativeTimestamp(0),
    projectedPoints: 1,
    projectedRank: 12
  }
];

// 5. Mock User Predictions Map
// Setup some predictions for current user to show in UI
export const mockUserPredictions = new Map<string, PredictionDocument>([
  [
    "match-1", // RMA vs BAY (Final Score: 3-1) -> User predicted 3-1 -> EXACT (+3 pts)
    {
      id: "mock-user-tatan_match-1",
      userId: "mock-user-tatan",
      matchId: "match-1",
      tournamentId: "champions-2026",
      predictedHome: 3,
      predictedAway: 1,
      predictedHome2: null,
      predictedAway2: null,
      submittedAt: getRelativeTimestamp(-3),
      updatedAt: getRelativeTimestamp(-3),
      pointsEarned1: 3,
      pointsEarned2: null,
      pointsEarned: 3,
      evaluatedAt: getRelativeTimestamp(-2),
      homeTeamName: "Real Madrid",
      awayTeamName: "Bayern Munich",
      kickoffTime: getRelativeTimestamp(-2),
      userNickname: "Tatan_Crack",
      userAvatarStyle: "adventurer",
      userAvatarSeed: "tatan-seed",
      userAvatarConfig: { seed: "tatan-seed", style: "adventurer", backgroundColor: "7c3aed" }
    }
  ],
  [
    "match-2", // PSG vs MCI (Final Score: 1-2) -> User predicted 1-1 -> WRONG (0 pts)
    {
      id: "mock-user-tatan_match-2",
      userId: "mock-user-tatan",
      matchId: "match-2",
      tournamentId: "champions-2026",
      predictedHome: 1,
      predictedAway: 1,
      predictedHome2: null,
      predictedAway2: null,
      submittedAt: getRelativeTimestamp(-2),
      updatedAt: getRelativeTimestamp(-2),
      pointsEarned1: 0,
      pointsEarned2: null,
      pointsEarned: 0,
      evaluatedAt: getRelativeTimestamp(-1),
      homeTeamName: "Paris Saint Germain",
      awayTeamName: "Manchester City",
      kickoffTime: getRelativeTimestamp(-1),
      userNickname: "Tatan_Crack",
      userAvatarStyle: "adventurer",
      userAvatarSeed: "tatan-seed",
      userAvatarConfig: { seed: "tatan-seed", style: "adventurer", backgroundColor: "7c3aed" }
    }
  ],
  [
    "match-3", // BAR vs LIV (Live Score: 2-2) -> User predicted 2-1 and double chance 2-2
    {
      id: "mock-user-tatan_match-3",
      userId: "mock-user-tatan",
      matchId: "match-3",
      tournamentId: "champions-2026",
      predictedHome: 2,
      predictedAway: 1,
      predictedHome2: 2,
      predictedAway2: 2,
      submittedAt: getRelativeTimestamp(-1),
      updatedAt: getRelativeTimestamp(-1),
      pointsEarned1: null,
      pointsEarned2: null,
      pointsEarned: null,
      evaluatedAt: null,
      homeTeamName: "Barcelona",
      awayTeamName: "Liverpool",
      kickoffTime: getRelativeTimestamp(0, -1),
      userNickname: "Tatan_Crack",
      userAvatarStyle: "adventurer",
      userAvatarSeed: "tatan-seed",
      userAvatarConfig: { seed: "tatan-seed", style: "adventurer", backgroundColor: "7c3aed" }
    }
  ],
  [
    "match-4", // ARS vs INT (Starts in 15m - Closed) -> User predicted 1-0
    {
      id: "mock-user-tatan_match-4",
      userId: "mock-user-tatan",
      matchId: "match-4",
      tournamentId: "champions-2026",
      predictedHome: 1,
      predictedAway: 0,
      predictedHome2: null,
      predictedAway2: null,
      submittedAt: getRelativeTimestamp(-1),
      updatedAt: getRelativeTimestamp(-1),
      pointsEarned1: null,
      pointsEarned2: null,
      pointsEarned: null,
      evaluatedAt: null,
      homeTeamName: "Arsenal",
      awayTeamName: "Inter Milan",
      kickoffTime: getRelativeTimestamp(0, 0.25),
      userNickname: "Tatan_Crack",
      userAvatarStyle: "adventurer",
      userAvatarSeed: "tatan-seed",
      userAvatarConfig: { seed: "tatan-seed", style: "adventurer", backgroundColor: "7c3aed" }
    }
  ]
]);

// 6. Mock Group Predictions Map (For "Ver pronósticos del grupo" transparancy view)
export const mockGroupPredictions: Record<string, PredictionDocument[]> = {
  "match-1": mockLeaderboard.map((user, idx) => {
    // Generate simulated predictions for Real Madrid vs Bayern (3-1)
    const exact = idx % 3 === 0; // index 0, 3, 6, 9 predicted 3-1 exact
    const correctRes = idx % 3 === 1; // index 1, 4, 7, 10 predicted result home-win (e.g. 2-1 or 2-0)
    
    const predH = exact ? 3 : (correctRes ? 2 : 1);
    const predA = exact ? 1 : (correctRes ? 0 : 2);
    
    const pts = exact ? 3 : (correctRes ? 1 : 0);

    return {
      id: `${user.userId}_match-1`,
      userId: user.userId,
      matchId: "match-1",
      tournamentId: "champions-2026",
      predictedHome: predH,
      predictedAway: predA,
      predictedHome2: null,
      predictedAway2: null,
      submittedAt: getRelativeTimestamp(-3),
      updatedAt: getRelativeTimestamp(-3),
      pointsEarned1: pts,
      pointsEarned2: null,
      pointsEarned: pts,
      evaluatedAt: getRelativeTimestamp(-2),
      homeTeamName: "Real Madrid",
      awayTeamName: "Bayern Munich",
      kickoffTime: getRelativeTimestamp(-2),
      userNickname: user.nickname,
      userAvatarStyle: user.avatarStyle,
      userAvatarSeed: user.avatarSeed,
      userAvatarConfig: user.avatarConfig
    };
  }),
  "match-2": mockLeaderboard.map((user, idx) => {
    // Generate simulated predictions for PSG vs Man City (1-2)
    const exact = idx % 4 === 1; // index 1, 5, 9 predicted 1-2 exact
    const correctRes = idx % 4 === 2; // index 2, 6, 10 predicted away win (e.g. 0-2 or 1-3)
    
    const predH = exact ? 1 : (correctRes ? 0 : 2);
    const predA = exact ? 2 : (correctRes ? 2 : 0);
    
    const pts = exact ? 3 : (correctRes ? 1 : 0);

    return {
      id: `${user.userId}_match-2`,
      userId: user.userId,
      matchId: "match-2",
      tournamentId: "champions-2026",
      predictedHome: predH,
      predictedAway: predA,
      predictedHome2: null,
      predictedAway2: null,
      submittedAt: getRelativeTimestamp(-2),
      updatedAt: getRelativeTimestamp(-2),
      pointsEarned1: pts,
      pointsEarned2: null,
      pointsEarned: pts,
      evaluatedAt: getRelativeTimestamp(-1),
      homeTeamName: "Paris Saint Germain",
      awayTeamName: "Manchester City",
      kickoffTime: getRelativeTimestamp(-1),
      userNickname: user.nickname,
      userAvatarStyle: user.avatarStyle,
      userAvatarSeed: user.avatarSeed,
      userAvatarConfig: user.avatarConfig
    };
  }),
  "match-3": mockLeaderboard.map((user, idx) => {
    // Barcelona vs Liverpool (LIVE 2-2)
    // No points evaluated yet, but predictions are locked/visible
    const draw = idx % 2 === 0;
    return {
      id: `${user.userId}_match-3`,
      userId: user.userId,
      matchId: "match-3",
      tournamentId: "champions-2026",
      predictedHome: draw ? 2 : 3,
      predictedAway: draw ? 2 : 1,
      predictedHome2: draw ? null : 1,
      predictedAway2: draw ? null : 1,
      submittedAt: getRelativeTimestamp(-1),
      updatedAt: getRelativeTimestamp(-1),
      pointsEarned1: null,
      pointsEarned2: null,
      pointsEarned: null,
      evaluatedAt: null,
      homeTeamName: "Barcelona",
      awayTeamName: "Liverpool",
      kickoffTime: getRelativeTimestamp(0, -1),
      userNickname: user.nickname,
      userAvatarStyle: user.avatarStyle,
      userAvatarSeed: user.avatarSeed,
      userAvatarConfig: user.avatarConfig
    };
  }),
  "match-4": mockLeaderboard.map((user, idx) => {
    // Arsenal vs Inter Milan (NS - Closed/Starts in 15m)
    // Predictions are locked/visible, no score yet
    const homeWin = idx % 3 === 0;
    const draw = idx % 3 === 1;
    return {
      id: `${user.userId}_match-4`,
      userId: user.userId,
      matchId: "match-4",
      tournamentId: "champions-2026",
      predictedHome: homeWin ? 2 : (draw ? 1 : 0),
      predictedAway: homeWin ? 1 : (draw ? 1 : 1),
      predictedHome2: null,
      predictedAway2: null,
      submittedAt: getRelativeTimestamp(-1),
      updatedAt: getRelativeTimestamp(-1),
      pointsEarned1: null,
      pointsEarned2: null,
      pointsEarned: null,
      evaluatedAt: null,
      homeTeamName: "Arsenal",
      awayTeamName: "Inter Milan",
      kickoffTime: getRelativeTimestamp(0, 0.25),
      userNickname: user.nickname,
      userAvatarStyle: user.avatarStyle,
      userAvatarSeed: user.avatarSeed,
      userAvatarConfig: user.avatarConfig
    };
  })
};
