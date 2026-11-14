import { describe, expect, it } from 'vitest';
import { getPen } from '../content';
import { HOUR, MIN } from '../content/time';
import { animalStatus, buyAnimal, collectFromPen, feedAnimals, nextAnimalCost, penSummary } from './animals';
import { barnCapacity, itemCount } from './barn';
import { advanceClock } from './clock';
import { buyPen, richGame, START } from './testing';

describe('animals', () => {
  it('arrive hungry with their home, and wait until they are fed', () => {
    const state = richGame(2);
    const coop = buyPen(state, 'coop');
    expect(coop.animals).toEqual([{ fedAt: null }]);
    advanceClock(state, START + 48 * HOUR);
    expect(penSummary(state, coop)).toEqual({ hungry: 1, busy: 0, ready: 0, nextReadyMs: 0 });
    expect(collectFromPen(state, coop.id)).toEqual({ ok: false, reason: 'not-ready' });
  });

  it('eat feed from the barn and make their product in real time', () => {
    const state = richGame(2);
    const coop = buyPen(state, 'coop');
    expect(feedAnimals(state, coop.id)).toEqual({ ok: false, reason: 'not-enough-items' });

    state.items = { oat: 5 };
    expect(feedAnimals(state, coop.id).ok).toBe(true);
    expect(itemCount(state, 'oat')).toBe(3);
    expect(feedAnimals(state, coop.id)).toEqual({ ok: false, reason: 'empty' });
    expect(penSummary(state, coop)).toMatchObject({ busy: 1, nextReadyMs: 5 * MIN });

    advanceClock(state, START + 2 * MIN);
    expect(penSummary(state, coop)).toMatchObject({ busy: 1, nextReadyMs: 3 * MIN });
    advanceClock(state, START + 5 * MIN);
    expect(penSummary(state, coop)).toMatchObject({ ready: 1, busy: 0 });

    const xpBefore = state.xp;
    expect(collectFromPen(state, coop.id).ok).toBe(true);
    expect(itemCount(state, 'egg')).toBe(1);
    expect(state.xp).toBeGreaterThan(xpBefore);
    expect(penSummary(state, coop)).toMatchObject({ hungry: 1, ready: 0 });
  });

  it('feeds as many as there is feed for', () => {
    const state = richGame(2);
    const coop = buyPen(state, 'coop');
    buyAnimal(state, coop.id);
    buyAnimal(state, coop.id);
    state.items = { oat: 5 };
    const result = feedAnimals(state, coop.id);
    expect(result).toMatchObject({ ok: true, events: [{ type: 'fed', count: 2 }] });
    expect(itemCount(state, 'oat')).toBe(1);
    expect(penSummary(state, coop)).toMatchObject({ hungry: 1, busy: 2 });
  });

  it('keeps products safe when the barn is full', () => {
    const state = richGame(2);
    const coop = buyPen(state, 'coop');
    buyAnimal(state, coop.id);
    state.items = { oat: 4 };
    feedAnimals(state, coop.id);
    advanceClock(state, START + HOUR);

    state.items = { carrot: barnCapacity(state) };
    expect(collectFromPen(state, coop.id)).toEqual({ ok: false, reason: 'barn-full' });
    expect(penSummary(state, coop).ready).toBe(2);

    state.items = { carrot: barnCapacity(state) - 1 };
    expect(collectFromPen(state, coop.id)).toMatchObject({ ok: true, events: [{ type: 'collected', qty: 1 }] });
    expect(penSummary(state, coop)).toMatchObject({ ready: 1, hungry: 1 });
  });

  it('sells more animals until the home is full', () => {
    const state = richGame(2);
    const coop = buyPen(state, 'coop');
    const costs = getPen('coop')?.animalCosts ?? [];
    state.coins = 0;
    expect(buyAnimal(state, coop.id)).toEqual({ ok: false, reason: 'not-enough-coins' });
    state.coins = 100_000;
    for (let i = 1; i < costs.length; i += 1) {
      expect(nextAnimalCost(coop)).toBe(costs[i]);
      expect(buyAnimal(state, coop.id).ok).toBe(true);
    }
    expect(coop.animals).toHaveLength(costs.length);
    expect(nextAnimalCost(coop)).toBeNull();
    expect(buyAnimal(state, coop.id)).toEqual({ ok: false, reason: 'max-level' });
  });

  it('never shows a negative timer', () => {
    const state = richGame(2);
    const coop = buyPen(state, 'coop');
    const def = getPen('coop');
    if (!def) throw new Error('no coop');
    const status = animalStatus(state, def, { fedAt: state.time + 99 * HOUR });
    expect(status.remainingMs).toBe(def.produceMs);
    expect(status.progress).toBe(0);
    expect(coop.animals).toHaveLength(1);
  });
});
