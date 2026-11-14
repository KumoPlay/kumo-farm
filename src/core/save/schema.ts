import {
  balance,
  customers,
  getCrop,
  getDeco,
  getItem,
  getMaker,
  getPatch,
  getPen,
  getRecipe,
  startLayout,
} from '../../content';
import { fillOrderSlots } from '../orders';
import type { Animal, FarmObject, GameState, Job, Order, OrderSlot, OrderWant } from '../state';

/**
 * The save format version. Raise it by one whenever the shape of GameState
 * changes, and add a matching step in migrations.ts.
 */
export const SAVE_VERSION = 2;
export const SAVE_APP = 'kumo-farm';

/** What is written to storage and into backup codes. */
export interface SaveFile {
  app: typeof SAVE_APP;
  /** Save format version this file was written with. */
  v: number;
  /** Counts up with every save. The highest number is the newest save. */
  rev: number;
  state: unknown;
}

export type SaveErrorCode = 'not-a-save' | 'corrupt' | 'too-new';

export class SaveError extends Error {
  readonly code: SaveErrorCode;
  constructor(code: SaveErrorCode) {
    super(`Save problem: ${code}`);
    this.name = 'SaveError';
    this.code = code;
  }
}

export function toSaveFile(state: GameState, rev: number): SaveFile {
  return { app: SAVE_APP, v: SAVE_VERSION, rev, state };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Checks the outer wrapper of a save. Throws SaveError when it is not one of ours. */
export function asSaveFile(raw: unknown): SaveFile {
  if (!isRecord(raw) || raw.app !== SAVE_APP) throw new SaveError('not-a-save');
  if (!Number.isInteger(raw.v) || (raw.v as number) < 0 || !isRecord(raw.state)) throw new SaveError('corrupt');
  return { app: SAVE_APP, v: raw.v as number, rev: wholeNumber(raw.rev, 0), state: raw.state };
}

function finiteNumber(value: unknown, fallback: number, min = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, value) : fallback;
}

function wholeNumber(value: unknown, fallback: number, min = 0): number {
  return Math.floor(finiteNumber(value, fallback, min));
}

function readItems(raw: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  if (!isRecord(raw)) return result;
  for (const [id, count] of Object.entries(raw)) {
    const qty = wholeNumber(count, 0);
    if (qty > 0 && getItem(id)) result[id] = qty;
  }
  return result;
}

function readAnimals(raw: unknown, most: number, time: number): Animal[] {
  return (Array.isArray(raw) ? raw : []).slice(0, most).map((entry): Animal => {
    const fedAt = isRecord(entry) && typeof entry.fedAt === 'number' && Number.isFinite(entry.fedAt) ? entry.fedAt : null;
    // Fed in the future would mean a timer longer than it should be; treat it as fed just now.
    return { fedAt: fedAt === null ? null : Math.min(Math.max(0, fedAt), time) };
  });
}

function readJobs(raw: unknown, makerId: string, slots: number, time: number): Job[] {
  const jobs: Job[] = [];
  // Jobs are made one after another, so none can be ready later than "the one before, plus its own time".
  let earliestStart = time;
  for (const entry of Array.isArray(raw) ? raw : []) {
    if (jobs.length >= slots) break;
    if (!isRecord(entry) || typeof entry.recipe !== 'string') continue;
    const recipe = getRecipe(entry.recipe);
    if (!recipe || recipe.maker !== makerId) continue;
    const readyAt = Math.min(finiteNumber(entry.readyAt, time), earliestStart + recipe.timeMs);
    jobs.push({ recipe: recipe.id, readyAt });
    earliestStart = Math.max(earliestStart, readyAt);
  }
  return jobs;
}

function readObjects(raw: unknown, time: number): FarmObject[] {
  const result: FarmObject[] = [];
  const seen = new Set<number>();
  for (const entry of Array.isArray(raw) ? raw : []) {
    if (!isRecord(entry) || typeof entry.kind !== 'string') continue;
    const id = wholeNumber(entry.id, 0);
    if (id <= 0 || seen.has(id)) continue;
    const x = wholeNumber(entry.x, 0, -1000);
    const y = wholeNumber(entry.y, 0, -1000);
    const def = typeof entry.def === 'string' ? entry.def : '';

    if (entry.kind === 'plot') {
      const crop = typeof entry.crop === 'string' && getCrop(entry.crop) ? entry.crop : null;
      // A planting time in the future would make a negative timer; pull it back to "just planted".
      const plantedAt = crop ? Math.min(finiteNumber(entry.plantedAt, time), time) : 0;
      result.push({ id, kind: 'plot', x, y, crop, plantedAt });
    } else if (entry.kind === 'barn' || entry.kind === 'board') {
      result.push({ id, kind: entry.kind, x, y });
    } else if (entry.kind === 'pen') {
      const pen = getPen(def);
      if (!pen) continue;
      result.push({ id, kind: 'pen', def, x, y, animals: readAnimals(entry.animals, pen.animalCosts.length, time) });
    } else if (entry.kind === 'maker') {
      const maker = getMaker(def);
      if (!maker) continue;
      const slots = Math.min(wholeNumber(entry.slots, maker.slots, maker.slots), maker.slots + maker.slotCosts.length);
      result.push({ id, kind: 'maker', def, x, y, slots, jobs: readJobs(entry.jobs, def, slots, time) });
    } else if (entry.kind === 'deco') {
      if (!getDeco(def)) continue;
      result.push({ id, kind: 'deco', def, x, y });
    } else {
      continue;
    }
    seen.add(id);
  }
  return result;
}

