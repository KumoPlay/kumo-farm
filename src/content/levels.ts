/** Level curve and level-up rewards. */
export const levels = {
  /** XP needed to go from level 1 to 2, 2 to 3, and so on. */
  xpToNext: [12, 30, 60, 100, 160, 240, 340, 460, 600],
  /** After the table ends, each further level needs this much more XP than the last. */
  extraXpPerLevelAfterTable: 200,
  /** Coins given on reaching a level: base + perLevel × the new level. */
  rewardCoins: { base: 10, perLevel: 5 },
};
