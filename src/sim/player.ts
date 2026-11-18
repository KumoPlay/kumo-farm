import { crops, decorations, getPen, getRecipe, items, makers, patches, pens, recipes, recipesOf } from '../content';
import { HOUR, MIN, SEC } from '../content/time';
import {
  barnCapacity,
  barnFree,
  barnUpgradeCost,
  barnUsed,
  buyAnimal,
  buyBlocker,
  buyObject,
  buyPatch,
  buyQueueSlot,
  canFulfill,
  collectFromMaker,
  collectFromPen,
  createNewGame,
  feedAnimals,
  findFreeSpot,
  fulfillOrder,
  harvestPlot,
  itemCount,
  makerSummary,
  nextAnimalCost,
  nextPatches,
  nextSlotCost,
  penSummary,
  plantCrop,
  plotGrowth,
  sellItems,
  shopOffer,
  skipOrder,
  startRecipe,
  tick,
  upgradeBarn,
  type GameState,
  type MakerObject,
  type PenObject,
  type PlotObject,
} from '../core';

/**
 * A pretend player for checking the balance. It plays the real game rules on a
 * schedule of visits, the way a sensible (not perfect) player would, and
 * records when each level is reached. Nothing here is used by the game itself.
 */

const DAY = 24 * HOUR;

export interface Visit {
  /** Minutes after midnight. */
  at: number;
  /** How long the visit lasts, in minutes. */
  minutes: number;
}

export interface PlayerProfile {
  name: string;
  visits: Visit[];
}

/** Typical ways of playing, from "once a day" to "a few quick visits plus a longer evening". */
export const profiles: PlayerProfile[] = [
  { name: 'Once a day, 3 min', visits: [{ at: 19 * 60, minutes: 3 }] },
  {
    name: '4 quick visits a day',
    visits: [
      { at: 8 * 60, minutes: 3 },
      { at: 12 * 60 + 30, minutes: 3 },
      { at: 17 * 60, minutes: 3 },
      { at: 20 * 60 + 30, minutes: 3 },
    ],
  },
  {
    name: '3 quick visits + 20 min evening',
    visits: [
      { at: 8 * 60, minutes: 3 },
      { at: 12 * 60 + 30, minutes: 3 },
      { at: 16 * 60, minutes: 3 },
      { at: 19 * 60 + 30, minutes: 20 },
    ],
  },
];

/** The pretend player taps something about every this many seconds while playing. */
const STEP_MS = 15 * SEC;

export interface LevelReached {
  level: number;
  /** Days since the first visit (0 = the first day). */
  day: number;
  /** The same, with the time of day: 2.5 is noon on the third day. */
  atDay: number;
  /** Total time spent playing until then, in minutes. */
  playedMinutes: number;
  coins: number;
}

export interface SimResult {
  profile: string;
  levels: LevelReached[];
  /** What was bought from the shop, and when. */
  bought: { def: string; day: number; level: number }[];
  finalLevel: number;
}

/** The longest time, in days, between two level-ups up to `upToLevel` (counted from the first visit). */
export function longestWait(result: SimResult, upToLevel: number): number {
  let previous = 0;
  let longest = 0;
  for (const entry of result.levels) {
    if (entry.level > upToLevel) break;
    longest = Math.max(longest, entry.atDay - previous);
    previous = entry.atDay;
  }
  return longest;
}

/** The highest level whose unlocks matter: after it, levels only bring coins. */
export const LAST_UNLOCK_LEVEL = Math.max(
  ...[...crops, ...pens, ...makers, ...recipes, ...decorations, ...patches].map((entry) => entry.unlockLevel),
);

/** Items still needed for the open orders and hungry animals, after what is in the barn or on its way. */
function shortages(state: GameState): { short: Map<string, number>; wanted: Map<string, number> } {
  const wanted = new Map<string, number>();
  const bump = (id: string, qty: number): void => void wanted.set(id, (wanted.get(id) ?? 0) + qty);
  for (const slot of state.orders) for (const want of slot.order?.wants ?? []) bump(want.item, want.qty);

  const incoming = new Map<string, number>();
  const coming = (id: string, qty: number): void => void incoming.set(id, (incoming.get(id) ?? 0) + qty);
  for (const object of state.objects) {
    if (object.kind === 'plot' && object.crop) coming(object.crop, 1);
    if (object.kind === 'maker') object.jobs.forEach((job) => coming(job.recipe, 1));
    if (object.kind === 'pen') {
      const def = getPen(object.def);
      const summary = penSummary(state, object);
      if (def) {
        coming(def.product, summary.busy + summary.ready);
        bump(def.feed.item, summary.hungry * def.feed.qty);
      }
    }
  }

  // Products first, then animal goods, then crops: each shortage adds to what it is made from.
  const short = new Map<string, number>();
  for (const item of [...items].reverse()) {
    const missing = (wanted.get(item.id) ?? 0) - itemCount(state, item.id) - (incoming.get(item.id) ?? 0);
    if (missing <= 0) continue;
    short.set(item.id, missing);
    getRecipe(item.id)?.ingredients.forEach((need) => bump(need.item, need.qty * missing));
    const pen = pens.find((entry) => entry.product === item.id);
    if (pen) bump(pen.feed.item, pen.feed.qty * missing);
  }
  return { short, wanted };
}

