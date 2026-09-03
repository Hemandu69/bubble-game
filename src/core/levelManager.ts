import { HexGrid } from './hexGrid';
import { generateLevel, BOARD_COLS, type GeneratedLevel } from './levelGenerator';

const MAX_LEVEL = 1000;

/**
 * Thin orchestration layer over the level generator: resolves a level
 * number (and board width) to its deterministic layout and builds a
 * ready-to-play HexGrid at the requested cell size, caching lookups per
 * level+column-count pair.
 */
export class LevelManager {
  private cache = new Map<string, GeneratedLevel>();

  constructor(private readonly salt: string = 'bubble-bloom-v1') {}

  static get maxLevel(): number {
    return MAX_LEVEL;
  }

  getLevelData(level: number, cols: number = BOARD_COLS): GeneratedLevel {
    const clamped = Math.max(1, Math.min(MAX_LEVEL, level));
    const key = `${clamped}:${cols}`;
    let data = this.cache.get(key);
    if (!data) {
      data = generateLevel(clamped, this.salt, cols);
      this.cache.set(key, data);
    }
    return data;
  }

  buildGrid(level: number, cellSize: number, originX: number, originY: number, cols: number = BOARD_COLS): HexGrid {
    const data = this.getLevelData(level, cols);
    const grid = new HexGrid({
      cols: data.config.cols,
      rows: data.config.rows,
      cellSize,
      originX,
      originY,
    });
    for (const b of data.bubbles) {
      grid.setBubble({ id: b.row * 1000 + b.col, row: b.row, col: b.col, color: b.color });
    }
    return grid;
  }
}
