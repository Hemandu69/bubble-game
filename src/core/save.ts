/**
 * Thin wrapper around localStorage that never throws: if storage is
 * unavailable (disabled, private browsing, quota exceeded) it silently
 * falls back to an in-memory map for the current session so the game keeps
 * working, it just won't persist across reloads.
 */
export class SaveManager {
  private memoryFallback = new Map<string, string>();
  private storageAvailable: boolean;

  constructor(private readonly storage: Storage | undefined = safeGetLocalStorage()) {
    this.storageAvailable = this.probe();
  }

  private probe(): boolean {
    if (!this.storage) return false;
    try {
      const testKey = '__bubble_bloom_probe__';
      this.storage.setItem(testKey, '1');
      this.storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  get isPersistent(): boolean {
    return this.storageAvailable;
  }

  getItem(key: string): string | null {
    if (this.storageAvailable) {
      try {
        return this.storage!.getItem(key);
      } catch {
        this.storageAvailable = false;
      }
    }
    return this.memoryFallback.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.storageAvailable) {
      try {
        this.storage!.setItem(key, value);
        return;
      } catch {
        this.storageAvailable = false;
      }
    }
    this.memoryFallback.set(key, value);
  }

  getJSON<T>(key: string): T | null {
    const raw = this.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setJSON<T>(key: string, value: T): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch {
      // Circular/unserializable payloads are a programming error, not a
      // runtime condition we need to survive silently beyond not crashing.
    }
  }
}

function safeGetLocalStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
