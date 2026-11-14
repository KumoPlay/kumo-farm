import { describe, expect, it } from 'vitest';
import { balance, getDeco, getPatch } from '../content';
import { MIN } from '../content/time';
import { advanceClock } from './clock';
import { plantCrop, plotGrowth } from './crops';
import { tick } from './game';
import { canMake, orderableItems } from './orders';
import {
  buyBlocker,
  buyObject,
  buyPatch,
  canPlace,
  countOwned,
  findFreeSpot,
  isOwnedTile,
  moveObject,
  nextPatches,
  removeDecoration,
  shopOffer,
} from './shop';
import { buyAnywhere, buyMaker, buyPen, firstPlot, newGame, richGame, START } from './testing';

describe('placing things', () => {
  it('only allows free tiles on owned cloud', () => {
    const state = newGame();
    expect(isOwnedTile(state, 0, 0)).toBe(true);
    expect(isOwnedTile(state, 6, 0)).toBe(false);
    expect(canPlace(state, 'plot', 5, 5)).toBe(true);
    expect(canPlace(state, 'plot', 0, 0)).toBe(false); // the barn is there
    expect(canPlace(state, 'plot', 1, 1)).toBe(false); // still the barn (2 × 2)
    expect(canPlace(state, 'plot', 2, 1)).toBe(true);
    expect(canPlace(state, 'coop', 5, 5)).toBe(false); // would hang over the edge
    expect(canPlace(state, 'coop', 4, 4)).toBe(true);
    expect(canPlace(state, 'coop', 3, 3)).toBe(false); // a plot is in the way
    expect(canPlace(state, 'plot', 2.5, 1)).toBe(false);
    expect(canPlace(state, 'spaceship', 5, 5)).toBe(false);
  });

  it('finds the nearest free spot, or none when the farm is full', () => {
    const state = richGame(2);
    expect(findFreeSpot(state, 'plot', 2, 2)).toEqual({ x: 2, y: 2 });
    expect(findFreeSpot(state, 'plot', 2, 0)).toEqual({ x: 2, y: 0 });
    while (findFreeSpot(state, 'fence', 0, 0)) buyAnywhere(state, 'fence');
    expect(findFreeSpot(state, 'plot', 0, 0)).toBeNull();
  });

  it('moves things, keeping their timers', () => {
    const state = newGame();
    const plot = firstPlot(state);
    plantCrop(state, plot.id, 'carrot');
    advanceClock(state, START + MIN);
    expect(moveObject(state, plot.id, 0, 0)).toEqual({ ok: false, reason: 'blocked' });
    expect(moveObject(state, plot.id, 5, 5).ok).toBe(true);
    expect(plot).toMatchObject({ x: 5, y: 5, crop: 'carrot' });
    expect(plotGrowth(state, plot).remainingMs).toBe(MIN);

    // Something big may shift onto tiles it already covers.
    const barn = state.objects.find((object) => object.kind === 'barn');
    expect(moveObject(state, barn?.id ?? 0, 1, 0).ok).toBe(true);
    expect(moveObject(state, 9999, 0, 0)).toEqual({ ok: false, reason: 'not-found' });
  });
});

describe('the shop', () => {
  it('sells more plots as the player levels up, each a little dearer', () => {
    const state = newGame();
    expect(buyBlocker(state, 'plot')).toBe('limit');
    state.level = 2;
    const first = shopOffer(state, 'plot');
    expect(first).toMatchObject({ cost: balance.plots.costBase, owned: 6, limit: 8 });

    expect(buyObject(state, 'plot', 0, 0)).toEqual({ ok: false, reason: 'blocked' });
    const coinsBefore = state.coins;
    expect(buyObject(state, 'plot', 5, 5).ok).toBe(true);
    expect(state.coins).toBe(coinsBefore - balance.plots.costBase);
    expect(shopOffer(state, 'plot')?.cost).toBe(balance.plots.costBase + balance.plots.costStep);

    state.coins = 0;
    expect(buyBlocker(state, 'plot')).toBe('not-enough-coins');
    state.coins = 1000;
    buyAnywhere(state, 'plot');
    expect(buyBlocker(state, 'plot')).toBe('limit');
  });

  it('locks things until their level and keeps to the limits', () => {
    const state = richGame(1);
    expect(buyBlocker(state, 'coop')).toBe('locked');
    expect(buyObject(state, 'coop', 4, 4)).toEqual({ ok: false, reason: 'locked' });
    state.level = 2;
    buyPen(state, 'coop');
    expect(buyBlocker(state, 'coop')).toBe('limit');
    state.level = 9;
    expect(buyBlocker(state, 'coop')).toBeNull();
    expect(buyBlocker(state, 'spaceship')).toBe('not-found');
    expect(countOwned(state, 'coop')).toBe(1);
  });

  it('gives the full price back for a decoration that is put away', () => {
    const state = richGame(3);
    const lantern = buyAnywhere(state, 'lantern');
    const coins = state.coins;
    expect(removeDecoration(state, lantern.id).ok).toBe(true);
    expect(state.coins).toBe(coins + (getDeco('lantern')?.cost ?? 0));
    expect(countOwned(state, 'lantern')).toBe(0);
    expect(removeDecoration(state, firstPlot(state).id)).toEqual({ ok: false, reason: 'not-found' });
  });
});

describe('cloud patches', () => {
  it('offers the patches next to the farm, and sells them at their level', () => {
    const state = newGame();
    expect(nextPatches(state).map((patch) => patch.id)).toEqual(['east', 'south']);
    state.coins = 100_000;
    expect(buyPatch(state, 'east')).toEqual({ ok: false, reason: 'locked' });
    expect(buyPatch(state, 'far-south')).toEqual({ ok: false, reason: 'not-found' });

    state.level = 3;
    expect(buyPatch(state, 'east').ok).toBe(true);
    expect(state.coins).toBe(100_000 - (getPatch('east')?.cost ?? 0));
    expect(isOwnedTile(state, 6, 0)).toBe(true);
    expect(canPlace(state, 'coop', 5, 0)).toBe(false); // the orders board stands on the home patch edge
    expect(canPlace(state, 'coop', 6, 2)).toBe(true); // across the old edge onto the new cloud
    expect(buyPatch(state, 'east')).toEqual({ ok: false, reason: 'not-found' });
    expect(nextPatches(state).map((patch) => patch.id)).toEqual(['south', 'south-east']);
  });
});

describe('orders and what the farm can make', () => {
  it('only asks for animal goods and products the farm can make', () => {
    const state = richGame(8);
    expect(canMake(state, 'egg')).toBe(false);
    expect(canMake(state, 'oat-bread')).toBe(false);
    expect(orderableItems(state).map((item) => item.id)).toEqual(['oat', 'carrot', 'strawberry', 'sunflower', 'moon-melon']);

    buyMaker(state, 'oven');
    expect(canMake(state, 'oat-bread')).toBe(true);
    expect(canMake(state, 'carrot-muffin')).toBe(false); // needs eggs, and there are no hens yet

    buyPen(state, 'coop');
    expect(canMake(state, 'egg')).toBe(true);
    expect(canMake(state, 'carrot-muffin')).toBe(true);
    expect(canMake(state, 'cheese')).toBe(false);

    for (let round = 0; round < 40; round += 1) {
      state.orders = [];
      tick(state, START);
      for (const slot of state.orders) {
        for (const want of slot.order?.wants ?? []) expect(canMake(state, want.item), want.item).toBe(true);
      }
    }
  });
});