function readOrder(raw: unknown): Order | null {
  if (!isRecord(raw) || !Array.isArray(raw.wants)) return null;
  const wants: OrderWant[] = [];
  for (const want of raw.wants) {
    if (!isRecord(want) || typeof want.item !== 'string' || !getItem(want.item)) return null;
    const qty = wholeNumber(want.qty, 0);
    if (qty <= 0) return null;
    wants.push({ item: want.item, qty });
  }
  if (wants.length === 0) return null;
  const customer = typeof raw.customer === 'string' && customers.includes(raw.customer) ? raw.customer : customers[0];
  if (!customer) return null;
  return {
    id: wholeNumber(raw.id, 0),
    customer,
    wants,
    coins: wholeNumber(raw.coins, 1, 1),
    xp: wholeNumber(raw.xp, 1, 1),
  };
}

function readOrders(raw: unknown, time: number): OrderSlot[] {
  const latestWait = time + balance.orders.skipWaitMs;
  return (Array.isArray(raw) ? raw : []).map((entry): OrderSlot => {
    const order = isRecord(entry) ? readOrder(entry.order) : null;
    if (order) return { order, readyAt: 0 };
    const readyAt = isRecord(entry) ? finiteNumber(entry.readyAt, time) : time;
    return { order: null, readyAt: Math.min(readyAt, latestWait) };
  });
}

/**
 * Turns loaded data into a GameState the game can trust: missing or broken
 * values get safe defaults, unknown items are dropped, and timers are kept in
 * range. Throws SaveError('corrupt') only when there is nothing to work with.
 */
export function normalizeState(raw: unknown, wallNow: number): GameState {
  if (!isRecord(raw)) throw new SaveError('corrupt');

  const time = finiteNumber(raw.time, 0);
  const objects = readObjects(raw.objects, time);
  let nextId = wholeNumber(raw.nextId, 1, 1);
  const bumpNextId = (id: number): void => {
    if (id >= nextId) nextId = id + 1;
  };
  objects.forEach((object) => bumpNextId(object.id));

  // The barn and the orders board must always exist.
  if (!objects.some((object) => object.kind === 'barn')) {
    objects.push({ id: nextId++, kind: 'barn', ...startLayout.barn });
  }
  if (!objects.some((object) => object.kind === 'board')) {
    objects.push({ id: nextId++, kind: 'board', ...startLayout.board });
  }

  const orders = readOrders(raw.orders, time);
  orders.forEach((slot) => slot.order && bumpNextId(slot.order.id));

  const patchIds = (Array.isArray(raw.patches) ? raw.patches : []).filter(
    (id): id is string => typeof id === 'string' && getPatch(id) !== undefined,
  );
  const patches = [...new Set(['home', ...patchIds])];

  const settings = isRecord(raw.settings) ? raw.settings : {};
  const seenNotes = isRecord(raw.seen) ? raw.seen : {};
  const stats = isRecord(raw.stats) ? raw.stats : {};

  const state: GameState = {
    time,
    wall: finiteNumber(raw.wall, wallNow, Number.NEGATIVE_INFINITY),
    seed: wholeNumber(raw.seed, 1) >>> 0,
    coins: wholeNumber(raw.coins, 0),
    level: wholeNumber(raw.level, 1, 1),
    xp: wholeNumber(raw.xp, 0),
    barnLevel: Math.min(wholeNumber(raw.barnLevel, 1, 1), balance.barn.capacities.length),
    items: readItems(raw.items),
    objects,
    patches,
    orders,
    nextId,
    settings: { sound: settings.sound !== false },
    seen: { installHint: seenNotes.installHint === true },
    stats: {
      harvested: wholeNumber(stats.harvested, 0),
      ordersDone: wholeNumber(stats.ordersDone, 0),
      coinsEarned: wholeNumber(stats.coinsEarned, 0),
    },
  };
  fillOrderSlots(state);
  return state;
}
