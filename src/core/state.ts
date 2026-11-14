import { balance, startLayout } from '../content';
import { fillOrderSlots } from './orders';

/** A field plot. `crop` is null when empty; `plantedAt` is on the game clock. */
export interface PlotObject {
  id: number;
  kind: 'plot';
  x: number;
  y: number;
  crop: string | null;
  plantedAt: number;
}

export interface BarnObject {
  id: number;
  kind: 'barn';
  x: number;
  y: number;
}

export interface BoardObject {
  id: number;
  kind: 'board';
  x: number;
  y: number;
}

/** One animal in a pen. `fedAt` is on the game clock; null means it is hungry and waiting. */
export interface Animal {
  fedAt: number | null;
}

/** An animal home. `def` is the id in content/animals.ts. */
export interface PenObject {
  id: number;
  kind: 'pen';
  def: string;
  x: number;
  y: number;
  animals: Animal[];
}

/** One product being made. `readyAt` is on the game clock. */
export interface Job {
  recipe: string;
  readyAt: number;
}

/** A production building. `def` is the id in content/makers.ts. */
export interface MakerObject {
  id: number;
  kind: 'maker';
  def: string;
  x: number;
  y: number;
  /** How many jobs fit in the queue (waiting, being made and finished ones together). */
  slots: number;
  jobs: Job[];
}

/** A decoration. `def` is the id in content/decorations.ts. */
export interface DecoObject {
  id: number;
  kind: 'deco';
  def: string;
  x: number;
  y: number;
}

/** Everything standing on the farm grid. Positions are in tiles. */
export type FarmObject = PlotObject | BarnObject | BoardObject | PenObject | MakerObject | DecoObject;

/** The id of an object's entry in the content files (for its size, art and name). */
export function defIdOf(object: FarmObject): string {
  return 'def' in object ? object.def : object.kind;
}

export interface OrderWant {
  item: string;
  qty: number;
}

export interface Order {
  id: number;
  customer: string;
  wants: OrderWant[];
  coins: number;
  xp: number;
}

/** One place on the orders board: an order, or a wait until `readyAt` (game clock). */
export interface OrderSlot {
  order: Order | null;
  readyAt: number;
}

export interface GameState {
  /**
   * The game clock, in milliseconds. It only ever moves forward, and every timer
   * in the save is measured on it. See clock.ts.
   */
  time: number;
  /** The device time when the game clock was last moved. */
  wall: number;
  /** State of the random number generator. */
  seed: number;

  coins: number;
  level: number;
  /** XP earned inside the current level. */
  xp: number;

  barnLevel: number;
  /** Item id → how many are in the barn. */
  items: Record<string, number>;

  objects: FarmObject[];
  /** Ids of unlocked cloud patches. */
  patches: string[];
  orders: OrderSlot[];
  /** Next free id for objects and orders. */
  nextId: number;

  settings: {
    sound: boolean;
  };
  /** One-time notes the player has already seen. */
  seen: {
    installHint: boolean;
  };
  stats: {
    harvested: number;
    ordersDone: number;
    coinsEarned: number;
  };
}

/** A fresh farm. `wallNow` is the device time; `seed` makes the randomness repeatable. */
export function createNewGame(wallNow: number, seed: number): GameState {
  let nextId = 1;
  const objects: FarmObject[] = [
    { id: nextId++, kind: 'barn', ...startLayout.barn },
    { id: nextId++, kind: 'board', ...startLayout.board },
    ...startLayout.plots.map(
      (pos): PlotObject => ({ id: nextId++, kind: 'plot', x: pos.x, y: pos.y, crop: null, plantedAt: 0 }),
    ),
  ];

  const state: GameState = {
    time: 0,
    wall: wallNow,
    seed: seed >>> 0,
    coins: balance.startCoins,
    level: 1,
    xp: 0,
    barnLevel: 1,
    items: {},
    objects,
    patches: ['home'],
    orders: [],
    nextId,
    settings: { sound: true },
    seen: { installHint: false },
    stats: { harvested: 0, ordersDone: 0, coinsEarned: 0 },
  };
  fillOrderSlots(state);
  return state;
}

export function findPlot(state: GameState, id: number): PlotObject | undefined {
  const found = state.objects.find((object) => object.id === id);
  return found?.kind === 'plot' ? found : undefined;
}

export function findPen(state: GameState, id: number): PenObject | undefined {
  const found = state.objects.find((object) => object.id === id);
  return found?.kind === 'pen' ? found : undefined;
}

export function findMaker(state: GameState, id: number): MakerObject | undefined {
  const found = state.objects.find((object) => object.id === id);
  return found?.kind === 'maker' ? found : undefined;
}
