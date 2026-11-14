import { describe, expect, it } from 'vitest';
import { HOUR, MIN } from '../content/time';
import { advanceClock } from './clock';
import { plantCrop, plotGrowth } from './crops';
import { firstPlot, newGame, START } from './testing';

describe('game clock', () => {
  it('moves forward by the real time that passed', () => {
    const state = newGame();
    advanceClock(state, START + 5000);
    expect(state.time).toBe(5000);
    expect(state.wall).toBe(START + 5000);
  });

  it('stands still when the device clock goes backwards', () => {
    const state = newGame();
    advanceClock(state, START + 10 * MIN);
    advanceClock(state, START - 3 * HOUR);
    expect(state.time).toBe(10 * MIN);
    // ...and carries on normally from the new device time.
    advanceClock(state, START - 3 * HOUR + 1000);
    expect(state.time).toBe(10 * MIN + 1000);
  });

  it('ignores a broken device time', () => {
    const state = newGame();
    advanceClock(state, Number.NaN);
    expect(state.time).toBe(0);
    expect(state.wall).toBe(START);
  });

  it('never shows a negative timer after the clock goes backwards', () => {
    const state = newGame();
    const plot = firstPlot(state);
    advanceClock(state, START + MIN);
    plantCrop(state, plot.id, 'carrot');
    advanceClock(state, START - 24 * HOUR);
    const growth = plotGrowth(state, plot);
    expect(growth.remainingMs).toBe(2 * MIN);
    expect(growth.progress).toBe(0);
  });

  it('counts time away from the game in full', () => {
    const state = newGame();
    const plot = firstPlot(state);
    plantCrop(state, plot.id, 'carrot');
    advanceClock(state, START + 8 * HOUR);
    expect(plotGrowth(state, plot).stage).toBe('ready');
  });
});
