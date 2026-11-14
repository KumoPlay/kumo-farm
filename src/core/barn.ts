import { balance, getItem } from '../content';
import { fail, ok, type Result } from './result';
import type { GameState } from './state';

export function barnCapacity(state: GameState): number {
  const { capacities } = balance.barn;
  const index = Math.min(Math.max(state.barnLevel, 1), capacities.length) - 1;
  return capacities[index] ?? 0;
}

export function barnUsed(state: GameState): number {
  return Object.values(state.items).reduce((sum, count) => sum + count, 0);
}

export function barnFree(state: GameState): number {
  return Math.max(0, barnCapacity(state) - barnUsed(state));
}

export function itemCount(state: GameState, item: string): number {
  return state.items[item] ?? 0;
}

export function addItems(state: GameState, item: string, qty: number): void {
  state.items[item] = itemCount(state, item) + qty;
}

export function removeItems(state: GameState, item: string, qty: number): void {
  const left = itemCount(state, item) - qty;
  if (left > 0) state.items[item] = left;
  else delete state.items[item];
}

/** Coins for the next barn upgrade, or null when the barn is at its top level. */
export function barnUpgradeCost(state: GameState): number | null {
  if (state.barnLevel >= balance.barn.capacities.length) return null;
  return balance.barn.upgradeCosts[state.barnLevel - 1] ?? null;
}

export function upgradeBarn(state: GameState): Result {
  const cost = barnUpgradeCost(state);
  if (cost === null) return fail('max-level');
  if (state.coins < cost) return fail('not-enough-coins');
  state.coins -= cost;
  state.barnLevel += 1;
  return ok([{ type: 'barn-upgraded', level: state.barnLevel, capacity: barnCapacity(state) }]);
}

/** Sells items straight from the barn for their plain value. */
export function sellItems(state: GameState, item: string, qty: number): Result {
  const def = getItem(item);
  if (!def || !Number.isInteger(qty) || qty <= 0) return fail('not-found');
  if (itemCount(state, item) < qty) return fail('not-enough-items');
  const coins = def.value * qty;
  removeItems(state, item, qty);
  state.coins += coins;
  state.stats.coinsEarned += coins;
  return ok([{ type: 'sold', item, qty, coins }]);
}