/** Sells what nothing needs, when the barn is nearly full. */
function makeRoom(state: GameState): void {
  if (barnFree(state) >= 8) return;
  const { wanted } = shortages(state);
  const extras = Object.entries(state.items)
    .map(([item, count]) => ({ item, extra: count - (wanted.get(item) ?? 0) }))
    .filter((entry) => entry.extra > 0)
    .sort((a, b) => b.extra - a.extra);
  for (const { item, extra } of extras) {
    if (barnFree(state) >= 15) break;
    sellItems(state, item, Math.min(extra, 15 - barnFree(state)));
  }
}

function plant(state: GameState, backInMs: number): void {
  const { short } = shortages(state);
  const empty = state.objects.filter(
    (object): object is PlotObject => object.kind === 'plot' && plotGrowth(state, object).stage === 'empty',
  );
  for (const plot of empty) {
    const fitting = crops.filter((crop) => crop.unlockLevel <= state.level && crop.growMs <= backInMs);
    if (fitting.length === 0) return;
    const needed = fitting.filter((crop) => (short.get(crop.id) ?? 0) > 0);
    const pool = needed.length > 0 ? needed : fitting;
    const crop = pool.reduce((best, next) => (next.value > best.value ? next : best));
    if (plantCrop(state, plot.id, crop.id).ok && short.has(crop.id)) short.set(crop.id, (short.get(crop.id) ?? 1) - 1);
  }
}

function produce(state: GameState): void {
  for (const maker of state.objects.filter((object): object is MakerObject => object.kind === 'maker')) {
    while (makerSummary(state, maker).free > 0) {
      const { short } = shortages(state);
      const recipe = recipesOf(maker.def)
        .filter((entry) => (short.get(entry.id) ?? 0) > 0 && entry.unlockLevel <= state.level)
        .find((entry) => entry.ingredients.every((need) => itemCount(state, need.item) >= need.qty));
      if (!recipe || !startRecipe(state, maker.id, recipe.id).ok) break;
    }
  }
}

function shop(state: GameState): string[] {
  const bought: string[] = [];
  const place = (def: string): boolean => {
    const spot = findFreeSpot(state, def, 3, 3);
    if (!spot || !buyObject(state, def, spot.x, spot.y).ok) return false;
    bought.push(def);
    return true;
  };

  const upgrade = barnUpgradeCost(state);
  if (upgrade !== null && barnUsed(state) >= barnCapacity(state) * 0.8 && state.coins >= upgrade) upgradeBarn(state);

  // New animal homes and buildings come first; they open up the most.
  for (const def of [...pens, ...makers].map((entry) => entry.id)) {
    if (buyBlocker(state, def) === null && !place(def)) {
      const patch = nextPatches(state).find((entry) => entry.unlockLevel <= state.level);
      if (patch && buyPatch(state, patch.id).ok) place(def);
    }
  }
  for (const pen of state.objects.filter((object): object is PenObject => object.kind === 'pen')) {
    const cost = nextAnimalCost(pen);
    if (cost !== null && state.coins >= cost + 20) buyAnimal(state, pen.id);
  }
  // Keep a little money for the next building that unlocks.
  const nextBig = [...pens, ...makers]
    .filter((entry) => entry.unlockLevel > state.level)
    .reduce((cheapest, entry) => Math.min(cheapest, entry.cost), Number.POSITIVE_INFINITY);
  const reserve = Number.isFinite(nextBig) ? Math.min(nextBig, 150) : 0;
  while (buyBlocker(state, 'plot') === null && state.coins >= (shopOffer(state, 'plot')?.cost ?? 0) + reserve) {
    if (!place('plot')) {
      const patch = nextPatches(state).find((entry) => entry.unlockLevel <= state.level);
      if (!patch || state.coins < patch.cost + reserve || !buyPatch(state, patch.id).ok) break;
    }
  }
  for (const maker of state.objects.filter((object): object is MakerObject => object.kind === 'maker')) {
    const cost = nextSlotCost(maker);
    if (cost !== null && state.coins >= cost * 2 + reserve) buyQueueSlot(state, maker.id);
  }
  return bought;
}

