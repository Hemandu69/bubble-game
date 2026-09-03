import { describe, expect, it } from 'vitest';
import { scoreShot } from './score';

describe('scoreShot', () => {
  it('scores nothing for a miss', () => {
    const result = scoreShot({ matchedCount: 0, droppedCount: 0, comboStreak: 0 });
    expect(result.totalScore).toBe(0);
  });

  it('scores a minimum 3-match at the base rate with no combo bonus', () => {
    const result = scoreShot({ matchedCount: 3, droppedCount: 0, comboStreak: 1 });
    expect(result.matchScore).toBe(30);
    expect(result.dropScore).toBe(0);
    expect(result.comboMultiplier).toBe(1);
  });

  it('awards a bonus for each bubble beyond the minimum match size', () => {
    const three = scoreShot({ matchedCount: 3, droppedCount: 0, comboStreak: 1 });
    const five = scoreShot({ matchedCount: 5, droppedCount: 0, comboStreak: 1 });
    // 2 extra bubbles: +2*10 base, +2*5 bonus = +30
    expect(five.matchScore - three.matchScore).toBe(30);
  });

  it('scores dropped bubbles independently of matched bubbles', () => {
    const result = scoreShot({ matchedCount: 0, droppedCount: 4, comboStreak: 1 });
    expect(result.matchScore).toBe(0);
    expect(result.dropScore).toBe(80);
    expect(result.totalScore).toBe(80);
  });

  it('increases the combo multiplier with a longer streak, capped at the maximum', () => {
    const streak1 = scoreShot({ matchedCount: 3, droppedCount: 0, comboStreak: 1 });
    const streak2 = scoreShot({ matchedCount: 3, droppedCount: 0, comboStreak: 2 });
    const streak3 = scoreShot({ matchedCount: 3, droppedCount: 0, comboStreak: 3 });
    expect(streak2.comboMultiplier).toBeGreaterThan(streak1.comboMultiplier);
    expect(streak3.comboMultiplier).toBeGreaterThan(streak2.comboMultiplier);

    const farOut = scoreShot({ matchedCount: 3, droppedCount: 0, comboStreak: 999 });
    expect(farOut.comboMultiplier).toBeLessThanOrEqual(4);
  });

  it('applies the combo multiplier to both match and drop score', () => {
    const base = scoreShot({ matchedCount: 3, droppedCount: 2, comboStreak: 1 });
    const combo = scoreShot({ matchedCount: 3, droppedCount: 2, comboStreak: 3 });
    expect(combo.matchScore).toBeGreaterThan(base.matchScore);
    expect(combo.dropScore).toBeGreaterThan(base.dropScore);
  });
});
