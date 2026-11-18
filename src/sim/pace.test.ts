import { describe, expect, it } from 'vitest';
import { LAST_UNLOCK_LEVEL, longestWait, profiles, report, simulate, type SimResult } from './player';

/**
 * Balance guard rails. A pretend player plays the real rules on a few visit
 * schedules (see player.ts). These tests fail when a change to the content
 * files makes the game stall or race ahead.
 *
 * To see the full table: npm run simulate
 */
const DAYS = 90;
const results = profiles.map((profile) => simulate(profile, DAYS));
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

if (env.SIM_REPORT) {
  console.log(`\nKumo Farm pace check, ${DAYS} days per player:\n\n${results.map(report).join('\n\n')}\n`);
}

const reached = (result: SimResult, level: number) => result.levels.find((entry) => entry.level === level);
const byName = (name: string): SimResult => {
  const result = results.find((entry) => entry.profile === name);
  if (!result) throw new Error(`no profile called ${name}`);
  return result;
};
const each = results.map((result) => [result.profile, result] as const);

describe('game pace', () => {
  it.each(each)('%s: level 2 in the first visit, level 3 on the first day', (_, result) => {
    expect(reached(result, 2)?.playedMinutes ?? Infinity).toBeLessThanOrEqual(3);
    expect(reached(result, 3)?.day).toBe(0);
  });

  it.each(each)('%s: unlocks everything, never waiting more than a week for the next level', (_, result) => {
    expect(reached(result, LAST_UNLOCK_LEVEL)).toBeDefined();
    expect(longestWait(result, LAST_UNLOCK_LEVEL)).toBeLessThanOrEqual(7);
  });

  it('gives a few-quick-visits-a-day player one to three weeks of new things', () => {
    // Counting the first day as day 1, like the report does.
    const day = (reached(byName('4 quick visits a day'), LAST_UNLOCK_LEVEL)?.day ?? Infinity) + 1;
    expect(day).toBeGreaterThanOrEqual(7);
    expect(day).toBeLessThanOrEqual(21);
  });

  it('lets every player buy every animal home and building', () => {
    for (const result of results) {
      const kinds = new Set(result.bought.map((entry) => entry.def));
      for (const def of ['coop', 'meadow', 'oven', 'creamery']) {
        expect(kinds.has(def), `${result.profile}: ${def}`).toBe(true);
      }
    }
  });
});
