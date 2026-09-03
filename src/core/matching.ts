import type { HexGrid } from './hexGrid';
import type { GridCoord } from './types';

/**
 * Breadth-first flood fill over bubbles of the same color, connected only
 * through valid neighboring grid cells (never by raw spatial proximity).
 */
export function findConnectedSameColor(grid: HexGrid, start: GridCoord): GridCoord[] {
  const startBubble = grid.getBubble(start.row, start.col);
  if (!startBubble) return [];

  const visited = new Set<string>();
  const queue: GridCoord[] = [start];
  const result: GridCoord[] = [];
  visited.add(`${start.row},${start.col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    for (const neighbor of grid.getNeighborCoords(current.row, current.col)) {
      const key = `${neighbor.row},${neighbor.col}`;
      if (visited.has(key)) continue;
      const bubble = grid.getBubble(neighbor.row, neighbor.col);
      if (bubble && bubble.color === startBubble.color) {
        visited.add(key);
        queue.push(neighbor);
      }
    }
  }

  return result;
}

/**
 * Returns the connected same-color group containing `start` if it meets the
 * minimum match size, otherwise null. Bubbles are only ever popped through
 * this connectivity check, never by mere physical closeness.
 */
export function findMatchGroup(
  grid: HexGrid,
  start: GridCoord,
  minSize = 3,
): GridCoord[] | null {
  const group = findConnectedSameColor(grid, start);
  return group.length >= minSize ? group : null;
}
