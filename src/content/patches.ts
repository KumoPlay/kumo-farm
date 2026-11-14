import type { PatchDef } from './types';

/**
 * Cloud patches. The farm starts on 'home'; the others unlock later.
 * Positions and sizes are in tiles, and patches should touch each other.
 */
export const patches: PatchDef[] = [
  { id: 'home', x: 0, y: 0, w: 6, h: 6, unlockLevel: 1, cost: 0 },
  { id: 'east', x: 6, y: 0, w: 6, h: 6, unlockLevel: 3, cost: 100 },
  { id: 'south', x: 0, y: 6, w: 6, h: 6, unlockLevel: 5, cost: 300 },
  { id: 'south-east', x: 6, y: 6, w: 6, h: 6, unlockLevel: 7, cost: 700 },
  { id: 'far-south', x: 0, y: 12, w: 6, h: 6, unlockLevel: 9, cost: 1500 },
  { id: 'far-south-east', x: 6, y: 12, w: 6, h: 6, unlockLevel: 10, cost: 2500 },
];

/** Where things stand on a brand-new farm (tile positions on the home patch). */
export const startLayout = {
  barn: { x: 0, y: 0 },
  board: { x: 4, y: 0 },
  plots: [
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 3, y: 4 },
  ],
};
