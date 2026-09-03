import { describe, expect, it } from 'vitest';
import { HexGrid } from './hexGrid';
import { findConnectedSameColor, findMatchGroup } from './matching';

function makeGrid(): HexGrid {
  return new HexGrid({ cols: 10, rows: 8, cellSize: 40 });
}

describe('matching', () => {
  it('finds no group for an empty cell', () => {
    const grid = makeGrid();
    expect(findConnectedSameColor(grid, { row: 0, col: 0 })).toEqual([]);
  });

  it('connects only same-colored neighbors, not merely nearby bubbles', () => {
    const grid = makeGrid();
    grid.setBubble({ id: 1, row: 0, col: 0, color: 'red' });
    grid.setBubble({ id: 2, row: 0, col: 1, color: 'red' });
    grid.setBubble({ id: 3, row: 0, col: 2, color: 'blue' });
    grid.setBubble({ id: 4, row: 0, col: 3, color: 'red' });

    const group = findConnectedSameColor(grid, { row: 0, col: 0 });
    expect(group).toHaveLength(2);
    expect(group.some((c) => c.col === 3)).toBe(false); // blocked by the blue bubble
  });

  it('does not connect same-color bubbles that are not grid-adjacent', () => {
    const grid = makeGrid();
    grid.setBubble({ id: 1, row: 0, col: 0, color: 'red' });
    grid.setBubble({ id: 2, row: 5, col: 5, color: 'red' });

    const group = findConnectedSameColor(grid, { row: 0, col: 0 });
    expect(group).toHaveLength(1);
  });

  it('findMatchGroup returns null below the minimum size', () => {
    const grid = makeGrid();
    grid.setBubble({ id: 1, row: 0, col: 0, color: 'red' });
    grid.setBubble({ id: 2, row: 0, col: 1, color: 'red' });
    expect(findMatchGroup(grid, { row: 0, col: 0 })).toBeNull();
  });

  it('findMatchGroup returns the group once it reaches the minimum size', () => {
    const grid = makeGrid();
    grid.setBubble({ id: 1, row: 0, col: 0, color: 'red' });
    grid.setBubble({ id: 2, row: 0, col: 1, color: 'red' });
    grid.setBubble({ id: 3, row: 0, col: 2, color: 'red' });
    const group = findMatchGroup(grid, { row: 0, col: 0 });
    expect(group).toHaveLength(3);
  });

  it('follows connectivity across a bent chain via hex neighbors', () => {
    const grid = makeGrid();
    // row0 col0 -> row1 col0 (a valid even-row neighbor) -> row1 col1
    grid.setBubble({ id: 1, row: 0, col: 0, color: 'green' });
    grid.setBubble({ id: 2, row: 1, col: 0, color: 'green' });
    grid.setBubble({ id: 3, row: 2, col: 0, color: 'green' });
    const group = findConnectedSameColor(grid, { row: 0, col: 0 });
    expect(group).toHaveLength(3);
  });
});
