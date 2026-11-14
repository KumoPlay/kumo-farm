import {
  balance,
  customers,
  getCrop,
  getItem,
  getRecipe,
  items,
  pens,
  type ItemDef,
  type OrderSlotDef,
} from '../content';
import { itemCount, removeItems } from './barn';
import { addXp } from './economy';
import { fail, ok, type GameEvent, type Result } from './result';
import { pickWeighted, randomInt } from './rng';
import type { GameState, Order, OrderWant } from './state';

/**
 * Can the player make this item on their farm today? Crops need the level;
 * animal goods need the animal home with an animal in it; products need the
 * building, the level, and every ingredient to be makeable too.
 */
export function canMake(state: GameState, itemId: string, depth = 0): boolean {
  if (depth > 8) return false;
  const crop = getCrop(itemId);
  if (crop) return state.level >= crop.unlockLevel;
  const recipe = getRecipe(itemId);
  if (recipe) {
    return (
      state.level >= recipe.unlockLevel &&
      state.objects.some((object) => object.kind === 'maker' && object.def === recipe.maker) &&
      recipe.ingredients.every((need) => canMake(state, need.item, depth + 1))
    );
  }
  return pens.some(
    (pen) =>
      pen.product === itemId &&
      state.objects.some((object) => object.kind === 'pen' && object.def === pen.id && object.animals.length > 0) &&
      canMake(state, pen.feed.item, depth + 1),
  );
}

/** Items an order may ask for right now: only things the player can actually make. */
export function orderableItems(state: GameState): ItemDef[] {
  return items.filter((item) => canMake(state, item.id));
}

function slotPool(state: GameState, slotDef: OrderSlotDef): ItemDef[] {
  const available = orderableItems(state);
  if (slotDef.pool !== 'easy') return available;
  const cheapestFirst = [...available].sort((a, b) => a.value - b.value);
  return cheapestFirst.slice(0, Math.max(2, Math.ceil(cheapestFirst.length / 2)));
}

/** Builds a new order for one slot of the board. */
export function makeOrder(state: GameState, slotIndex: number): Order | null {
  const slotDef = balance.orders.slots[slotIndex];
  if (!slotDef) return null;
  const pool = slotPool(state, slotDef);
  if (pool.length === 0) return null;

  // Items the other open orders already ask for are picked less often, for variety.
  const wantedElsewhere = new Set<string>();
  const busyCustomers = new Set<string>();
  state.orders.forEach((slot, index) => {
    if (index === slotIndex || !slot.order) return;
    busyCustomers.add(slot.order.customer);
    slot.order.wants.forEach((want) => wantedElsewhere.add(want.item));
  });

  const typeCount = Math.min(pool.length, randomInt(state, slotDef.types[0], slotDef.types[1]));
  const wants: OrderWant[] = [];
  const remaining = [...pool];
  while (wants.length < typeCount && remaining.length > 0) {
    const picked = pickWeighted(state, remaining, (item) => (wantedElsewhere.has(item.id) ? 0.3 : 1));
    if (!picked) break;
    remaining.splice(remaining.indexOf(picked), 1);
    const base = randomInt(state, picked.orderQty[0], picked.orderQty[1]);
    wants.push({ item: picked.id, qty: Math.max(1, Math.round(base * slotDef.qtyScale)) });
  }

  let value = 0;
  let xp = 0;
  for (const want of wants) {
    const def = getItem(want.item);
    if (!def) continue;
    value += def.value * want.qty;
    xp += def.xp * want.qty;
  }

  const freeCustomers = customers.filter((id) => !busyCustomers.has(id));
  const customerPool = freeCustomers.length > 0 ? freeCustomers : customers;
  const customer = customerPool[randomInt(state, 0, customerPool.length - 1)] ?? 'poko';

  return {
    id: state.nextId++,
    customer,
    wants,
    coins: Math.max(1, Math.round(value * balance.orders.coinFactor)),
    xp: Math.max(1, Math.round(xp * balance.orders.xpFactor)),
  };
}

/**
 * Makes sure the board has the right number of slots, and fills every empty
 * slot whose wait is over. Returns true when something changed.
 */
export function fillOrderSlots(state: GameState): boolean {
  let changed = false;
  const slotCount = balance.orders.slots.length;
  if (state.orders.length > slotCount) {
    state.orders.length = slotCount;
    changed = true;
  }
  while (state.orders.length < slotCount) {
    state.orders.push({ order: null, readyAt: state.time });
    changed = true;
  }
  state.orders.forEach((slot, index) => {
    if (slot.order || slot.readyAt > state.time) return;
    const order = makeOrder(state, index);
    if (!order) return;
    slot.order = order;
    slot.readyAt = 0;
    changed = true;
  });
  return changed;
}

export function canFulfill(state: GameState, order: Order): boolean {
  return order.wants.every((want) => itemCount(state, want.item) >= want.qty);
}

/** Hands over the items, pays coins and XP, and brings the next order right away. */
export function fulfillOrder(state: GameState, slotIndex: number): Result {
  const slot = state.orders[slotIndex];
  if (!slot?.order) return fail('not-found');
  const order = slot.order;
  if (!canFulfill(state, order)) return fail('not-enough-items');

  for (const want of order.wants) removeItems(state, want.item, want.qty);
  state.coins += order.coins;
  state.stats.coinsEarned += order.coins;
  state.stats.ordersDone += 1;

  const events: GameEvent[] = [{ type: 'order-done', slot: slotIndex, order }];
  addXp(state, order.xp, events);

  slot.order = null;
  slot.readyAt = state.time;
  fillOrderSlots(state);
  return ok(events);
}

/** Sends an order away. A new one arrives after a short wait; nothing is lost. */
export function skipOrder(state: GameState, slotIndex: number): Result {
  const slot = state.orders[slotIndex];
  if (!slot?.order) return fail('not-found');
  slot.order = null;
  slot.readyAt = state.time + balance.orders.skipWaitMs;
  return ok([{ type: 'order-skipped', slot: slotIndex }]);
}
