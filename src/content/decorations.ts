import type { DecoDef } from './types';

/**
 * Decorations, just for looks. To add one: add an entry here, a name in
 * src/i18n/en.ts (objects), and a picture in src/art/buildings.
 * They can be sold back for the full price, so trying things out is free.
 */
export const decorations: DecoDef[] = [
  { id: 'flower-bed', w: 1, h: 1, unlockLevel: 2, cost: 10 },
  { id: 'fence', w: 1, h: 1, unlockLevel: 2, cost: 5 },
  { id: 'lantern', w: 1, h: 1, unlockLevel: 3, cost: 25 },
  { id: 'pinwheel', w: 1, h: 1, unlockLevel: 4, cost: 40 },
  { id: 'bench', w: 2, h: 1, unlockLevel: 5, cost: 60 },
  { id: 'pond', w: 2, h: 2, unlockLevel: 6, cost: 150 },
  { id: 'rainbow-arch', w: 2, h: 2, unlockLevel: 8, cost: 300 },
];
