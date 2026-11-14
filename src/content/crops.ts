import { HOUR, MIN, SEC } from './time';
import type { CropDef } from './types';

/**
 * Crops. To add one: add an entry here, a name in src/i18n/en.ts, and three
 * pictures in src/art (items/<id>.svg, crops/<id>-growing.svg, crops/<id>-ready.svg).
 */
export const crops: CropDef[] = [
  { id: 'oat', growMs: 30 * SEC, unlockLevel: 1, value: 1, xp: 1, orderQty: [3, 6] },
  { id: 'carrot', growMs: 2 * MIN, unlockLevel: 1, value: 3, xp: 2, orderQty: [2, 5] },
  { id: 'strawberry', growMs: 10 * MIN, unlockLevel: 3, value: 8, xp: 4, orderQty: [2, 4] },
  { id: 'sunflower', growMs: 45 * MIN, unlockLevel: 5, value: 20, xp: 8, orderQty: [1, 3] },
  { id: 'moon-melon', growMs: 3 * HOUR, unlockLevel: 8, value: 50, xp: 15, orderQty: [1, 2] },
];
