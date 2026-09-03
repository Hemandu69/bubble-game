import type { HexGrid } from './hexGrid';
import type { BubbleColor } from './types';
import { randomChoice, type RandomFn } from './rng';

/**
 * Pushes the whole formation down by two rows and fills two fresh rows in at
 * the ceiling. Rows are shifted in pairs (not one at a time) because the
 * staggered hex grid alternates its column offset by row parity: shifting by
 * an even number of rows preserves every bubble's column index and its
 * exact world-space alignment, whereas a single-row shift would require
 * remapping columns across a parity change. Returns false without mutating
 * the grid if any existing bubble would be pushed past the grid's row
 * capacity, signalling the caller to treat this as an overflow loss instead.
 */
export function insertCeilingRows(grid: HexGrid, colors: readonly BubbleColor[], random: RandomFn): boolean {
  const existing = grid.getAllBubbles();
  for (const bubble of existing) {
    if (bubble.row + 2 >= grid.rows) return false;
  }

  grid.clear();
  for (const bubble of existing) {
    grid.setBubble({ ...bubble, row: bubble.row + 2 });
  }

  for (let row = 0; row < 2; row++) {
    const cols = grid.colsInRow(row);
    for (let col = 0; col < cols; col++) {
      grid.setBubble({ id: row * 1000 + col, row, col, color: randomChoice(random, colors) });
    }
  }

  return true;
}
