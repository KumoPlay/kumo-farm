import { crops, decorations, levels, makers, patches, pens, recipes } from '../content';
import type { GameEvent, Unlock } from './result';
import type { GameState } from './state';

/** XP needed to finish the given level. */
export function xpToNext(level: number): number {
  const table = levels.xpToNext;
  const last = table[table.length - 1] ?? 100;
  if (level <= table.length) return table[Math.max(level, 1) - 1] ?? last;
  return last + (level - table.length) * levels.extraXpPerLevelAfterTable;
}

/** What becomes available exactly at this level. */
export function unlocksAt(level: number): Unlock[] {
  const at = <T extends { id: string; unlockLevel: number }>(list: T[], kind: Unlock['kind']): Unlock[] =>
    list.filter((entry) => entry.unlockLevel === level).map((entry) => ({ kind, id: entry.id }));
  return [
    ...at(crops, 'crop'),
    ...at(pens, 'pen'),
    ...at(makers, 'maker'),
    ...at(recipes, 'recipe'),
    ...at(decorations, 'deco'),
    ...at(patches.filter((patch) => patch.cost > 0), 'patch'),
  ];
}

export function levelUpCoins(level: number): number {
  return levels.rewardCoins.base + levels.rewardCoins.perLevel * level;
}

/** Adds XP and handles any level-ups, pushing a 'level-up' event for each. */
export function addXp(state: GameState, amount: number, events: GameEvent[]): void {
  if (!(amount > 0)) return;
  state.xp += amount;
  while (state.xp >= xpToNext(state.level)) {
    state.xp -= xpToNext(state.level);
    state.level += 1;
    const coins = levelUpCoins(state.level);
    state.coins += coins;
    state.stats.coinsEarned += coins;
    events.push({ type: 'level-up', level: state.level, coins, unlocks: unlocksAt(state.level) });
  }
}
