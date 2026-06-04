// lib/scoring/calculator.ts

export type ScoreResult = 3 | 1 | 0;
type Outcome = "home" | "away" | "draw";

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
}

export interface Prediction {
  predictedHome: number;
  predictedAway: number;
}

function getOutcome(homeGoals: number, awayGoals: number): Outcome {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

/**
 * Evaluates a user prediction against the actual match result.
 *
 * @returns 3 — exact score match
 * @returns 1 — correct outcome (win/draw) but wrong score
 * @returns 0 — complete miss
 */
export function calculateScore(
  prediction: Prediction,
  result: MatchResult
): ScoreResult {
  // 3 points: exact score
  if (
    prediction.predictedHome === result.homeGoals &&
    prediction.predictedAway === result.awayGoals
  ) {
    return 3;
  }

  // 1 point: correct outcome
  const actualOutcome = getOutcome(result.homeGoals, result.awayGoals);
  const predictedOutcome = getOutcome(
    prediction.predictedHome,
    prediction.predictedAway
  );

  if (actualOutcome === predictedOutcome) {
    return 1;
  }

  // 0 points: complete miss
  return 0;
}

/**
 * Returns a projected score based on live/partial match data.
 * Used for real-time leaderboard projections while match is in progress.
 */
export function projectScore(
  prediction: Prediction,
  liveScore: { home: number | null; away: number | null }
): ScoreResult | null {
  if (liveScore.home === null || liveScore.away === null) return null;

  return calculateScore(prediction, {
    homeGoals: liveScore.home,
    awayGoals: liveScore.away,
  });
}

// ─── Test vectors (illustrative) ─────────────────────────────────────────────
// calculateScore({ predictedHome: 2, predictedAway: 1 }, { homeGoals: 2, awayGoals: 1 }) → 3
// calculateScore({ predictedHome: 2, predictedAway: 1 }, { homeGoals: 1, awayGoals: 0 }) → 1  (home wins both)
// calculateScore({ predictedHome: 1, predictedAway: 1 }, { homeGoals: 2, awayGoals: 2 }) → 1  (draw both)
// calculateScore({ predictedHome: 2, predictedAway: 0 }, { homeGoals: 0, awayGoals: 1 }) → 0  (opposite outcomes)
