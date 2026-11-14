import { describe, expect, it } from 'vitest';
import { balance, levels } from '../content';
import { barnCapacity, barnUpgradeCost, sellItems, upgradeBarn } from './barn';
import { addXp, levelUpCoins, unlocksAt, xpToNext } from './economy';
import type { GameEvent } from './result';
import { newGame } from './testing';

describe('levels', () => {
  it('follows the level table, then keeps growing', () => {
    expect(xpToNext(1)).toBe(levels.xpToNext[0]);
    const tableEnd = levels.xpToNext.length;
    const last = levels.xpToNext[tableEnd - 1] ?? 0;
    expect(xpToNext(tableEnd)).toBe(last);
    expect(xpToNext(tableEnd + 1)).toBe(last + levels.extraXpPerLevelAfterTable);
    expect(xpToNext(tableEnd + 3)).toBe(last + 3 * levels.extraXpPerLevelAfterTable);
  });

  it('levels up, pays the reward and reports unlocks', () => {
    const state = newGame();
    const coinsBefore = state.coins;
    const events: GameEvent[] = [];
    addXp(state, xpToNext(1) + 3, events);
    expect(state.level).toBe(2);
    expect(state.xp).toBe(3);
    expect(state.coins).toBe(coinsBefore + levelUpCoins(2));
    expect(events).toEqual([{ type: 'level-up', level: 2, coins: levelUpCoins(2), unlocks: unlocksAt(2) }]);
  });

  it('can gain several levels at once', () => {
    const state = newGame();
    const events: GameEvent[] = [];
    addXp(state, xpToNext(1) + xpToNext(2) + xpToNext(3), events);
    expect(state.level).toBe(4);
    expect(state.xp).toBe(0);
    expect(events.map((event) => event.type)).toEqual(['level-up', 'level-up', 'level-up']);
  });

  it('reports everything that unlocks at a level', () => {
    expect(unlocksAt(3)).toEqual([
      { kind: 'crop', id: 'strawberry' },
      { kind: 'deco', id: 'lantern' },
      { kind: 'patch', id: 'east' },
    ]);
    expect(unlocksAt(4)).toEqual(
      expect.arrayContaining([
        { kind: 'maker', id: 'oven' },
        { kind: 'recipe', id: 'oat-bread' },
        { kind: 'recipe', id: 'carrot-muffin' },
      ]),
    );
    expect(unlocksAt(2)).toEqual(expect.arrayContaining([{ kind: 'pen', id: 'coop' }]));
  });
});

describe('barn', () => {
  it('sells items for their value', () => {
    const state = newGame();
    state.items = { carrot: 5 };
    const coinsBefore = state.coins;
    expect(sellItems(state, 'carrot', 2).ok).toBe(true);
    expect(state.items.carrot).toBe(3);
    expect(state.coins).toBe(coinsBefore + 6);
    expect(sellItems(state, 'carrot', 4)).toEqual({ ok: false, reason: 'not-enough-items' });
    expect(sellItems(state, 'carrot', 0)).toEqual({ ok: false, reason: 'not-found' });
    sellItems(state, 'carrot', 3);
    expect(state.items).toEqual({});
  });

  it('upgrades with coins up to the top level', () => {
    const state = newGame();
    const firstCost = barnUpgradeCost(state);
    expect(firstCost).toBe(balance.barn.upgradeCosts[0]);
    state.coins = (firstCost ?? 0) - 1;
    expect(upgradeBarn(state)).toEqual({ ok: false, reason: 'not-enough-coins' });
    expect(state.barnLevel).toBe(1);

    state.coins = 1_000_000;
    while (barnUpgradeCost(state) !== null) expect(upgradeBarn(state).ok).toBe(true);
    expect(state.barnLevel).toBe(balance.barn.capacities.length);
    expect(barnCapacity(state)).toBe(balance.barn.capacities.at(-1));
    expect(upgradeBarn(state)).toEqual({ ok: false, reason: 'max-level' });
  });
});
