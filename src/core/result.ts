import type { Order } from './state';

/** Why an action did nothing. The UI turns these into friendly messages. */
export type FailReason =
  | 'not-found'
  | 'locked'
  | 'occupied'
  | 'empty'
  | 'not-ready'
  | 'barn-full'
  | 'not-enough-coins'
  | 'not-enough-items'
  | 'max-level'
  | 'queue-full'
  | 'limit'
  | 'blocked';

/** Things that happened, so the UI can animate, play a sound or show a message. */
export type GameEvent =
  | { type: 'planted'; plotId: number; crop: string }
  | { type: 'harvested'; plotId: number; crop: string; qty: number; bonus: number; xp: number }
  | { type: 'sold'; item: string; qty: number; coins: number }
  | { type: 'barn-upgraded'; level: number; capacity: number }
  | { type: 'order-done'; slot: number; order: Order }
  | { type: 'order-skipped'; slot: number }
  | { type: 'level-up'; level: number; coins: number; unlocks: Unlock[] }
  | { type: 'fed'; objectId: number; count: number }
  | { type: 'collected'; objectId: number; item: string; qty: number }
  | { type: 'animal-bought'; objectId: number; animal: string }
  | { type: 'job-started'; objectId: number; recipe: string }
  | { type: 'slot-bought'; objectId: number; slots: number }
  | { type: 'bought'; objectId: number; def: string }
  | { type: 'moved'; objectId: number }
  | { type: 'removed'; objectId: number; def: string; coins: number }
  | { type: 'patch-bought'; patch: string };

/** Something new the player gets at a level. */
export interface Unlock {
  kind: 'crop' | 'pen' | 'maker' | 'recipe' | 'deco' | 'patch';
  id: string;
}

export type Result = { ok: true; events: GameEvent[] } | { ok: false; reason: FailReason };

export const ok = (events: GameEvent[] = []): Result => ({ ok: true, events });
export const fail = (reason: FailReason): Result => ({ ok: false, reason });
