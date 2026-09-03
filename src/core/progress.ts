import { SaveManager } from './save';

export const SAVE_VERSION = 1;
const SAVE_KEY = 'bubble-bloom-save';

export interface LevelResult {
  stars: number;
  bestScore: number;
}

export interface GameSettings {
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

export interface SaveData {
  version: number;
  unlockedLevel: number;
  completed: Record<number, LevelResult>;
  settings: GameSettings;
}

function defaultSaveData(): SaveData {
  return {
    version: SAVE_VERSION,
    unlockedLevel: 1,
    completed: {},
    settings: { sfxVolume: 1, musicVolume: 0.7, muted: false },
  };
}

/** Migrates older save shapes forward. Currently a no-op since v1 is the first version. */
function migrate(data: SaveData): SaveData {
  if (data.version === SAVE_VERSION) return data;
  return { ...defaultSaveData(), ...data, version: SAVE_VERSION };
}

/**
 * Owns the player's persistent progress: unlocked level, per-level stars and
 * best score, and settings. Writes go through SaveManager (localStorage with
 * an in-memory fallback) and only happen at meaningful checkpoints, never on
 * a per-frame basis.
 */
export class ProgressManager {
  private data: SaveData;

  constructor(private readonly saveManager: SaveManager = new SaveManager()) {
    const loaded = this.saveManager.getJSON<SaveData>(SAVE_KEY);
    this.data = loaded ? migrate(loaded) : defaultSaveData();
  }

  private persist(): void {
    this.saveManager.setJSON(SAVE_KEY, this.data);
  }

  get unlockedLevel(): number {
    return this.data.unlockedLevel;
  }

  isLevelUnlocked(level: number): boolean {
    return level <= this.data.unlockedLevel;
  }

  getLevelResult(level: number): LevelResult | null {
    return this.data.completed[level] ?? null;
  }

  get settings(): GameSettings {
    return this.data.settings;
  }

  updateSettings(partial: Partial<GameSettings>): void {
    this.data.settings = { ...this.data.settings, ...partial };
    this.persist();
  }

  /** Records a level result and unlocks the next level. Persists immediately (a meaningful checkpoint). */
  completeLevel(level: number, score: number, stars: number): void {
    const existing = this.data.completed[level];
    this.data.completed[level] = {
      stars: Math.max(stars, existing?.stars ?? 0),
      bestScore: Math.max(score, existing?.bestScore ?? 0),
    };
    if (level + 1 > this.data.unlockedLevel) {
      this.data.unlockedLevel = level + 1;
    }
    this.persist();
  }

  reset(): void {
    this.data = defaultSaveData();
    this.persist();
  }
}
