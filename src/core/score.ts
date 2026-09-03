const POINTS_PER_MATCHED_BUBBLE = 10;
const MATCH_BONUS_PER_EXTRA_BUBBLE = 5;
const POINTS_PER_DROPPED_BUBBLE = 20;
const COMBO_MULTIPLIER_STEP = 0.5;
const MAX_COMBO_MULTIPLIER = 4;

export interface ShotScoreInput {
  matchedCount: number;
  droppedCount: number;
  /** How many consecutive shots in a row (including this one) have scored a match. */
  comboStreak: number;
}

export interface ShotScoreResult {
  matchScore: number;
  dropScore: number;
  totalScore: number;
  comboMultiplier: number;
}

function comboMultiplierFor(streak: number): number {
  if (streak <= 1) return 1;
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + (streak - 1) * COMBO_MULTIPLIER_STEP);
}

/**
 * Scores a single shot's outcome. Matched bubbles score a flat amount plus a
 * bonus for every bubble beyond the minimum-3 match; dropped (detached)
 * bubbles score their own bonus. Both are scaled by a combo multiplier that
 * grows with consecutive scoring shots.
 */
export function scoreShot(input: ShotScoreInput): ShotScoreResult {
  const comboMultiplier = comboMultiplierFor(input.comboStreak);

  const matchBase =
    input.matchedCount > 0
      ? input.matchedCount * POINTS_PER_MATCHED_BUBBLE +
        Math.max(0, input.matchedCount - 3) * MATCH_BONUS_PER_EXTRA_BUBBLE
      : 0;
  const dropBase = input.droppedCount * POINTS_PER_DROPPED_BUBBLE;

  const matchScore = Math.round(matchBase * comboMultiplier);
  const dropScore = Math.round(dropBase * comboMultiplier);

  return {
    matchScore,
    dropScore,
    totalScore: matchScore + dropScore,
    comboMultiplier,
  };
}
