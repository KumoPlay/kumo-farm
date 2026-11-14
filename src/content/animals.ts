import { MIN } from './time';
import type { ItemDef, PenDef } from './types';

/**
 * Animal homes. To add one: add an entry here and its product below, names in
 * src/i18n/en.ts (objects, animals, items), and pictures in src/art
 * (buildings/<id>.svg, animals/<animal>.svg, items/<product>.svg).
 */
export const pens: PenDef[] = [
  {
    id: 'coop',
    w: 2,
    h: 2,
    unlockLevel: 2,
    cost: 30,
    limits: [
      [2, 1],
      [9, 2],
    ],
    animal: 'hen',
    animalCosts: [0, 20, 40, 60],
    feed: { item: 'oat', qty: 2 },
    product: 'egg',
    produceMs: 5 * MIN,
  },
  {
    id: 'meadow',
    w: 2,
    h: 2,
    unlockLevel: 6,
    cost: 250,
    limits: [[6, 1]],
    animal: 'goat',
    animalCosts: [0, 80, 140, 200],
    feed: { item: 'carrot', qty: 2 },
    product: 'milk',
    produceMs: 20 * MIN,
  },
];

/** What the animals make. */
export const goods: ItemDef[] = [
  { id: 'egg', value: 6, xp: 3, unlockLevel: 2, orderQty: [1, 3] },
  { id: 'milk', value: 14, xp: 6, unlockLevel: 6, orderQty: [1, 3] },
];
