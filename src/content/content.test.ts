import { describe, expect, it } from 'vitest';
import { hasArt } from '../art';
import { en } from '../i18n/en';
import {
  allObjects,
  balance,
  crops,
  customers,
  decorations,
  getItem,
  getMaker,
  getObjectDef,
  items,
  levels,
  makers,
  patches,
  pens,
  recipes,
  startLayout,
} from './index';

/**
 * These checks catch slips when adding or balancing content:
 * a missing picture, a missing name, or a number that makes no sense.
 */
describe('content files', () => {
  it('gives every id once, in lowercase with dashes', () => {
    for (const list of [items, allObjects, patches]) {
      const ids = list.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('has sensible numbers for every item', () => {
    for (const item of items) {
      expect(item.value, item.id).toBeGreaterThan(0);
      expect(item.xp, item.id).toBeGreaterThan(0);
      expect(item.unlockLevel, item.id).toBeGreaterThanOrEqual(1);
      expect(item.orderQty[0], item.id).toBeGreaterThanOrEqual(1);
      expect(item.orderQty[1], item.id).toBeGreaterThanOrEqual(item.orderQty[0]);
    }
    for (const crop of crops) expect(crop.growMs, crop.id).toBeGreaterThan(0);
  });

  it('lets a new player start: something to grow and to order at level 1', () => {
    expect(crops.some((crop) => crop.unlockLevel === 1)).toBe(true);
  });

  it('has a name for every item, customer, animal and thing on the farm', () => {
    for (const item of items) expect(en.items[item.id], item.id).toBeTruthy();
    for (const customer of customers) expect(en.customers[customer], customer).toBeTruthy();
    for (const object of allObjects) expect(en.objects[object.id], object.id).toBeTruthy();
    for (const pen of pens) expect(en.animals[pen.animal], pen.animal).toBeTruthy();
  });

  it('has animal homes that make sense', () => {
    for (const pen of pens) {
      expect(getItem(pen.feed.item), `${pen.id} feed`).toBeDefined();
      expect(getItem(pen.product), `${pen.id} product`).toBeDefined();
      expect(pen.feed.qty, pen.id).toBeGreaterThan(0);
      expect(pen.produceMs, pen.id).toBeGreaterThan(0);
      expect(pen.animalCosts.length, pen.id).toBeGreaterThan(0);
      expect(pen.limits.length, pen.id).toBeGreaterThan(0);
      // The animal's product must not unlock before its home does.
      expect(getItem(pen.product)?.unlockLevel, pen.id).toBeGreaterThanOrEqual(pen.unlockLevel);
    }
  });

  it('has recipes that can really be made', () => {
    for (const recipe of recipes) {
      const maker = getMaker(recipe.maker);
      expect(maker, `${recipe.id} building`).toBeDefined();
      expect(recipe.timeMs, recipe.id).toBeGreaterThan(0);
      expect(recipe.ingredients.length, recipe.id).toBeGreaterThan(0);
      expect(recipe.unlockLevel, recipe.id).toBeGreaterThanOrEqual(maker?.unlockLevel ?? 0);
      let ingredientValue = 0;
      for (const need of recipe.ingredients) {
        const item = getItem(need.item);
        expect(item, `${recipe.id} needs ${need.item}`).toBeDefined();
        expect(need.item, `${recipe.id} must not need itself`).not.toBe(recipe.id);
        expect(need.qty, recipe.id).toBeGreaterThan(0);
        // Every ingredient is available by the time the recipe is.
        expect(item?.unlockLevel ?? 99, `${recipe.id} needs ${need.item}`).toBeLessThanOrEqual(recipe.unlockLevel);
        ingredientValue += (item?.value ?? 0) * need.qty;
      }
      // Making something is always worth more than selling its ingredients.
      expect(recipe.value, `${recipe.id} value`).toBeGreaterThan(ingredientValue);
    }
    for (const maker of makers) {
      expect(recipes.some((recipe) => recipe.maker === maker.id), `${maker.id} has recipes`).toBe(true);
      expect(maker.slots, maker.id).toBeGreaterThan(0);
    }
  });

  it('has prices and sizes for everything in the shop', () => {
    for (const entry of [...pens, ...makers, ...decorations]) {
      expect(entry.cost, entry.id).toBeGreaterThan(0);
      expect(entry.unlockLevel, entry.id).toBeGreaterThanOrEqual(1);
      expect(entry.w, entry.id).toBeGreaterThanOrEqual(1);
      expect(entry.h, entry.id).toBeGreaterThanOrEqual(1);
    }
    expect(balance.plots.limitBase).toBeGreaterThanOrEqual(startLayout.plots.length);
  });

  it('has a picture for every item, crop stage, building and customer', () => {
    for (const item of items) expect(hasArt(`items/${item.id}`), `items/${item.id}`).toBe(true);
    for (const crop of crops) {
      expect(hasArt(`crops/${crop.id}-growing`), `crops/${crop.id}-growing`).toBe(true);
      expect(hasArt(`crops/${crop.id}-ready`), `crops/${crop.id}-ready`).toBe(true);
    }
    for (const customer of customers) expect(hasArt(`people/${customer}`), `people/${customer}`).toBe(true);
    for (const pen of pens) expect(hasArt(`animals/${pen.animal}`), `animals/${pen.animal}`).toBe(true);
    for (const entry of [...pens, ...makers, ...decorations]) {
      expect(hasArt(`buildings/${entry.id}`), `buildings/${entry.id}`).toBe(true);
    }
    for (const name of ['buildings/barn', 'buildings/board', 'tiles/soil', 'crops/sprout', 'ui/missing']) {
      expect(hasArt(name), name).toBe(true);
    }
  });

  it('has a barn that can always be upgraded step by step', () => {
    const { capacities, upgradeCosts } = balance.barn;
    expect(upgradeCosts).toHaveLength(capacities.length - 1);
    for (let i = 1; i < capacities.length; i += 1) {
      expect(capacities[i]).toBeGreaterThan(capacities[i - 1] ?? 0);
    }
    for (const cost of upgradeCosts) expect(cost).toBeGreaterThan(0);
  });

  it('has orders that pay at least the barn price', () => {
    expect(balance.orders.coinFactor).toBeGreaterThanOrEqual(1);
    expect(balance.orders.slots.length).toBeGreaterThan(0);
    for (const slot of balance.orders.slots) {
      expect(slot.types[0]).toBeGreaterThanOrEqual(1);
      expect(slot.types[1]).toBeGreaterThanOrEqual(slot.types[0]);
      expect(slot.qtyScale).toBeGreaterThan(0);
    }
    expect(balance.harvestBonusChance).toBeGreaterThanOrEqual(0);
    expect(balance.harvestBonusChance).toBeLessThanOrEqual(1);
  });

  it('has a level table that only goes up', () => {
    for (let i = 1; i < levels.xpToNext.length; i += 1) {
      expect(levels.xpToNext[i]).toBeGreaterThan(levels.xpToNext[i - 1] ?? 0);
    }
  });

  it('starts with a free home patch, and everything on a new farm fits on it without overlapping', () => {
    const home = patches.find((patch) => patch.id === 'home');
    expect(home).toMatchObject({ unlockLevel: 1, cost: 0 });
    if (!home) return;

    const taken = new Set<string>();
    const place = (kind: string, x: number, y: number): void => {
      const def = getObjectDef(kind);
      expect(def, kind).toBeDefined();
      for (let dx = 0; dx < (def?.w ?? 1); dx += 1) {
        for (let dy = 0; dy < (def?.h ?? 1); dy += 1) {
          const tileX = x + dx;
          const tileY = y + dy;
          expect(tileX >= home.x && tileX < home.x + home.w && tileY >= home.y && tileY < home.y + home.h).toBe(true);
          const key = `${tileX},${tileY}`;
          expect(taken.has(key), `two things on tile ${key}`).toBe(false);
          taken.add(key);
        }
      }
    };
    place('barn', startLayout.barn.x, startLayout.barn.y);
    place('board', startLayout.board.x, startLayout.board.y);
    for (const plot of startLayout.plots) place('plot', plot.x, plot.y);
  });
});
