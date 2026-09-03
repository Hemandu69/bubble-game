import type { DifficultyTier } from './difficulty';

export type MilestoneOverride = Partial<
  Pick<DifficultyTier, 'colorCount' | 'startRows' | 'colorCohesion' | 'shotsPerNewRow' | 'dangerRow'>
> & { label?: string };

/**
 * Handcrafted tuning for notable levels, layered on top of the level's
 * regular difficulty-tier parameters rather than replacing the whole
 * generator. This keeps 1000 levels data-driven while still letting
 * milestone levels feel distinct.
 */
const MILESTONES: Record<number, MilestoneOverride> = {
  1: { colorCount: 3, startRows: 3, colorCohesion: 0.9, shotsPerNewRow: 999, label: 'First Bloom' },
  10: { label: 'Beginner Finale' },
  20: { label: 'Easy Finale' },
  30: { label: 'Normal Finale' },
  50: { label: 'Medium Finale' },
  100: { label: 'Hard Century' },
  200: { label: 'Very Hard Gauntlet' },
  300: { label: 'Extreme Trial' },
  400: { label: 'Expert Challenge' },
  500: { label: 'Master Milestone' },
  700: { label: 'Insane Reckoning' },
  900: { label: 'God Level Ascent' },
  999: { label: 'Edge of Nightmare' },
  1000: {
    colorCount: 7,
    startRows: 12,
    colorCohesion: 0.08,
    shotsPerNewRow: 5,
    dangerRow: 9,
    label: 'Final Boss',
  },
};

export function getMilestoneOverride(level: number): MilestoneOverride | undefined {
  return MILESTONES[level];
}

export function isMilestoneLevel(level: number): boolean {
  return level in MILESTONES;
}
