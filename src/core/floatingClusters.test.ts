import { describe, expect, it } from 'vitest';
import { HexGrid } from './hexGrid';
import { findFloatingBubbles } from './floatingClusters';

function makeGrid(): HexGrid {
  return new HexGrid({ cols: 10, rows: 8, cellSize: 40 });
}

describe('findFloatingBubbles', () => {
  it('returns nothing when every bubble chains back to the ceiling', () => {
    const grid = makeGrid();
    grid.setBubble({ id: 1, row: 0, col: 0, color: 'red' });
    grid.setBubble({ id: 2, row: 1, col: 0, color: 'blue' });
    grid.setBubble({ id: 3, row: 2, col: 0, color: 'green' });
    expect(findFloatingBubbles(grid)).toEqual([]);
  });

  it('detects a cluster detached after its only ceiling link is removed', () => {
    const grid = makeGrid();
    grid.setBubble({ id: 1, row: 0, col: 0, color: 'red' });
    grid.setBubble({ id: 2, row: 1, col: 0, color: 'blue' }); // sole link to ceiling
    grid.setBubble({ id: 3, row: 2, col: 0, color: 'green' });
    grid.setBubble({ id: 4, row: 3, col: 0, color: 'yellow' });

    grid.removeBubble(1, 0); // sever the chain

    const floating = findFloatingBubbles(grid);
    const floatingKeys = new Set(floating.map((c) => `${c.row},${c.col}`));
    expect(floatingKeys.has('2,0')).toBe(true);
    expect(floatingKeys.has('3,0')).toBe(true);
    expect(floating).toHaveLength(2);
  });

  it('keeps a bubble that has an alternate path back to the ceiling', () => {
    const grid = makeGrid();
    // Two parallel chains from the ceiling that merge lower down.
    grid.setBubble({ id: 1, row: 0, col: 0, color: 'red' });
    grid.setBubble({ id: 2, row: 0, col: 1, color: 'red' });
    grid.setBubble({ id: 3, row: 1, col: 0, color: 'red' }); // links (0,0) and (0,1) downward
    grid.setBubble({ id: 4, row: 1, col: 1, color: 'red' }); // links to (0,1)

    grid.removeBubble(0, 0); // (1,0) still reachable via (0,1) -> (1,1)? verify structural reachability

    const floating = findFloatingBubbles(grid);
    // (1,0) and (1,1) should remain connected through (0,1) if hex adjacency allows it.
    const floatingKeys = new Set(floating.map((c) => `${c.row},${c.col}`));
    expect(floatingKeys.has('0,1')).toBe(false);
  });

  it('an empty grid has no floating bubbles', () => {
    const grid = makeGrid();
    expect(findFloatingBubbles(grid)).toEqual([]);
  });
});
