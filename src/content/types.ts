/**
 * Shapes of the game content. The content files in this folder are plain data:
 * change numbers or add entries there, and the game picks them up.
 */

/** Anything that can sit in the barn and appear in an order. */
export interface ItemDef {
  /** Unique id, lowercase with dashes. Also the art file name and the text key. */
  id: string;
  /** Coins when sold from the barn. Orders pay more (see balance.orders). */
  value: number;
  /** XP for producing one. */
  xp: number;
  /** Level at which the item becomes available. */
  unlockLevel: number;
  /** How many an order asks for: [fewest, most]. */
  orderQty: [number, number];
}

export interface CropDef extends ItemDef {
  /** Real time from planting to harvest, in milliseconds. */
  growMs: number;
}

/** Something that stands on the farm grid. Sizes are in tiles. */
export interface ObjectDef {
  id: string;
  w: number;
  h: number;
}

/** A square piece of cloud the farm can grow onto. Positions are in tiles. */
export interface PatchDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  unlockLevel: number;
  cost: number;
}

/** How one slot of the orders board builds its orders. */
export interface OrderSlotDef {
  /** How many different items the order asks for: [fewest, most]. */
  types: [number, number];
  /** Multiplies each item's orderQty. Below 1 makes small, quick orders. */
  qtyScale: number;
  /** 'easy' only picks from the cheaper half of the unlocked items. */
  pool: 'easy' | 'all';
}

export interface ItemAmount {
  item: string;
  qty: number;
}

/**
 * How many of something the player may own: pairs of [from level, how many].
 * [[2, 1], [9, 2]] means one from level 2 and two from level 9.
 */
export type LevelLimits = [level: number, count: number][];

/** An animal home. It is placed on the farm and holds a few animals of one kind. */
export interface PenDef extends ObjectDef {
  unlockLevel: number;
  /** Coins to buy and place the home. */
  cost: number;
  limits: LevelLimits;
  /** The animal that lives here. Also its art file name and text key. */
  animal: string;
  /** Coins for the 1st, 2nd, 3rd… animal. The number of entries is the most animals it holds. */
  animalCosts: number[];
  /** What one animal eats each time. */
  feed: ItemAmount;
  /** The item one fed animal makes. */
  product: string;
  /** Real time from feeding to the product, in milliseconds. */
  produceMs: number;
}

/** A production building. Its recipes are in recipes.ts. */
export interface MakerDef extends ObjectDef {
  unlockLevel: number;
  cost: number;
  limits: LevelLimits;
  /** Queue places a new building starts with. */
  slots: number;
  /** Coins for each extra queue place, in order. */
  slotCosts: number[];
}

/** Something a production building makes. The id is also the product's item id. */
export interface RecipeDef extends ItemDef {
  maker: string;
  ingredients: ItemAmount[];
  /** Real time to make one, in milliseconds. */
  timeMs: number;
}

/** A decoration. Just for looks. */
export interface DecoDef extends ObjectDef {
  unlockLevel: number;
  cost: number;
}
