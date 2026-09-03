export type DifficultyTierName =
  | 'BEGINNER'
  | 'EASY'
  | 'NORMAL'
  | 'MEDIUM'
  | 'HARD'
  | 'VERY_HARD'
  | 'EXTREME'
  | 'EXPERT'
  | 'MASTER'
  | 'INSANE'
  | 'GOD_LEVEL'
  | 'NIGHTMARE'
  | 'FINAL_BOSS';

export interface DifficultyTier {
  name: DifficultyTierName;
  minLevel: number;
  maxLevel: number;
  /** How many distinct bubble colors are in play. */
  colorCount: number;
  /** Rows filled with bubbles at the start of the level. */
  startRows: number;
  /** Probability [0,1] a new bubble repeats the color of its row-neighbor, biasing toward large same-color clusters. Higher = easier. */
  colorCohesion: number;
  /** How many shots the player gets before a fresh row descends from the ceiling. */
  shotsPerNewRow: number;
  /** Row index (from the top) that ends the game once occupied. */
  dangerRow: number;
}

const TIERS: DifficultyTier[] = [
  { name: 'BEGINNER', minLevel: 1, maxLevel: 10, colorCount: 3, startRows: 4, colorCohesion: 0.75, shotsPerNewRow: 999, dangerRow: 13 },
  { name: 'EASY', minLevel: 11, maxLevel: 20, colorCount: 4, startRows: 5, colorCohesion: 0.65, shotsPerNewRow: 999, dangerRow: 13 },
  { name: 'NORMAL', minLevel: 21, maxLevel: 30, colorCount: 4, startRows: 6, colorCohesion: 0.55, shotsPerNewRow: 20, dangerRow: 13 },
  { name: 'MEDIUM', minLevel: 31, maxLevel: 50, colorCount: 5, startRows: 6, colorCohesion: 0.5, shotsPerNewRow: 18, dangerRow: 13 },
  { name: 'HARD', minLevel: 51, maxLevel: 100, colorCount: 5, startRows: 7, colorCohesion: 0.42, shotsPerNewRow: 16, dangerRow: 12 },
  { name: 'VERY_HARD', minLevel: 101, maxLevel: 200, colorCount: 6, startRows: 7, colorCohesion: 0.36, shotsPerNewRow: 14, dangerRow: 12 },
  { name: 'EXTREME', minLevel: 201, maxLevel: 300, colorCount: 6, startRows: 8, colorCohesion: 0.3, shotsPerNewRow: 12, dangerRow: 12 },
  { name: 'EXPERT', minLevel: 301, maxLevel: 400, colorCount: 7, startRows: 8, colorCohesion: 0.26, shotsPerNewRow: 11, dangerRow: 11 },
  { name: 'MASTER', minLevel: 401, maxLevel: 500, colorCount: 7, startRows: 9, colorCohesion: 0.22, shotsPerNewRow: 10, dangerRow: 11 },
  { name: 'INSANE', minLevel: 501, maxLevel: 700, colorCount: 7, startRows: 9, colorCohesion: 0.18, shotsPerNewRow: 9, dangerRow: 11 },
  { name: 'GOD_LEVEL', minLevel: 701, maxLevel: 900, colorCount: 7, startRows: 10, colorCohesion: 0.15, shotsPerNewRow: 8, dangerRow: 10 },
  { name: 'NIGHTMARE', minLevel: 901, maxLevel: 999, colorCount: 7, startRows: 10, colorCohesion: 0.12, shotsPerNewRow: 7, dangerRow: 10 },
  { name: 'FINAL_BOSS', minLevel: 1000, maxLevel: 1000, colorCount: 7, startRows: 11, colorCohesion: 0.1, shotsPerNewRow: 6, dangerRow: 10 },
];

export function getDifficultyTier(level: number): DifficultyTier {
  const clamped = Math.max(1, Math.min(1000, Math.round(level)));
  const tier = TIERS.find((t) => clamped >= t.minLevel && clamped <= t.maxLevel);
  return tier ?? TIERS[TIERS.length - 1];
}

export function getAllDifficultyTiers(): readonly DifficultyTier[] {
  return TIERS;
}
