import type { HexGrid } from './hexGrid';
import type { GridCoord } from './types';

/**
 * Finds every bubble that is not connected, through any chain of occupied
 * neighbors, back to an anchor bubble on the ceiling row (row 0). These are
 * the bubbles that should detach and fall after a match removes their
 * support.
 */
export function findFloatingBubbles(grid: HexGrid): GridCoord[] {
  const connected = new Set<string>();
  const queue: GridCoord[] = [];

  const ceilingCols = grid.colsInRow(0);
  for (let col = 0; col < ceilingCols; col++) {
    if (grid.isOccupied(0, col)) {
      const key = `0,${col}`;
      connected.add(key);
      queue.push({ row: 0, col });
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of grid.getNeighborCoords(current.row, current.col)) {
      const key = `${neighbor.row},${neighbor.col}`;
      if (connected.has(key)) continue;
      if (grid.isOccupied(neighbor.row, neighbor.col)) {
        connected.add(key);
        queue.push(neighbor);
      }
    }
  }

  const floating: GridCoord[] = [];
  for (const bubble of grid.getAllBubbles()) {
    const key = `${bubble.row},${bubble.col}`;
    if (!connected.has(key)) {
      floating.push({ row: bubble.row, col: bubble.col });
    }
  }
  return floating;
}
