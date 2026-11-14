import { describe, expect, it } from 'vitest';
import { getMaker } from '../content';
import { HOUR, MIN } from '../content/time';
import { barnCapacity, itemCount } from './barn';
import { advanceClock } from './clock';
import { buyQueueSlot, collectFromMaker, jobStatus, makerSummary, nextSlotCost, startRecipe } from './production';
import { buyMaker, richGame, START } from './testing';

describe('production buildings', () => {
  it('take the ingredients and make the product in real time', () => {
    const state = richGame(4);
    const oven = buyMaker(state, 'oven');
    expect(startRecipe(state, oven.id, 'oat-bread')).toEqual({ ok: false, reason: 'not-enough-items' });

    state.items = { oat: 4 };
    expect(startRecipe(state, oven.id, 'oat-bread').ok).toBe(true);
    expect(itemCount(state, 'oat')).toBe(1);
    expect(makerSummary(state, oven)).toEqual({ done: 0, busy: 1, free: 1, nextReadyMs: 5 * MIN });
    expect(collectFromMaker(state, oven.id)).toEqual({ ok: false, reason: 'not-ready' });

    advanceClock(state, START + 5 * MIN);
    expect(makerSummary(state, oven)).toMatchObject({ done: 1, busy: 0 });
    const xpBefore = state.xp;
    expect(collectFromMaker(state, oven.id).ok).toBe(true);
    expect(itemCount(state, 'oat-bread')).toBe(1);
    expect(state.xp).toBeGreaterThan(xpBefore);
    expect(oven.jobs).toEqual([]);
  });

  it('makes queued jobs one after another, also while the game is closed', () => {
    const state = richGame(4);
    const oven = buyMaker(state, 'oven');
    state.items = { oat: 3, carrot: 2, egg: 1 };
    startRecipe(state, oven.id, 'oat-bread');
    startRecipe(state, oven.id, 'carrot-muffin');
    expect(oven.jobs.map((job) => jobStatus(state, job).stage)).toEqual(['making', 'waiting']);
    expect(jobStatus(state, oven.jobs[1]!).remainingMs).toBe(20 * MIN);

    advanceClock(state, START + 6 * MIN);
    expect(oven.jobs.map((job) => jobStatus(state, job).stage)).toEqual(['done', 'making']);

    advanceClock(state, START + 10 * HOUR);
    expect(oven.jobs.map((job) => jobStatus(state, job).stage)).toEqual(['done', 'done']);
    const result = collectFromMaker(state, oven.id);
    expect(result.ok).toBe(true);
    expect(itemCount(state, 'oat-bread')).toBe(1);
    expect(itemCount(state, 'carrot-muffin')).toBe(1);
  });

  it('has a small queue that can be made longer with coins', () => {
    const state = richGame(4);
    const oven = buyMaker(state, 'oven');
    const def = getMaker('oven');
    if (!def) throw new Error('no oven');
    state.items = { oat: 30 };
    for (let i = 0; i < def.slots; i += 1) expect(startRecipe(state, oven.id, 'oat-bread').ok).toBe(true);
    expect(startRecipe(state, oven.id, 'oat-bread')).toEqual({ ok: false, reason: 'queue-full' });
    expect(itemCount(state, 'oat')).toBe(30 - 3 * def.slots);

    expect(nextSlotCost(oven)).toBe(def.slotCosts[0]);
    expect(buyQueueSlot(state, oven.id).ok).toBe(true);
    expect(startRecipe(state, oven.id, 'oat-bread').ok).toBe(true);

    while (nextSlotCost(oven) !== null) buyQueueSlot(state, oven.id);
    expect(oven.slots).toBe(def.slots + def.slotCosts.length);
    expect(buyQueueSlot(state, oven.id)).toEqual({ ok: false, reason: 'max-level' });
  });

  it('refuses recipes of another building and locked recipes', () => {
    const state = richGame(4);
    const oven = buyMaker(state, 'oven');
    state.items = { sunflower: 5, egg: 5, milk: 5 };
    expect(startRecipe(state, oven.id, 'cheese')).toEqual({ ok: false, reason: 'not-found' });
    expect(startRecipe(state, oven.id, 'sunflower-cookie')).toEqual({ ok: false, reason: 'locked' });
    expect(itemCount(state, 'egg')).toBe(5);
  });

  it('keeps finished products safe when the barn is full', () => {
    const state = richGame(4);
    const oven = buyMaker(state, 'oven');
    state.items = { oat: 6 };
    startRecipe(state, oven.id, 'oat-bread');
    startRecipe(state, oven.id, 'oat-bread');
    advanceClock(state, START + HOUR);

    state.items = { carrot: barnCapacity(state) };
    expect(collectFromMaker(state, oven.id)).toEqual({ ok: false, reason: 'barn-full' });
    expect(oven.jobs).toHaveLength(2);

    state.items = { carrot: barnCapacity(state) - 1 };
    expect(collectFromMaker(state, oven.id)).toMatchObject({ ok: true, events: [{ type: 'collected', qty: 1 }] });
    expect(oven.jobs).toHaveLength(1);
  });
});
