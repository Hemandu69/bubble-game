import { describe, expect, it } from 'vitest';
import { HexGrid } from './hexGrid';

describe('HexGrid', () => {
  it('reports fewer columns on odd rows', () => {
    const grid = new HexGrid({ cols: 10, rows: 5, cellSize: 40 });
    expect(grid.colsInRow(0)).toBe(10);
    expect(grid.colsInRow(1)).toBe(9);
    expect(grid.colsInRow(2)).toBe(10);
  });

  it('updateLayout rescales/repositions without touching occupancy', () => {
    const grid = new HexGrid({ cols: 10, rows: 5, cellSize: 40 });
    grid.setBubble({ id: 1, row: 2, col: 3, color: 'red' });

    grid.updateLayout(80, 100, 200);

    expect(grid.cellSize).toBe(80);
    expect(grid.isOccupied(2, 3)).toBe(true);
    expect(grid.getBubble(2, 3)?.color).toBe('red');
    const p = grid.gridToWorld(0, 0);
    expect(p.x).toBeCloseTo(100 + 40, 5); // originX + cellSize/2
    expect(p.y).toBeCloseTo(200 + 40, 5);
  });

  it('rejects out-of-range and negative coordinates', () => {
    const grid = new HexGrid({ cols: 10, rows: 5, cellSize: 40 });
    expect(grid.isValidCell(0, 0)).toBe(true);
    expect(grid.isValidCell(0, 9)).toBe(true);
    expect(grid.isValidCell(0, 10)).toBe(false);
    expect(grid.isValidCell(1, 9)).toBe(false); // odd row only has 9 cols (0-8)
    expect(grid.isValidCell(-1, 0)).toBe(false);
    expect(grid.isValidCell(5, 0)).toBe(false);
  });

  it('places, reads back, and removes bubbles', () => {
    const grid = new HexGrid({ cols: 10, rows: 5, cellSize: 40 });
    expect(grid.isOccupied(2, 3)).toBe(false);
    grid.setBubble({ id: 1, row: 2, col: 3, color: 'red' });
    expect(grid.isOccupied(2, 3)).toBe(true);
    expect(grid.getBubble(2, 3)?.color).toBe('red');
    expect(grid.bubbleCount).toBe(1);

    const removed = grid.removeBubble(2, 3);
    expect(removed?.color).toBe('red');
    expect(grid.isOccupied(2, 3)).toBe(false);
    expect(grid.bubbleCount).toBe(0);
  });

  it('throws when placing a bubble at an invalid cell', () => {
    const grid = new HexGrid({ cols: 10, rows: 5, cellSize: 40 });
    expect(() => grid.setBubble({ id: 1, row: 1, col: 9, color: 'red' })).toThrow();
  });

  it('gives every interior even-row cell 6 neighbors', () => {
    const grid = new HexGrid({ cols: 10, rows: 6, cellSize: 40 });
    const neighbors = grid.getNeighborCoords(2, 4);
    expect(neighbors).toHaveLength(6);
  });

  it('gives every interior odd-row cell 6 neighbors', () => {
    const grid = new HexGrid({ cols: 10, rows: 6, cellSize: 40 });
    const neighbors = grid.getNeighborCoords(3, 4);
    expect(neighbors).toHaveLength(6);
  });

  it('gives corner cells fewer neighbors', () => {
    const grid = new HexGrid({ cols: 10, rows: 6, cellSize: 40 });
    const neighbors = grid.getNeighborCoords(0, 0);
    expect(neighbors.length).toBeLessThan(6);
    for (const n of neighbors) {
      expect(grid.isValidCell(n.row, n.col)).toBe(true);
    }
  });

  it('neighbor relation is symmetric: if A is a neighbor of B, B is a neighbor of A', () => {
    const grid = new HexGrid({ cols: 10, rows: 8, cellSize: 40 });
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < grid.colsInRow(row); col++) {
        for (const n of grid.getNeighborCoords(row, col)) {
          const back = grid.getNeighborCoords(n.row, n.col);
          const found = back.some((b) => b.row === row && b.col === col);
          expect(found).toBe(true);
        }
      }
    }
  });

  it('all neighbor world distances are approximately one cell size apart (proper hex packing)', () => {
    const cellSize = 40;
    const grid = new HexGrid({ cols: 10, rows: 8, cellSize });
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < grid.colsInRow(row); col++) {
        const p1 = grid.gridToWorld(row, col);
        for (const n of grid.getNeighborCoords(row, col)) {
          const p2 = grid.gridToWorld(n.row, n.col);
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          expect(dist).toBeGreaterThan(cellSize - 1);
          expect(dist).toBeLessThan(cellSize + 1);
        }
      }
    }
  });

  it('worldToGrid finds the nearest cell to a gridToWorld round trip', () => {
    const grid = new HexGrid({ cols: 10, rows: 8, cellSize: 40 });
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < grid.colsInRow(row); col++) {
        const p = grid.gridToWorld(row, col);
        const back = grid.worldToGrid(p.x, p.y);
        expect(back).toEqual({ row, col });
      }
    }
  });

  it('findSnapCell picks the empty neighbor closest to the approach point', () => {
    const grid = new HexGrid({ cols: 10, rows: 8, cellSize: 40 });
    grid.setBubble({ id: 1, row: 3, col: 4, color: 'blue' });
    const target = grid.getEmptyNeighbors(3, 4)[0];
    const approach = grid.gridToWorld(target.row, target.col);
    const snap = grid.findSnapCell({ row: 3, col: 4 }, approach);
    expect(snap).toEqual(target);
  });

  it('findSnapCell returns null when the hit cell has no empty neighbors', () => {
    const grid = new HexGrid({ cols: 3, rows: 3, cellSize: 40 });
    // Fill everything around (1,1) if it's an interior cell for this tiny grid.
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < grid.colsInRow(row); col++) {
        grid.setBubble({ id: row * 10 + col, row, col, color: 'red' });
      }
    }
    const snap = grid.findSnapCell({ row: 1, col: 0 }, { x: 0, y: 0 });
    expect(snap).toBeNull();
  });
});
