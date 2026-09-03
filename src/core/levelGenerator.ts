import { BUBBLE_COLORS, type BubbleColor } from './types';
import { HexGrid } from './hexGrid';
import { getDifficultyTier, type DifficultyTier } from './difficulty';
import { getMilestoneOverride } from './milestones';
import { createLevelRandom, randomChoice, type RandomFn } from './rng';
import { hasImmediateMatch } from './levelValidator';

export const BOARD_COLS = 10;
export const BOARD_ROWS = 16;

export interface LevelConfig {
  level: number;
  tierName: DifficultyTier['name'];
  label?: string;
  cols: number;
  rows: number;
  colors: BubbleColor[];
  startRows: number;
  dangerRow: number;
  shotsPerNewRow: number;
}

export interface GeneratedLevel {
  config: LevelConfig;
  bubbles: { row: number; col: number; color: BubbleColor }[];
}

export const DEFAULT_SALT = 'bubble-bloom-v1';

function pickLevelColors(random: RandomFn, count: number): BubbleColor[] {
  const pool = [...BUBBLE_COLORS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function buildConfig(level: number, colors: BubbleColor[], cols: number): LevelConfig {
  const tier = getDifficultyTier(level);
  const override = getMilestoneOverride(level);

  return {
    level,
    tierName: tier.name,
    label: override?.label,
    cols,
    rows: BOARD_ROWS,
    colors,
    startRows: override?.startRows ?? tier.startRows,
    dangerRow: override?.dangerRow ?? tier.dangerRow,
    shotsPerNewRow: override?.shotsPerNewRow ?? tier.shotsPerNewRow,
  };
}

function fillGrid(grid: HexGrid, config: LevelConfig, random: RandomFn, cohesion: number): void {
  for (let row = 0; row < config.startRows; row++) {
    let lastColor: BubbleColor | null = null;
    const cols = grid.colsInRow(row);
    for (let col = 0; col < cols; col++) {
      let color: BubbleColor;
      if (lastColor && random() < cohesion) {
        color = lastColor;
      } else {
        color = randomChoice(random, config.colors);
      }
      grid.setBubble({ id: row * 1000 + col, row, col, color });
      lastColor = color;
    }
  }
}

/**
 * Deterministically generates a level's initial bubble layout. The same
 * level number always produces the same layout for a given salt and column
 * count, so "level 42" is always the same puzzle on a given device class
 * without storing 1000 handcrafted files. `cols` lets the board be wider on
 * desktop layouts; it's folded into the seed so each column count gets its
 * own independent-but-reproducible layout rather than a stretched copy of
 * the narrower one.
 */
export function generateLevel(level: number, salt: string = DEFAULT_SALT, cols: number = BOARD_COLS): GeneratedLevel {
  const tier = getDifficultyTier(level);
  const override = getMilestoneOverride(level);
  const cohesion = override?.colorCohesion ?? tier.colorCohesion;
  const colorCount = override?.colorCount ?? tier.colorCount;

  const requireImmediateMatch = tier.minLevel <= 30 || level === 1;
  const maxAttempts = 6;
  const seedSalt = `${salt}:cols${cols}`;

  let config = buildConfig(level, BUBBLE_COLORS.slice(0, colorCount), cols);
  let grid = new HexGrid({ cols: config.cols, rows: config.rows, cellSize: 1 });
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const random = createLevelRandom(`${seedSalt}#${attempt}`, level);
    const colors = pickLevelColors(random, colorCount);
    config = buildConfig(level, colors, cols);
    grid = new HexGrid({ cols: config.cols, rows: config.rows, cellSize: 1 });
    fillGrid(grid, config, random, cohesion);
    if (!requireImmediateMatch || hasImmediateMatch(grid)) break;
  }

  const bubbles = grid.getAllBubbles().map((b) => ({ row: b.row, col: b.col, color: b.color }));
  return { config, bubbles };
}
