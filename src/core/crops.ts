import { balance, getCrop } from '../content';
import { addItems, barnFree } from './barn';
import { addXp } from './economy';
import { fail, ok, type GameEvent, type Result } from './result';
import { nextRandom } from './rng';
import { findPlot, type GameState, type PlotObject } from './state';

export type GrowthStage = 'empty' | 'sprout' | 'growing' | 'ready';

export interface Growth {
  stage: GrowthStage;
  /** 0 when just planted, 1 when ready. */
  progress: number;
  remainingMs: number;
}

/** How far along a plot is. Never negative, whatever the clocks say. */
export function plotGrowth(state: GameState, plot: PlotObject): Growth {
  const crop = plot.crop ? getCrop(plot.crop) : undefined;
  if (!crop) return { stage: 'empty', progress: 0, remainingMs: 0 };
  const elapsed = Math.max(0, state.time - plot.plantedAt);
  const remainingMs = Math.max(0, crop.growMs - elapsed);
  const progress = crop.growMs > 0 ? Math.min(1, elapsed / crop.growMs) : 1;
  const stage: GrowthStage = remainingMs === 0 ? 'ready' : progress < 0.4 ? 'sprout' : 'growing';
  return { stage, progress, remainingMs };
}

export function plantCrop(state: GameState, plotId: number, cropId: string): Result {
  const plot = findPlot(state, plotId);
  const crop = getCrop(cropId);
  if (!plot || !crop) return fail('not-found');
  if (plot.crop) return fail('occupied');
  if (state.level < crop.unlockLevel) return fail('locked');
  plot.crop = crop.id;
  plot.plantedAt = state.time;
  return ok([{ type: 'planted', plotId, crop: crop.id }]);
}

export function harvestPlot(state: GameState, plotId: number): Result {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('not-found');
  const crop = plot.crop ? getCrop(plot.crop) : undefined;
  if (!crop) return fail('empty');
  if (plotGrowth(state, plot).stage !== 'ready') return fail('not-ready');

  const free = barnFree(state);
  if (free < 1) return fail('barn-full');

  // The bonus only happens when the barn has room for it; a full barn never blocks it later.
  const lucky = nextRandom(state) < balance.harvestBonusChance;
  const bonus = lucky && free >= 2 ? 1 : 0;
  const qty = 1 + bonus;

  addItems(state, crop.id, qty);
  plot.crop = null;
  plot.plantedAt = 0;
  state.stats.harvested += qty;

  const events: GameEvent[] = [{ type: 'harvested', plotId, crop: crop.id, qty, bonus, xp: crop.xp }];
  addXp(state, crop.xp, events);
  return ok(events);
}
