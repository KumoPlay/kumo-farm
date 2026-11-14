import { ok, type Result } from './result';
import type { GameState } from './state';

export function setSound(state: GameState, on: boolean): Result {
  state.settings.sound = on;
  return ok();
}

/** Remembers that a one-time note was shown, so it does not come back. */
export function markSeen(state: GameState, note: keyof GameState['seen']): Result {
  state.seen[note] = true;
  return ok();
}
