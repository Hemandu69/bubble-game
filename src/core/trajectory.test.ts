import { describe, expect, it } from 'vitest';
import { HexGrid } from './hexGrid';
import { simulateTrajectory } from './trajectory';

describe('simulateTrajectory', () => {
  const bounds = { left: 0, right: 400, top: 0 };
  const bubbleRadius = 20;

  it('travels straight up and stops at the ceiling when nothing blocks it', () => {
    const grid = new HexGrid({ cols: 10, rows: 10, cellSize: bubbleRadius * 2 });
    const result = simulateTrajectory({
      origin: { x: 200, y: 800 },
      direction: { x: 0, y: -1 },
      grid,
      bubbleRadius,
      bounds,
    });
    expect(result.hitType).toBe('ceiling');
    expect(result.impactPoint.y).toBeCloseTo(bounds.top + bubbleRadius, 5);
    expect(result.impactPoint.x).toBeCloseTo(200, 5);
  });

  it('reflects off the right wall (angle of incidence equals angle of reflection)', () => {
    const grid = new HexGrid({ cols: 10, rows: 10, cellSize: bubbleRadius * 2 });
    const result = simulateTrajectory({
      origin: { x: 350, y: 800 },
      direction: { x: 1, y: -1 },
      grid,
      bubbleRadius,
      bounds,
    });
    expect(result.segments.length).toBeGreaterThanOrEqual(2);
    const first = result.segments[0];
    const second = result.segments[1];
    const dir1x = first.to.x - first.from.x;
    const dir2x = second.to.x - second.from.x;
    // x direction should flip sign after bouncing off the right wall
    expect(Math.sign(dir1x)).toBe(1);
    expect(Math.sign(dir2x)).toBe(-1);
    // the bounce point must be at the wall boundary
    expect(first.to.x).toBeCloseTo(bounds.right - bubbleRadius, 5);
  });

  it('reflects off the left wall symmetrically to the right wall', () => {
    const grid = new HexGrid({ cols: 10, rows: 10, cellSize: bubbleRadius * 2 });
    const result = simulateTrajectory({
      origin: { x: 50, y: 800 },
      direction: { x: -1, y: -1 },
      grid,
      bubbleRadius,
      bounds,
    });
    expect(result.segments[0].to.x).toBeCloseTo(bounds.left + bubbleRadius, 5);
  });

  it('stops when it hits an existing bubble and reports the hit cell', () => {
    const cellSize = bubbleRadius * 2;
    const grid = new HexGrid({ cols: 10, rows: 10, cellSize });
    grid.setBubble({ id: 1, row: 3, col: 4, color: 'red' });
    const target = grid.gridToWorld(3, 4);

    const result = simulateTrajectory({
      origin: { x: target.x, y: 800 },
      direction: { x: 0, y: -1 },
      grid,
      bubbleRadius,
      bounds,
    });

    expect(result.hitType).toBe('bubble');
    expect(result.hitCell).toEqual({ row: 3, col: 4 });
    expect(result.snapCell).not.toBeNull();
  });

  it('produces a snap cell adjacent to the hit bubble', () => {
    const cellSize = bubbleRadius * 2;
    const grid = new HexGrid({ cols: 10, rows: 10, cellSize });
    grid.setBubble({ id: 1, row: 3, col: 4, color: 'red' });
    const target = grid.gridToWorld(3, 4);

    const result = simulateTrajectory({
      origin: { x: target.x, y: 800 },
      direction: { x: 0, y: -1 },
      grid,
      bubbleRadius,
      bounds,
    });

    const neighbors = grid.getNeighborCoords(3, 4);
    const isNeighbor = neighbors.some(
      (n) => n.row === result.snapCell!.row && n.col === result.snapCell!.col,
    );
    expect(isNeighbor).toBe(true);
  });
});
