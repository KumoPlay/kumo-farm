import { HOUR, MIN } from './time';
import type { MakerDef, RecipeDef } from './types';

/**
 * Production buildings. To add one: add an entry here and its recipes below,
 * a name in src/i18n/en.ts (objects), and a picture in src/art/buildings.
 */
export const makers: MakerDef[] = [
  { id: 'oven', w: 2, h: 2, unlockLevel: 4, cost: 120, limits: [[4, 1]], slots: 2, slotCosts: [80, 200] },
  { id: 'creamery', w: 2, h: 2, unlockLevel: 7, cost: 400, limits: [[7, 1]], slots: 2, slotCosts: [150, 350] },
];

/**
 * Recipes. Each one makes the item with the same id. To add one: add an entry
 * here, a name in src/i18n/en.ts (items), and a picture in src/art/items.
 */
export const recipes: RecipeDef[] = [
  {
    id: 'oat-bread',
    maker: 'oven',
    ingredients: [{ item: 'oat', qty: 3 }],
    timeMs: 5 * MIN,
    unlockLevel: 4,
    value: 8,
    xp: 4,
    orderQty: [1, 3],
  },
  {
    id: 'carrot-muffin',
    maker: 'oven',
    ingredients: [
      { item: 'carrot', qty: 2 },
      { item: 'egg', qty: 1 },
    ],
    timeMs: 15 * MIN,
    unlockLevel: 4,
    value: 24,
    xp: 9,
    orderQty: [1, 2],
  },
  {
    id: 'sunflower-cookie',
    maker: 'oven',
    ingredients: [
      { item: 'sunflower', qty: 2 },
      { item: 'egg', qty: 1 },
    ],
    timeMs: 30 * MIN,
    unlockLevel: 5,
    value: 70,
    xp: 20,
    orderQty: [1, 2],
  },
  {
    id: 'berry-milk',
    maker: 'creamery',
    ingredients: [
      { item: 'strawberry', qty: 2 },
      { item: 'milk', qty: 1 },
    ],
    timeMs: 10 * MIN,
    unlockLevel: 7,
    value: 45,
    xp: 14,
    orderQty: [1, 2],
  },
  {
    id: 'cheese',
    maker: 'creamery',
    ingredients: [{ item: 'milk', qty: 3 }],
    timeMs: 30 * MIN,
    unlockLevel: 7,
    value: 65,
    xp: 20,
    orderQty: [1, 2],
  },
  {
    id: 'moon-melon-ice-cream',
    maker: 'creamery',
    ingredients: [
      { item: 'moon-melon', qty: 1 },
      { item: 'milk', qty: 2 },
    ],
    timeMs: 1 * HOUR,
    unlockLevel: 8,
    value: 120,
    xp: 35,
    orderQty: [1, 1],
  },
];
