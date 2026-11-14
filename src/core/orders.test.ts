import { describe, expect, it } from 'vitest';
import { balance, getItem } from '../content';
import { MIN, SEC } from '../content/time';
import { itemCount } from './barn';
import { tick } from './game';
import { canFulfill, fulfillOrder, orderableItems, skipOrder } from './orders';
import type { Order } from './state';
import { newGame, START } from './testing';

function openOrder(order: Order | null | undefined): Order {
  if (!order) throw new Error('expected an open order');
  return order;
}

describe('orders', () => {
  it('starts with a full board that only asks for unlocked items', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const state = newGame(seed);
      expect(state.orders).toHaveLength(balance.orders.slots.length);
      const unlocked = new Set(orderableItems(state).map((item) => item.id));
      for (const slot of state.orders) {
        const order = openOrder(slot.order);
        expect(order.wants.length).toBeGreaterThan(0);
        expect(order.coins).toBeGreaterThan(0);
        expect(order.xp).toBeGreaterThan(0);
        for (const want of order.wants) {
          expect(unlocked.has(want.item)).toBe(true);
          expect(want.qty).toBeGreaterThan(0);
        }
        expect(new Set(order.wants.map((want) => want.item)).size).toBe(order.wants.length);
      }
    }
  });

  it('keeps the first slot small: one item type', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const state = newGame(seed);
      state.level = 9;
      state.orders = [];
      tick(state, START);
      expect(openOrder(state.orders[0]?.order).wants).toHaveLength(1);
    }
  });

  it('pays more than selling the same items from the barn', () => {
    const state = newGame();
    for (const slot of state.orders) {
      const order = openOrder(slot.order);
      const barnValue = order.wants.reduce((sum, want) => sum + (getItem(want.item)?.value ?? 0) * want.qty, 0);
      expect(order.coins).toBeGreaterThanOrEqual(barnValue);
    }
  });

  it('delivers an order: takes the items, pays, and brings a new order', () => {
    const state = newGame();
    const order = openOrder(state.orders[0]?.order);
    expect(canFulfill(state, order)).toBe(false);
    expect(fulfillOrder(state, 0)).toEqual({ ok: false, reason: 'not-enough-items' });

    for (const want of order.wants) state.items[want.item] = want.qty + 1;
    const coinsBefore = state.coins;
    const result = fulfillOrder(state, 0);
    expect(result.ok).toBe(true);
    for (const want of order.wants) expect(itemCount(state, want.item)).toBe(1);
    expect(state.coins).toBeGreaterThanOrEqual(coinsBefore + order.coins);
    expect(state.stats.ordersDone).toBe(1);

    const next = openOrder(state.orders[0]?.order);
    expect(next.id).not.toBe(order.id);
  });

  it('skips an order and brings a new one after the wait, also while away', () => {
    const state = newGame();
    expect(skipOrder(state, 1).ok).toBe(true);
    expect(state.orders[1]).toEqual({ order: null, readyAt: balance.orders.skipWaitMs });
    expect(skipOrder(state, 1)).toEqual({ ok: false, reason: 'not-found' });
    expect(fulfillOrder(state, 1)).toEqual({ ok: false, reason: 'not-found' });

    tick(state, START + balance.orders.skipWaitMs - SEC);
    expect(state.orders[1]?.order).toBeNull();

    tick(state, START + 90 * MIN);
    expect(openOrder(state.orders[1]?.order).wants.length).toBeGreaterThan(0);
  });

  it('asks for newer items once they are unlocked', () => {
    const state = newGame(3);
    state.level = 8;
    const seen = new Set<string>();
    for (let round = 0; round < 60; round += 1) {
      state.orders = [];
      tick(state, START);
      for (const slot of state.orders) slot.order?.wants.forEach((want) => seen.add(want.item));
    }
    expect(seen.has('moon-melon')).toBe(true);
    expect(seen.has('oat')).toBe(true);
  });
});
