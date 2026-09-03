import { describe, expect, it } from 'vitest';
import { generateLevel } from './levelGenerator';
import { HexGrid } from './hexGrid';
import { hasImmediateMatch } from './levelValidator';

describe('generateLevel', () => {
  it('is deterministic: the same level number always produces the same layout', () => {
    const a = generateLevel(42);
    const b = generateLevel(42);
    expect(a).toEqual(b);
  });

  it('produces different layouts for different levels', () => {
    const a = generateLevel(1);
    const b = generateLevel(2);
    expect(a.bubbles).not.toEqual(b.bubbles);
  });

  it('is deterministic across different salts, but salts change the outcome', () => {
    const a = generateLevel(15, 'salt-a');
    const b = generateLevel(15, 'salt-a');
    const c = generateLevel(15, 'salt-b');
    expect(a).toEqual(b);
    expect(a.bubbles).not.toEqual(c.bubbles);
  });

  it('level 1 is easy: few colors, generous starting rows, and an immediate match', () => {
    const level1 = generateLevel(1);
    expect(level1.config.colors.length).toBeLessThanOrEqual(3);
    expect(level1.config.startRows).toBeLessThanOrEqual(4);

    const grid = new HexGrid({ cols: level1.config.cols, rows: level1.config.rows, cellSize: 1 });
    for (const b of level1.bubbles) grid.setBubble({ id: b.row * 1000 + b.col, row: b.row, col: b.col, color: b.color });
    expect(hasImmediateMatch(grid)).toBe(true);
  });

  it('only uses colors from the configured palette', () => {
    const level = generateLevel(75);
    const allowed = new Set(level.config.colors);
    for (const b of level.bubbles) {
      expect(allowed.has(b.color)).toBe(true);
    }
  });

  it('every generated bubble occupies a structurally valid cell', () => {
    const level = generateLevel(250);
    const grid = new HexGrid({ cols: level.config.cols, rows: level.config.rows, cellSize: 1 });
    for (const b of level.bubbles) {
      expect(grid.isValidCell(b.row, b.col)).toBe(true);
    }
  });

  it('fills exactly startRows rows from the top', () => {
    const level = generateLevel(120);
    const rowsWithBubbles = new Set(level.bubbles.map((b) => b.row));
    expect(rowsWithBubbles.size).toBe(level.config.startRows);
    for (const row of rowsWithBubbles) {
      expect(row).toBeLessThan(level.config.startRows);
    }
  });

  it('level 1000 is flagged as the Final Boss', () => {
    const level1000 = generateLevel(1000);
    expect(level1000.config.label).toBe('Final Boss');
    expect(level1000.config.tierName).toBe('FINAL_BOSS');
  });
});
