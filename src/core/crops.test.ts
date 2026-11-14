import { describe, expect, it } from 'vitest';
import { balance } from '../content';
import { SEC } from '../content/time';
import { barnCapacity, itemCount } from './barn';
import { advanceClock } from './clock';
import { harvestPlot, plantCrop, plotGrowth } from './crops';
import { firstPlot, newGame, plots, START } from './testing';

describe('crops', () => {
  it('plants on an empty plot and grows in real time', () => {
    const state = newGame();
    const plot = firstPlot(state);
    expect(plotGrowth(state, plot).stage).toBe('empty');

    expect(plantCrop(state, plot.id, 'oat').ok).toBe(true);
    expect(plotGrowth(state, plot).stage).toBe('sprout');

    advanceClock(state, START + 20 * SEC);
    expect(plotGrowth(state, plot)).toMatchObject({ stage: 'growing', remainingMs: 10 * SEC });

    advanceClock(state, START + 30 * SEC);
    expect(plotGrowth(state, plot)).toMatchObject({ stage: 'ready', progress: 1, remainingMs: 0 });
  });

  it('refuses a taken plot, an unknown crop and a locked crop', () => {
    const state = newGame();
    const plot = firstPlot(state);
    expect(plantCrop(state, plot.id, 'strawberry')).toEqual({ ok: false, reason: 'locked' });
    expect(plantCrop(state, plot.id, 'dragonfruit')).toEqual({ ok: false, reason: 'not-found' });
    expect(plantCrop(state, 9999, 'oat')).toEqual({ ok: false, reason: 'not-found' });
    plantCrop(state, plot.id, 'oat');
    expect(plantCrop(state, plot.id, 'carrot')).toEqual({ ok: false, reason: 'occupied' });
    expect(plot.crop).toBe('oat');
  });

  it('harvests only when ready, into the barn, with XP', () => {
    const state = newGame();
    const plot = firstPlot(state);
    expect(harvestPlot(state, plot.id)).toEqual({ ok: false, reason: 'empty' });
    plantCrop(state, plot.id, 'oat');
    expect(harvestPlot(state, plot.id)).toEqual({ ok: false, reason: 'not-ready' });

    advanceClock(state, START + 30 * SEC);
    const result = harvestPlot(state, plot.id);
    expect(result.ok).toBe(true);
    expect(itemCount(state, 'oat')).toBeGreaterThanOrEqual(1);
    expect(state.xp).toBe(1);
    expect(plot.crop).toBeNull();
    expect(plotGrowth(state, plot).stage).toBe('empty');
  });

  it('gives a bonus crop about as often as the balance file says', () => {
    const state = newGame(7);
    const plot = firstPlot(state);
    state.barnLevel = balance.barn.capacities.length;
    let bonuses = 0;
    const rounds = 2000;
    for (let i = 0; i < rounds; i += 1) {
      state.items = {};
      plantCrop(state, plot.id, 'oat');
      state.time += 30 * SEC;
      const result = harvestPlot(state, plot.id);
      if (result.ok && result.events[0]?.type === 'harvested') bonuses += result.events[0].bonus;
    }
    const rate = bonuses / rounds;
    expect(rate).toBeGreaterThan(balance.harvestBonusChance - 0.04);
    expect(rate).toBeLessThan(balance.harvestBonusChance + 0.04);
  });

  it('keeps the crop waiting when the barn is full, and never overfills', () => {
    const state = newGame();
    const [a, b] = plots(state);
    if (!a || !b) throw new Error('need two plots');
    plantCrop(state, a.id, 'oat');
    plantCrop(state, b.id, 'oat');
    advanceClock(state, START + 60 * SEC);

    state.items = { carrot: barnCapacity(state) };
    expect(harvestPlot(state, a.id)).toEqual({ ok: false, reason: 'barn-full' });
    expect(a.crop).toBe('oat');

    // One free space: the harvest fits, a bonus would not, so it is never added.
    state.items = { carrot: barnCapacity(state) - 1 };
    expect(harvestPlot(state, a.id).ok).toBe(true);
    expect(itemCount(state, 'oat')).toBe(1);
    expect(harvestPlot(state, b.id)).toEqual({ ok: false, reason: 'barn-full' });
  });
});
