import {
  balance,
  getDeco,
  getMaker,
  getObjectDef,
  getPatch,
  getPen,
  patches,
  type LevelLimits,
  type PatchDef,
} from '../content';
import { fail, ok, type Result } from './result';
import { defIdOf, type FarmObject, type GameState } from './state';

/** True when the tile belongs to a cloud patch the player owns. */
export function isOwnedTile(state: GameState, x: number, y: number): boolean {
  return state.patches.some((id) => {
    const patch = getPatch(id);
    return patch !== undefined && x >= patch.x && x < patch.x + patch.w && y >= patch.y && y < patch.y + patch.h;
  });
}

function overlaps(ax: number, ay: number, aw: number, ah: number, object: FarmObject): boolean {
  const def = getObjectDef(defIdOf(object));
  const bw = def?.w ?? 1;
  const bh = def?.h ?? 1;
  return ax < object.x + bw && object.x < ax + aw && ay < object.y + bh && object.y < ay + ah;
}

/**
 * Can this kind of thing stand with its top-left corner on (x, y)?
 * Every tile must be on an owned patch and free. `ignoreId` is the object
 * being moved, so it does not block itself.
 */
export function canPlace(state: GameState, defId: string, x: number, y: number, ignoreId?: number): boolean {
  const def = getObjectDef(defId);
  if (!def || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  for (let dx = 0; dx < def.w; dx += 1) {
    for (let dy = 0; dy < def.h; dy += 1) {
      if (!isOwnedTile(state, x + dx, y + dy)) return false;
    }
  }
  return !state.objects.some((object) => object.id !== ignoreId && overlaps(x, y, def.w, def.h, object));
}

/** The free spot closest to (nearX, nearY), or null when the farm is full. */
export function findFreeSpot(
  state: GameState,
  defId: string,
  nearX: number,
  nearY: number,
  ignoreId?: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number; distance: number } | null = null;
  for (const id of state.patches) {
    const patch = getPatch(id);
    if (!patch) continue;
    for (let x = patch.x; x < patch.x + patch.w; x += 1) {
      for (let y = patch.y; y < patch.y + patch.h; y += 1) {
        const distance = (x - nearX) ** 2 + (y - nearY) ** 2;
        if (best && distance >= best.distance) continue;
        if (canPlace(state, defId, x, y, ignoreId)) best = { x, y, distance };
      }
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

export function countOwned(state: GameState, defId: string): number {
  return state.objects.filter((object) => defIdOf(object) === defId).length;
}

function limitAt(limits: LevelLimits, level: number): number {
  return limits.reduce((count, [fromLevel, allowed]) => (level >= fromLevel ? Math.max(count, allowed) : count), 0);
}

export interface ShopOffer {
  def: string;
  kind: 'plot' | 'pen' | 'maker' | 'deco';
  unlockLevel: number;
  /** Coins for the next one. */
  cost: number;
  owned: number;
  /** How many the player may own right now; null means no limit. */
  limit: number | null;
}

/** What the shop says about one thing: its price, and whether more can be bought. */
export function shopOffer(state: GameState, defId: string): ShopOffer | null {
  const owned = countOwned(state, defId);
  if (defId === 'plot') {
    const { costBase, costStep, limitBase, limitPerLevel, limitMax } = balance.plots;
    return {
      def: defId,
      kind: 'plot',
      unlockLevel: 1,
      cost: costBase + costStep * Math.max(0, owned - limitBase),
      owned,
      limit: Math.min(limitMax, limitBase + limitPerLevel * (state.level - 1)),
    };
  }
  const pen = getPen(defId);
  if (pen) {
    return { def: defId, kind: 'pen', unlockLevel: pen.unlockLevel, cost: pen.cost, owned, limit: limitAt(pen.limits, state.level) };
  }
  const maker = getMaker(defId);
  if (maker) {
    return {
      def: defId,
      kind: 'maker',
      unlockLevel: maker.unlockLevel,
      cost: maker.cost,
      owned,
      limit: limitAt(maker.limits, state.level),
    };
  }
  const deco = getDeco(defId);
  if (deco) return { def: defId, kind: 'deco', unlockLevel: deco.unlockLevel, cost: deco.cost, owned, limit: null };
  return null;
}

/** Why the next one cannot be bought right now, or null when it can (placement aside). */
export function buyBlocker(state: GameState, defId: string): 'not-found' | 'locked' | 'limit' | 'not-enough-coins' | null {
  const offer = shopOffer(state, defId);
  if (!offer) return 'not-found';
  if (state.level < offer.unlockLevel) return 'locked';
  if (offer.limit !== null && offer.owned >= offer.limit) return 'limit';
  if (state.coins < offer.cost) return 'not-enough-coins';
  return null;
}

/** Buys one thing from the shop and puts it on the farm at (x, y). */
export function buyObject(state: GameState, defId: string, x: number, y: number): Result {
  const blocker = buyBlocker(state, defId);
  if (blocker) return fail(blocker);
  const offer = shopOffer(state, defId);
  if (!offer) return fail('not-found');
  if (!canPlace(state, defId, x, y)) return fail('blocked');

  const id = state.nextId++;
  if (offer.kind === 'plot') {
    state.objects.push({ id, kind: 'plot', x, y, crop: null, plantedAt: 0 });
  } else if (offer.kind === 'pen') {
    // A new home comes with its first animal when that one is free.
    const firstIsFree = getPen(defId)?.animalCosts[0] === 0;
    state.objects.push({ id, kind: 'pen', def: defId, x, y, animals: firstIsFree ? [{ fedAt: null }] : [] });
  } else if (offer.kind === 'maker') {
    state.objects.push({ id, kind: 'maker', def: defId, x, y, slots: getMaker(defId)?.slots ?? 1, jobs: [] });
  } else {
    state.objects.push({ id, kind: 'deco', def: defId, x, y });
  }
  state.coins -= offer.cost;
  return ok([{ type: 'bought', objectId: id, def: defId }]);
}

/** Moves anything on the farm to a new free spot. Timers and contents come along. */
export function moveObject(state: GameState, objectId: number, x: number, y: number): Result {
  const object = state.objects.find((entry) => entry.id === objectId);
  if (!object) return fail('not-found');
  if (!canPlace(state, defIdOf(object), x, y, object.id)) return fail('blocked');
  object.x = x;
  object.y = y;
  return ok([{ type: 'moved', objectId }]);
}

/** Puts a decoration away and gives its full price back. */
export function removeDecoration(state: GameState, objectId: number): Result {
  const object = state.objects.find((entry) => entry.id === objectId);
  if (!object || object.kind !== 'deco') return fail('not-found');
  const coins = getDeco(object.def)?.cost ?? 0;
  state.objects.splice(state.objects.indexOf(object), 1);
  state.coins += coins;
  return ok([{ type: 'removed', objectId, def: object.def, coins }]);
}

function touches(a: PatchDef, b: PatchDef): boolean {
  const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
  const overlapY = a.y < b.y + b.h && b.y < a.y + a.h;
  const sideBySide = (a.x + a.w === b.x || b.x + b.w === a.x) && overlapY;
  const stacked = (a.y + a.h === b.y || b.y + b.h === a.y) && overlapX;
  return sideBySide || stacked;
}

/** Patches the player does not own yet but that touch the farm, so they can be shown and bought. */
export function nextPatches(state: GameState): PatchDef[] {
  const owned = state.patches.map(getPatch).filter((patch): patch is PatchDef => patch !== undefined);
  return patches.filter(
    (patch) => !state.patches.includes(patch.id) && owned.some((mine) => touches(mine, patch)),
  );
}

export function buyPatch(state: GameState, patchId: string): Result {
  const patch = nextPatches(state).find((entry) => entry.id === patchId);
  if (!patch) return fail('not-found');
  if (state.level < patch.unlockLevel) return fail('locked');
  if (state.coins < patch.cost) return fail('not-enough-coins');
  state.coins -= patch.cost;
  state.patches.push(patch.id);
  return ok([{ type: 'patch-bought', patch: patch.id }]);
}
