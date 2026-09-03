import { HexGrid } from './hexGrid';
import { findConnectedSameColor } from './matching';

/** True if the grid already contains at least one connected group of 3+ same-color bubbles. */
export function hasImmediateMatch(grid: HexGrid, minSize = 3): boolean {
  const visited = new Set<string>();
  for (const bubble of grid.getAllBubbles()) {
    const key = `${bubble.row},${bubble.col}`;
    if (visited.has(key)) continue;
    const group = findConnectedSameColor(grid, bubble);
    for (const c of group) visited.add(`${c.row},${c.col}`);
    if (group.length >= minSize) return true;
  }
  return false;
}

export interface LevelValidationResult {
  valid: boolean;
  reasons: string[];
}

/** Structural sanity checks for a freshly generated level layout. */
export function validateLevel(grid: HexGrid, requireImmediateMatch: boolean): LevelValidationResult {
  const reasons: string[] = [];

  if (grid.bubbleCount === 0) {
    reasons.push('Grid has no bubbles.');
  }

  if (requireImmediateMatch && !hasImmediateMatch(grid)) {
    reasons.push('No immediate match available.');
  }

  return { valid: reasons.length === 0, reasons };
}