/** One tap-around of the farm: collect, deliver, feed, make, buy, plant. */
function playStep(state: GameState, backInMs: number, orderSeen: Map<number, number>): string[] {
  for (const object of state.objects) {
    if (object.kind === 'plot') harvestPlot(state, object.id);
    if (object.kind === 'pen') collectFromPen(state, object.id);
    if (object.kind === 'maker') collectFromMaker(state, object.id);
  }
  makeRoom(state);
  for (const object of state.objects) if (object.kind === 'plot') harvestPlot(state, object.id);

  state.orders.forEach((slot, index) => {
    if (slot.order && canFulfill(state, slot.order)) fulfillOrder(state, index);
  });
  // An order that has waited two days is skipped, as a player would.
  state.orders.forEach((slot, index) => {
    if (!slot.order) return;
    const since = orderSeen.get(slot.order.id) ?? state.time;
    orderSeen.set(slot.order.id, since);
    if (state.time - since > 2 * DAY) skipOrder(state, index);
  });

  for (const object of state.objects) if (object.kind === 'pen') feedAnimals(state, object.id);
  produce(state);
  const bought = shop(state);
  for (const object of state.objects) if (object.kind === 'pen') feedAnimals(state, object.id);
  plant(state, backInMs);
  return bought;
}

/** Plays `days` days of the profile's visits on a brand-new farm. */
export function simulate(profile: PlayerProfile, days: number, seed = 1): SimResult {
  const start = Date.UTC(2026, 0, 1);
  const state = createNewGame(start, seed);
  const visits = [...profile.visits].sort((a, b) => a.at - b.at);
  const levels: LevelReached[] = [];
  const bought: SimResult['bought'] = [];
  const orderSeen = new Map<number, number>();
  let played = 0;

  for (let day = 0; day < days; day += 1) {
    visits.forEach((visit, index) => {
      const begin = start + day * DAY + visit.at * MIN;
      const end = begin + visit.minutes * MIN;
      const following = visits[index + 1];
      const nextBegin = following
        ? start + day * DAY + following.at * MIN
        : start + (day + 1) * DAY + (visits[0]?.at ?? 0) * MIN;
      if (day === 0 && index === 0) {
        // The game clock starts when the farm is made, at the first visit.
        state.wall = begin;
      }
      for (let now = begin; now <= end; now += STEP_MS) {
        tick(state, now);
        const last = now + STEP_MS > end;
        const before = state.level;
        const newThings = playStep(state, last ? nextBegin - now : end - now, orderSeen);
        newThings.forEach((def) => bought.push({ def, day, level: state.level }));
        played += STEP_MS / MIN;
        for (let level = before + 1; level <= state.level; level += 1) {
          const atDay = (now - (start + (visits[0]?.at ?? 0) * MIN)) / DAY;
          levels.push({ level, day, atDay, playedMinutes: Math.round(played), coins: state.coins });
        }
      }
    });
  }
  return { profile: profile.name, levels, bought, finalLevel: state.level };
}

/** A small text table of a result, for reading in the terminal. */
export function report(result: SimResult): string {
  const lines = [`${result.profile}: level ${result.finalLevel} at the end`];
  for (const entry of result.levels) {
    lines.push(
      `  level ${String(entry.level).padStart(2)}  day ${String(entry.day + 1).padStart(3)}` +
        `  after ${String(entry.playedMinutes).padStart(4)} min of play  (${entry.coins} coins)`,
    );
  }
  const firsts = new Map<string, { day: number; level: number }>();
  for (const entry of result.bought) if (!firsts.has(entry.def) && entry.def !== 'plot') firsts.set(entry.def, entry);
  for (const [def, entry] of firsts) lines.push(`  bought ${def} on day ${entry.day + 1} (level ${entry.level})`);
  lines.push(
    `  longest wait for a level up to level ${LAST_UNLOCK_LEVEL}: ${longestWait(result, LAST_UNLOCK_LEVEL).toFixed(1)} days`,
  );
  return lines.join('\n');
}
