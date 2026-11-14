import { getItem, getPen, type PenDef } from '../content';
import { addItems, barnFree, itemCount, removeItems } from './barn';
import { addXp } from './economy';
import { fail, ok, type GameEvent, type Result } from './result';
import { findPen, type Animal, type GameState, type PenObject } from './state';

export type AnimalMood = 'hungry' | 'busy' | 'ready';

export interface AnimalStatus {
  mood: AnimalMood;
  /** 0 when just fed, 1 when the product is ready. */
  progress: number;
  remainingMs: number;
}

/** A hungry animal simply waits. Nothing ever goes wrong while the player is away. */
export function animalStatus(state: GameState, def: PenDef, animal: Animal): AnimalStatus {
  if (animal.fedAt === null) return { mood: 'hungry', progress: 0, remainingMs: 0 };
  const elapsed = Math.max(0, state.time - animal.fedAt);
  const remainingMs = Math.max(0, def.produceMs - elapsed);
  const progress = def.produceMs > 0 ? Math.min(1, elapsed / def.produceMs) : 1;
  return { mood: remainingMs === 0 ? 'ready' : 'busy', progress, remainingMs };
}

export interface PenSummary {
  hungry: number;
  busy: number;
  ready: number;
  /** Time until the next product, or 0 when nothing is being made. */
  nextReadyMs: number;
}

export function penSummary(state: GameState, pen: PenObject): PenSummary {
  const summary: PenSummary = { hungry: 0, busy: 0, ready: 0, nextReadyMs: 0 };
  const def = getPen(pen.def);
  if (!def) return summary;
  for (const animal of pen.animals) {
    const status = animalStatus(state, def, animal);
    summary[status.mood] += 1;
    if (status.mood === 'busy' && (summary.nextReadyMs === 0 || status.remainingMs < summary.nextReadyMs)) {
      summary.nextReadyMs = status.remainingMs;
    }
  }
  return summary;
}

/** Feeds as many hungry animals as the barn has feed for. */
export function feedAnimals(state: GameState, penId: number): Result {
  const pen = findPen(state, penId);
  const def = pen ? getPen(pen.def) : undefined;
  if (!pen || !def) return fail('not-found');
  const hungry = pen.animals.filter((animal) => animal.fedAt === null);
  if (hungry.length === 0) return fail('empty');
  const portions = Math.floor(itemCount(state, def.feed.item) / def.feed.qty);
  const count = Math.min(hungry.length, portions);
  if (count === 0) return fail('not-enough-items');
  removeItems(state, def.feed.item, count * def.feed.qty);
  hungry.slice(0, count).forEach((animal) => {
    animal.fedAt = state.time;
  });
  return ok([{ type: 'fed', objectId: pen.id, count }]);
}

/** Collects every ready product the barn has room for. The animals are then hungry again. */
export function collectFromPen(state: GameState, penId: number): Result {
  const pen = findPen(state, penId);
  const def = pen ? getPen(pen.def) : undefined;
  const product = def ? getItem(def.product) : undefined;
  if (!pen || !def || !product) return fail('not-found');
  const ready = pen.animals.filter((animal) => animalStatus(state, def, animal).mood === 'ready');
  if (ready.length === 0) return fail('not-ready');
  const count = Math.min(ready.length, barnFree(state));
  if (count === 0) return fail('barn-full');
  ready.slice(0, count).forEach((animal) => {
    animal.fedAt = null;
  });
  addItems(state, product.id, count);
  const events: GameEvent[] = [{ type: 'collected', objectId: pen.id, item: product.id, qty: count }];
  addXp(state, product.xp * count, events);
  return ok(events);
}

/** Coins for the next animal in this pen, or null when it is full. */
export function nextAnimalCost(pen: PenObject): number | null {
  return getPen(pen.def)?.animalCosts[pen.animals.length] ?? null;
}

export function buyAnimal(state: GameState, penId: number): Result {
  const pen = findPen(state, penId);
  const def = pen ? getPen(pen.def) : undefined;
  if (!pen || !def) return fail('not-found');
  const cost = nextAnimalCost(pen);
  if (cost === null) return fail('max-level');
  if (state.coins < cost) return fail('not-enough-coins');
  state.coins -= cost;
  pen.animals.push({ fedAt: null });
  return ok([{ type: 'animal-bought', objectId: pen.id, animal: def.animal }]);
}
