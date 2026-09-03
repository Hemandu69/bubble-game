import { describe, expect, it } from 'vitest';
import { SaveManager } from './save';
import { ProgressManager } from './progress';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

class ThrowingStorage implements Storage {
  length = 0;
  clear(): void {
    throw new Error('disabled');
  }
  getItem(): string | null {
    throw new Error('disabled');
  }
  key(): string | null {
    throw new Error('disabled');
  }
  removeItem(): void {
    throw new Error('disabled');
  }
  setItem(): void {
    throw new Error('disabled');
  }
}

describe('SaveManager', () => {
  it('round-trips JSON through a working storage backend', () => {
    const save = new SaveManager(new MemoryStorage());
    save.setJSON('key', { a: 1, b: 'two' });
    expect(save.getJSON<{ a: number; b: string }>('key')).toEqual({ a: 1, b: 'two' });
  });

  it('returns null for missing keys', () => {
    const save = new SaveManager(new MemoryStorage());
    expect(save.getJSON('missing')).toBeNull();
  });

  it('falls back to in-memory storage without throwing when storage is unavailable', () => {
    const save = new SaveManager(new ThrowingStorage());
    expect(save.isPersistent).toBe(false);
    expect(() => save.setJSON('key', { ok: true })).not.toThrow();
    expect(save.getJSON('key')).toEqual({ ok: true });
  });

  it('does not crash when storage is undefined', () => {
    const save = new SaveManager(undefined);
    expect(() => save.setJSON('key', 'value')).not.toThrow();
    expect(save.getJSON('key')).toBe('value');
  });
});

describe('ProgressManager', () => {
  it('starts with only level 1 unlocked and no completions', () => {
    const progress = new ProgressManager(new SaveManager(new MemoryStorage()));
    expect(progress.unlockedLevel).toBe(1);
    expect(progress.isLevelUnlocked(1)).toBe(true);
    expect(progress.isLevelUnlocked(2)).toBe(false);
    expect(progress.getLevelResult(1)).toBeNull();
  });

  it('unlocks the next level and records score/stars on completion', () => {
    const progress = new ProgressManager(new SaveManager(new MemoryStorage()));
    progress.completeLevel(1, 1500, 3);
    expect(progress.isLevelUnlocked(2)).toBe(true);
    expect(progress.getLevelResult(1)).toEqual({ stars: 3, bestScore: 1500 });
  });

  it('keeps the best score and stars across repeated completions', () => {
    const progress = new ProgressManager(new SaveManager(new MemoryStorage()));
    progress.completeLevel(1, 1000, 1);
    progress.completeLevel(1, 500, 2);
    expect(progress.getLevelResult(1)).toEqual({ stars: 2, bestScore: 1000 });
  });

  it('persists across a fresh ProgressManager reading the same storage', () => {
    const storage = new MemoryStorage();
    const first = new ProgressManager(new SaveManager(storage));
    first.completeLevel(3, 800, 2);

    const second = new ProgressManager(new SaveManager(storage));
    expect(second.unlockedLevel).toBe(4);
    expect(second.getLevelResult(3)).toEqual({ stars: 2, bestScore: 800 });
  });

  it('updates and persists settings', () => {
    const storage = new MemoryStorage();
    const first = new ProgressManager(new SaveManager(storage));
    first.updateSettings({ muted: true, sfxVolume: 0.2 });

    const second = new ProgressManager(new SaveManager(storage));
    expect(second.settings.muted).toBe(true);
    expect(second.settings.sfxVolume).toBe(0.2);
    expect(second.settings.musicVolume).toBe(0.7); // untouched default preserved
  });

  it('reset restores defaults', () => {
    const storage = new MemoryStorage();
    const progress = new ProgressManager(new SaveManager(storage));
    progress.completeLevel(1, 100, 1);
    progress.reset();
    expect(progress.unlockedLevel).toBe(1);
    expect(progress.getLevelResult(1)).toBeNull();
  });

  it('never throws even if storage is completely unavailable', () => {
    const progress = new ProgressManager(new SaveManager(new ThrowingStorage()));
    expect(() => progress.completeLevel(1, 100, 1)).not.toThrow();
    expect(progress.isLevelUnlocked(2)).toBe(true);
  });
});
