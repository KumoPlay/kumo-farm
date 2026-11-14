import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '../core';
import type { GameStore } from './store';

/** Re-draws the component whenever the farm changes. */
export function useGameState(store: GameStore): GameState {
  const [, redraw] = useState(0);
  useEffect(() => store.subscribe(() => redraw((n) => n + 1)), [store]);
  return store.getState();
}
