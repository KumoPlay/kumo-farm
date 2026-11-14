import { MIN } from './time';
import type { OrderSlotDef } from './types';

/** Numbers that shape the economy. Safe to tweak; no code changes needed. */
export const balance = {
  /** Coins on a brand-new farm. */
  startCoins: 20,

  /** Chance (0 to 1) that a harvest gives one extra crop. */
  harvestBonusChance: 0.15,

  plots: {
    /** Coins for the first extra plot, and how much more each next one costs. */
    costBase: 10,
    costStep: 5,
    /** Plots allowed at level 1, how many more each level allows, and the most ever. */
    limitBase: 6,
    limitPerLevel: 2,
    limitMax: 40,
  },

  barn: {
    /** Capacity at barn level 1, 2, 3… */
    capacities: [50, 75, 100, 150, 200],
    /** Coins to go from level 1 to 2, 2 to 3… (one fewer entry than capacities). */
    upgradeCosts: [60, 150, 400, 900],
  },

  orders: {
    /** One entry per slot on the board. The first is always small and quick. */
    slots: [
      { types: [1, 1], qtyScale: 0.6, pool: 'easy' },
      { types: [1, 2], qtyScale: 1, pool: 'all' },
      { types: [2, 3], qtyScale: 1.2, pool: 'all' },
    ] as OrderSlotDef[],
    /** Wait for a new order after skipping one. */
    skipWaitMs: 2 * MIN,
    /** Order coins = barn value of the items × this. */
    coinFactor: 1.6,
    /** Order XP = XP of the items × this. */
    xpFactor: 1.5,
  },
};
