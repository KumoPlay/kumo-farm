import type { GameState } from './state';

/**
 * Moves the game clock forward by the real time that has passed.
 *
 * Every timer is measured on the game clock, never on the device clock. If the
 * device clock jumps backwards (time zone change, manual change, wrong clock),
 * the game clock simply stands still for that moment: no negative timers, and
 * nothing is lost. Time spent with the game closed counts in full.
 */
export function advanceClock(state: GameState, wallNow: number): void {
  if (!Number.isFinite(wallNow)) return;
  const passed = wallNow - state.wall;
  if (passed > 0) state.time += passed;
  state.wall = wallNow;
}
