/**
 * Deterministic seeded RNG: xmur3 string hash -> sfc32 generator.
 * Pure 32-bit integer math, so results are identical in Node and browsers.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Integer in [min, max] inclusive. */
  range(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  chance(p: number): boolean;
  /** Derive an independent child stream (e.g. per attempt) without disturbing this one. */
  fork(label: string): Rng;
}

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const h = xmur3(seed);
  const gen = sfc32(h(), h(), h(), h());
  // Warm up to decorrelate similar seeds.
  for (let i = 0; i < 15; i++) gen();

  const rng: Rng = {
    next: gen,
    int(maxExclusive) {
      if (maxExclusive <= 0) throw new Error('int(): maxExclusive must be > 0');
      return Math.floor(gen() * maxExclusive);
    },
    range(min, max) {
      return min + rng.int(max - min + 1);
    },
    pick(items) {
      if (items.length === 0) throw new Error('pick(): empty array');
      return items[rng.int(items.length)] as (typeof items)[number];
    },
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    chance(p) {
      return gen() < p;
    },
    fork(label) {
      return createRng(`${seed}/${label}/${Math.floor(gen() * 4294967296)}`);
    },
  };
  return rng;
}

/** Random human-friendly seed for the "new level" button (non-deterministic by design). */
export function randomSeed(): string {
  return Math.floor(Math.random() * 1e9).toString(36);
}
