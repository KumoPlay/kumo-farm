/** Level curve and level-up rewards. */
export const levels = {
  /** XP needed to go from level 1 to 2, 2 to 3, and so on. */
  xpToNext: [12, 30, 90, 240, 550, 1000, 1700, 2600, 3600],
  /** After the table ends, each further level needs this much more XP than the last. */
  extraXpPerLevelAfterTable: 1000,
  /** Coins given on reaching a level: base + perLevel × the new level. */
  rewardCoins: { base: 10, perLevel: 5 },
};
