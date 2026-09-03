import { describe, expect, it } from 'vitest';
import { getDifficultyTier } from './difficulty';

describe('getDifficultyTier', () => {
  const cases: [number, string][] = [
    [1, 'BEGINNER'],
    [10, 'BEGINNER'],
    [11, 'EASY'],
    [20, 'EASY'],
    [21, 'NORMAL'],
    [30, 'NORMAL'],
    [31, 'MEDIUM'],
    [50, 'MEDIUM'],
    [51, 'HARD'],
    [100, 'HARD'],
    [101, 'VERY_HARD'],
    [200, 'VERY_HARD'],
    [201, 'EXTREME'],
    [300, 'EXTREME'],
    [301, 'EXPERT'],
    [400, 'EXPERT'],
    [401, 'MASTER'],
    [500, 'MASTER'],
    [501, 'INSANE'],
    [700, 'INSANE'],
    [701, 'GOD_LEVEL'],
    [900, 'GOD_LEVEL'],
    [901, 'NIGHTMARE'],
    [999, 'NIGHTMARE'],
    [1000, 'FINAL_BOSS'],
  ];

  it.each(cases)('level %i maps to tier %s', (level, tierName) => {
    expect(getDifficultyTier(level).name).toBe(tierName);
  });

  it('clamps out-of-range levels into the nearest valid tier', () => {
    expect(getDifficultyTier(0).name).toBe('BEGINNER');
    expect(getDifficultyTier(-5).name).toBe('BEGINNER');
    expect(getDifficultyTier(5000).name).toBe('FINAL_BOSS');
  });

  it('difficulty generally increases with level (colors and rows never decrease)', () => {
    const levels = [1, 11, 21, 31, 51, 101, 201, 301, 401, 501, 701, 901, 1000];
    let prevColors = 0;
    let prevRows = 0;
    for (const level of levels) {
      const tier = getDifficultyTier(level);
      expect(tier.colorCount).toBeGreaterThanOrEqual(prevColors);
      expect(tier.startRows).toBeGreaterThanOrEqual(prevRows);
      prevColors = tier.colorCount;
      prevRows = tier.startRows;
    }
  });
});
