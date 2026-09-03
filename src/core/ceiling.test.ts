import { describe, expect, it } from 'vitest';
import { HexGrid } from './hexGrid';
import { insertCeilingRows } from './ceiling';
import { mulberry32 } from './rng';

describe('insertCeilingRows', () => {
  it('shifts every existing bubble down by exactly two rows, preserving its column', () => {
    const grid = new HexGrid({ cols: 10, rows: 16, cellSize: 40 });
    grid.setBubble({ id: 1, row: 2, col: 3, color: 'red' });
    grid.setBubble({ id: 2, row: 3, col: 2, color: 'blue' });

    const ok = insertCeilingRows(grid, ['red', 'blue'], mulberry32(1));
    expect(ok).toBe(true);
    expect(grid.getBubble(4, 3)?.color).toBe('red');
    expect(grid.getBubble(5, 2)?.color).toBe('blue');
    expect(grid.isOccupied(2, 3)).toBe(false);
  });

  it('preserves world-space x position across the shift (no horizontal jog)', () => {
    const grid = new HexGrid({ cols: 10, rows: 16, cellSize: 40 });
    const before = grid.gridToWorld(2, 3);
    grid.setBubble({ id: 1, row: 2, col: 3, color: 'red' });
    insertCeilingRows(grid, ['red'], mulberry32(1));
    const after = grid.gridToWorld(4, 3);
    expect(after.x).toBeCloseTo(before.x, 5);
  });

  it('fills exactly the top two rows with fresh bubbles from the given palette', () => {
    const grid = new HexGrid({ cols: 10, rows: 16, cellSize: 40 });
    insertCeilingRows(grid, ['red', 'green'], mulberry32(7));
    for (let col = 0; col < grid.colsInRow(0); col++) {
      expect(grid.isOccupied(0, col)).toBe(true);
      expect(['red', 'green']).toContain(grid.getBubble(0, col)!.color);
    }
    for (let col = 0; col < grid.colsInRow(1); col++) {
      expect(grid.isOccupied(1, col)).toBe(true);
    }
  });

  it('refuses to shift (and leaves the grid untouched) if a bubble would overflow capacity', () => {
    const grid = new HexGrid({ cols: 10, rows: 5, cellSize: 40 });
    grid.setBubble({ id: 1, row: 3, col: 0, color: 'red' }); // row 3 + 2 = 5, out of a 5-row grid (0..4)
    const snapshotBefore = grid.getAllBubbles();

    const ok = insertCeilingRows(grid, ['red'], mulberry32(1));

    expect(ok).toBe(false);
    expect(grid.getAllBubbles()).toEqual(snapshotBefore);
  });

  it('is deterministic for a given RNG seed', () => {
    const gridA = new HexGrid({ cols: 10, rows: 16, cellSize: 40 });
    const gridB = new HexGrid({ cols: 10, rows: 16, cellSize: 40 });
    insertCeilingRows(gridA, ['red', 'blue', 'green'], mulberry32(42));
    insertCeilingRows(gridB, ['red', 'blue', 'green'], mulberry32(42));
    expect(gridA.getAllBubbles()).toEqual(gridB.getAllBubbles());
  });
});
