import { advanceClock } from './clock';
import { fillOrderSlots } from './orders';
import type { GameState } from './state';

/**
 * Brings the farm up to date with the real time. Call it on a slow timer while
 * the game is open, and once after loading a save (that is the offline progress:
 * crops kept growing on the game clock, and waiting orders arrive).
 * Returns true when something besides the clock changed.
 */
export function tick(state: GameState, wallNow: number): boolean {
  advanceClock(state, wallNow);
  return fillOrderSlots(state);
}
