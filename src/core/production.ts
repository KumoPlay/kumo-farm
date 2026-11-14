import { getMaker, getRecipe } from '../content';
import { addItems, barnFree, itemCount, removeItems } from './barn';
import { addXp } from './economy';
import { fail, ok, type GameEvent, type Result } from './result';
import { findMaker, type GameState, type Job, type MakerObject } from './state';

export type JobStage = 'waiting' | 'making' | 'done';

export interface JobStatus {
  recipe: string;
  stage: JobStage;
  /** 0 when it starts, 1 when done. */
  progress: number;
  /** Time until this job is done, counting the jobs before it. */
  remainingMs: number;
}

/** Jobs are made one after another. Finished ones wait in the building until collected. */
export function jobStatus(state: GameState, job: Job): JobStatus {
  const timeMs = getRecipe(job.recipe)?.timeMs ?? 0;
  const remainingMs = Math.max(0, job.readyAt - state.time);
  if (remainingMs === 0) return { recipe: job.recipe, stage: 'done', progress: 1, remainingMs: 0 };
  if (remainingMs > timeMs) return { recipe: job.recipe, stage: 'waiting', progress: 0, remainingMs };
  return { recipe: job.recipe, stage: 'making', progress: timeMs > 0 ? 1 - remainingMs / timeMs : 1, remainingMs };
}

export interface MakerSummary {
  done: number;
  /** Jobs waiting or being made. */
  busy: number;
  free: number;
  /** Time until the next product, or 0 when nothing is being made. */
  nextReadyMs: number;
}

export function makerSummary(state: GameState, maker: MakerObject): MakerSummary {
  const statuses = maker.jobs.map((job) => jobStatus(state, job));
  const done = statuses.filter((status) => status.stage === 'done').length;
  const making = statuses.filter((status) => status.stage !== 'done');
  return {
    done,
    busy: making.length,
    free: Math.max(0, maker.slots - maker.jobs.length),
    nextReadyMs: making.length > 0 ? Math.min(...making.map((status) => status.remainingMs)) : 0,
  };
}

/** Takes the ingredients from the barn and adds the recipe to the building's queue. */
export function startRecipe(state: GameState, makerId: number, recipeId: string): Result {
  const maker = findMaker(state, makerId);
  const recipe = getRecipe(recipeId);
  if (!maker || !recipe || recipe.maker !== maker.def) return fail('not-found');
  if (state.level < recipe.unlockLevel) return fail('locked');
  if (maker.jobs.length >= maker.slots) return fail('queue-full');
  if (recipe.ingredients.some((need) => itemCount(state, need.item) < need.qty)) return fail('not-enough-items');

  for (const need of recipe.ingredients) removeItems(state, need.item, need.qty);
  const lastReadyAt = maker.jobs.reduce((latest, job) => Math.max(latest, job.readyAt), state.time);
  maker.jobs.push({ recipe: recipe.id, readyAt: lastReadyAt + recipe.timeMs });
  return ok([{ type: 'job-started', objectId: maker.id, recipe: recipe.id }]);
}

/** Moves every finished product the barn has room for into the barn. */
export function collectFromMaker(state: GameState, makerId: number): Result {
  const maker = findMaker(state, makerId);
  if (!maker) return fail('not-found');
  const done = maker.jobs.filter((job) => jobStatus(state, job).stage === 'done');
  if (done.length === 0) return fail('not-ready');
  const taking = done.slice(0, barnFree(state));
  if (taking.length === 0) return fail('barn-full');

  const events: GameEvent[] = [];
  let xp = 0;
  for (const job of taking) {
    const recipe = getRecipe(job.recipe);
    maker.jobs.splice(maker.jobs.indexOf(job), 1);
    if (!recipe) continue;
    addItems(state, recipe.id, 1);
    xp += recipe.xp;
    const earlier = events.find((event) => event.type === 'collected' && event.item === recipe.id);
    if (earlier?.type === 'collected') earlier.qty += 1;
    else events.push({ type: 'collected', objectId: maker.id, item: recipe.id, qty: 1 });
  }
  addXp(state, xp, events);
  return ok(events);
}

/** Coins for one more queue place, or null when the queue is as long as it gets. */
export function nextSlotCost(maker: MakerObject): number | null {
  const def = getMaker(maker.def);
  if (!def) return null;
  return def.slotCosts[maker.slots - def.slots] ?? null;
}

export function buyQueueSlot(state: GameState, makerId: number): Result {
  const maker = findMaker(state, makerId);
  if (!maker) return fail('not-found');
  const cost = nextSlotCost(maker);
  if (cost === null) return fail('max-level');
  if (state.coins < cost) return fail('not-enough-coins');
  state.coins -= cost;
  maker.slots += 1;
  return ok([{ type: 'slot-bought', objectId: maker.id, slots: maker.slots }]);
}
