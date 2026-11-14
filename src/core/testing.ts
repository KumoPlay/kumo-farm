import { buyObject, findFreeSpot } from './shop';
import { createNewGame, type GameState, type MakerObject, type PenObject, type PlotObject } from './state';

/** Shared helpers for the unit tests. */
export const START = 1_700_000_000_000;

export function newGame(seed = 42): GameState {
  return createNewGame(START, seed);
}

export function plots(state: GameState): PlotObject[] {
  return state.objects.filter((object): object is PlotObject => object.kind === 'plot');
}

export function firstPlot(state: GameState): PlotObject {
  const plot = plots(state)[0];
  if (!plot) throw new Error('no plot');
  return plot;
}

/** A farm at the given level with plenty of coins, for trying out later content. */
export function richGame(level: number, seed = 42): GameState {
  const state = newGame(seed);
  state.level = level;
  state.coins = 100_000;
  return state;
}

/** Buys something from the shop and puts it on the first free spot. Returns the new object. */
export function buyAnywhere(state: GameState, defId: string) {
  const spot = findFreeSpot(state, defId, 0, 0);
  if (!spot) throw new Error(`no room for ${defId}`);
  const result = buyObject(state, defId, spot.x, spot.y);
  if (!result.ok) throw new Error(`could not buy ${defId}: ${result.reason}`);
  const object = state.objects[state.objects.length - 1];
  if (!object) throw new Error('nothing was placed');
  return object;
}

export function buyPen(state: GameState, defId: string): PenObject {
  const object = buyAnywhere(state, defId);
  if (object.kind !== 'pen') throw new Error(`${defId} is not an animal home`);
  return object;
}

export function buyMaker(state: GameState, defId: string): MakerObject {
  const object = buyAnywhere(state, defId);
  if (object.kind !== 'maker') throw new Error(`${defId} is not a production building`);
  return object;
}
