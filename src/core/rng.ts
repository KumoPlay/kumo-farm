import type { GameState } from './state';

/**
 * A small seeded random number generator (mulberry32). The seed lives in the
 * save, so the game logic stays predictable in tests.
 * Returns a number from 0 (included) to 1 (not included).
 */
export function nextRandom(state: GameState): number {
  state.seed = (state.seed + 0x6d2b79f5) >>> 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A whole number from min to max, both included. */
export function randomInt(state: GameState, min: number, max: number): number {
  return min + Math.floor(nextRandom(state) * (max - min + 1));
}

/** Picks one entry; entries with a bigger weight are picked more often. */
export function pickWeighted<T>(state: GameState, entries: T[], weight: (entry: T) => number): T | undefined {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, weight(entry)), 0);
  if (total <= 0) return entries[0];
  let roll = nextRandom(state) * total;
  for (const entry of entries) {
    roll -= Math.max(0, weight(entry));
    if (roll < 0) return entry;
  }
  return entries[entries.length - 1];
}
