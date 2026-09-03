/**
 * Deterministic PRNG utilities. The same seed always produces the same
 * sequence, which is what lets level generation be reproducible.
 */

export type RandomFn = () => number;

/** mulberry32: small, fast, good-enough distribution for gameplay content. */
export function mulberry32(seed: number): RandomFn {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** xmur3: hashes an arbitrary string into a 32-bit seed for mulberry32. */
export function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Derives a deterministic RNG from a salt + level number combination. */
export function createLevelRandom(salt: string, levelNumber: number): RandomFn {
  const seed = xmur3(`${salt}:${levelNumber}`);
  return mulberry32(seed);
}

/** Picks a random integer in [min, max] inclusive using the given RNG. */
export function randomInt(random: RandomFn, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/** Picks a random element from an array using the given RNG. */
export function randomChoice<T>(random: RandomFn, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}
