import { describe, expect, it } from 'vitest';
import { balance } from '../content';
import { HOUR, MIN } from '../content/time';
import { plantCrop, plotGrowth } from './crops';
import { tick } from './game';
import {
  decodeSaveCode,
  encodeSaveCode,
  exportSaveCode,
  importSaveCode,
  migrateSave,
  normalizeState,
  openSave,
  SAVE_VERSION,
  SaveError,
  toSaveFile,
  type Migration,
  type SaveFile,
} from './save';
import { skipOrder } from './orders';
import { firstPlot, newGame, plots, START } from './testing';

function errorCode(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof SaveError ? error.code : `other: ${String(error)}`;
  }
  return 'no error';
}

/** What storage does to a save: it comes back as plain JSON data. */
function throughJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('save and load', () => {
  it('loads back exactly what was saved', () => {
    const state = newGame();
    plantCrop(state, firstPlot(state).id, 'carrot');
    state.items = { oat: 4 };
    tick(state, START + MIN);

    const opened = openSave(throughJson(toSaveFile(state, 12)), START + MIN);
    expect(opened.rev).toBe(12);
    expect(opened.state).toEqual(state);
  });

  it('keeps everything going while the game is closed', () => {
    const state = newGame();
    const plot = firstPlot(state);
    plantCrop(state, plot.id, 'carrot');
    skipOrder(state, 2);

    const later = START + 5 * HOUR;
    const { state: loaded } = openSave(throughJson(toSaveFile(state, 1)), later);
    tick(loaded, later);
    expect(plotGrowth(loaded, firstPlot(loaded)).stage).toBe('ready');
    expect(loaded.orders[2]?.order).not.toBeNull();
  });

  it('loads safely when the device clock is earlier than when it was saved', () => {
    const state = newGame();
    const plot = firstPlot(state);
    tick(state, START + HOUR);
    plantCrop(state, plot.id, 'carrot');

    const earlier = START - 30 * 24 * HOUR;
    const { state: loaded } = openSave(throughJson(toSaveFile(state, 1)), earlier);
    tick(loaded, earlier);
    const growth = plotGrowth(loaded, firstPlot(loaded));
    expect(growth.remainingMs).toBe(2 * MIN);
    expect(loaded.time).toBe(state.time);

    tick(loaded, earlier + 2 * MIN);
    expect(plotGrowth(loaded, firstPlot(loaded)).stage).toBe('ready');
  });

  it('refuses things that are not a Kumo Farm save', () => {
    expect(errorCode(() => openSave(null, START))).toBe('not-a-save');
    expect(errorCode(() => openSave({ app: 'other-game', v: 1, state: {} }, START))).toBe('not-a-save');
    expect(errorCode(() => openSave({ app: 'kumo-farm', v: 'one', state: {} }, START))).toBe('corrupt');
    expect(errorCode(() => openSave({ app: 'kumo-farm', v: 1, state: [] }, START))).toBe('corrupt');
  });

  it('refuses a save from a newer version instead of damaging it', () => {
    const file = { ...toSaveFile(newGame(), 1), v: SAVE_VERSION + 1 };
    expect(errorCode(() => openSave(file, START))).toBe('too-new');
  });
});

describe('save migrations', () => {
  const table: Record<number, Migration> = {
    0: (state) => ({ ...state, coins: state.gold, gold: undefined }),
    1: (state) => ({ ...state, level: 1 }),
    2: (state) => ({ ...state, pets: [] }),
  };
  const old: SaveFile = { app: 'kumo-farm', v: 0, rev: 5, state: { gold: 30 } };

  it('walks an old save through every step in order', () => {
    const migrated = migrateSave(old, table, 3);
    expect(migrated).toMatchObject({ v: 3, rev: 5, state: { coins: 30, level: 1, pets: [] } });
    expect(old.state).toEqual({ gold: 30 });
  });

  it('leaves a current save untouched', () => {
    const current: SaveFile = { app: 'kumo-farm', v: 3, rev: 1, state: { coins: 1 } };
    expect(migrateSave(current, table, 3)).toEqual(current);
  });

  it('reports a missing or failing step as a corrupt save', () => {
    expect(errorCode(() => migrateSave(old, { 0: table[0] as Migration }, 3))).toBe('corrupt');
    const failing: Record<number, Migration> = {
      0: () => {
        throw new Error('boom');
      },
    };
    expect(errorCode(() => migrateSave(old, failing, 1))).toBe('corrupt');
  });

  it('has a step for every version below the current one', async () => {
    const { migrations } = await import('./save');
    for (let version = 1; version < SAVE_VERSION; version += 1) {
      expect(typeof migrations[version]).toBe('function');
    }
  });
});

describe('saves from version 1 (before animals and buildings)', () => {
  // A real save written by the first playable version of the game.
  const v1: SaveFile = {
    app: 'kumo-farm',
    v: 1,
    rev: 41,
    state: {
      time: 600_000,
      wall: START,
      seed: 123,
      coins: 46,
      level: 2,
      xp: 5,
      barnLevel: 1,
      items: { oat: 3 },
      objects: [
        { id: 1, kind: 'barn', x: 0, y: 0 },
        { id: 2, kind: 'board', x: 4, y: 0 },
        { id: 3, kind: 'plot', x: 1, y: 3, crop: 'carrot', plantedAt: 590_000 },
        { id: 4, kind: 'plot', x: 2, y: 3, crop: null, plantedAt: 0 },
      ],
      patches: ['home'],
      orders: [
        { order: { id: 9, customer: 'lulu', wants: [{ item: 'oat', qty: 2 }], coins: 3, xp: 3 }, readyAt: 0 },
        { order: null, readyAt: 650_000 },
        { order: { id: 11, customer: 'poko', wants: [{ item: 'carrot', qty: 4 }], coins: 19, xp: 12 }, readyAt: 0 },
      ],
      nextId: 12,
      settings: { sound: false },
      stats: { harvested: 7, ordersDone: 1, coinsEarned: 26 },
    },
  };

  it('opens in the current version with nothing lost', () => {
    const { state, rev } = openSave(throughJson(v1), START);
    expect(rev).toBe(41);
    expect(state).toMatchObject({
      coins: 46,
      level: 2,
      xp: 5,
      items: { oat: 3 },
      settings: { sound: false },
      seen: { installHint: false },
      stats: { harvested: 7, ordersDone: 1, coinsEarned: 26 },
    });
    expect(state.objects).toHaveLength(4);
    expect(plotGrowth(state, firstPlot(state)).remainingMs).toBe(2 * MIN - 10_000);
    expect(state.orders[0]?.order?.customer).toBe('lulu');
    expect(state.orders[1]).toEqual({ order: null, readyAt: 650_000 });
    expect(migrateSave(v1).v).toBe(SAVE_VERSION);
  });
});

describe('repairing damaged saves', () => {
  it('repairs animal homes and production buildings', () => {
    const base = throughJson(newGame());
    const state = normalizeState(
      {
        ...base,
        time: 1_000_000,
        objects: [
          ...base.objects,
          { id: 50, kind: 'pen', def: 'coop', x: 4, y: 4, animals: [{ fedAt: 5_000_000 }, { fedAt: null }, {}, 7, {}, {}] },
          { id: 51, kind: 'pen', def: 'dragon-cave', x: 0, y: 0, animals: [] },
          {
            id: 52,
            kind: 'maker',
            def: 'oven',
            x: 2,
            y: 0,
            slots: 99,
            jobs: [
              { recipe: 'oat-bread', readyAt: 900_000 },
              { recipe: 'cheese', readyAt: 900_000 },
              { recipe: 'oat-bread', readyAt: 99_000_000 },
              { recipe: 'carrot-muffin' },
            ],
          },
          { id: 53, kind: 'deco', def: 'lantern', x: 5, y: 5 },
          { id: 54, kind: 'deco', def: 'statue-of-nobody', x: 5, y: 4 },
        ],
      },
      START,
    );
    const byId = new Map(state.objects.map((object) => [object.id, object]));
    expect(byId.get(50)).toMatchObject({ animals: [{ fedAt: 1_000_000 }, { fedAt: null }, { fedAt: null }, { fedAt: null }] });
    expect(byId.has(51)).toBe(false);
    expect(byId.get(52)).toMatchObject({
      slots: 4,
      jobs: [
        { recipe: 'oat-bread', readyAt: 900_000 },
        { recipe: 'oat-bread', readyAt: 1_000_000 + 5 * MIN },
        { recipe: 'carrot-muffin', readyAt: 1_000_000 },
      ],
    });
    expect(byId.has(53)).toBe(true);
    expect(byId.has(54)).toBe(false);
  });

  it('fills in missing values with safe defaults', () => {
    const state = normalizeState({}, START);
    expect(state.level).toBe(1);
    expect(state.coins).toBe(0);
    expect(state.wall).toBe(START);
    expect(state.patches).toEqual(['home']);
    expect(state.objects.map((object) => object.kind).sort()).toEqual(['barn', 'board']);
    expect(state.orders).toHaveLength(balance.orders.slots.length);
    expect(state.orders.every((slot) => slot.order !== null)).toBe(true);
  });

  it('drops unknown things and keeps numbers in range', () => {
    const base = throughJson(newGame());
    const state = normalizeState(
      {
        ...base,
        coins: -50,
        level: 0,
        xp: 'lots',
        barnLevel: 99,
        items: { oat: 3.9, carrot: -2, unicorn: 5, strawberry: null },
        patches: ['east', 'atlantis', 'east'],
        objects: [
          ...base.objects,
          { id: 3, kind: 'plot', x: 0, y: 0, crop: null, plantedAt: 0 },
          { id: 500, kind: 'rocket', x: 1, y: 1 },
          { id: 501, kind: 'plot', x: 5, y: 5, crop: 'unicorn', plantedAt: 10 },
          { id: 502, kind: 'plot', x: 4, y: 5, crop: 'oat', plantedAt: 9_999_999_999 },
        ],
        orders: [
          { order: { id: 9, customer: 'nobody', wants: [{ item: 'oat', qty: 2 }], coins: 3, xp: 3 }, readyAt: 0 },
          { order: { id: 10, customer: 'poko', wants: [{ item: 'unicorn', qty: 2 }], coins: 3, xp: 3 }, readyAt: 0 },
          { order: null, readyAt: 9_999_999_999 },
        ],
        nextId: 2,
      },
      START,
    );

    expect(state.coins).toBe(0);
    expect(state.level).toBe(1);
    expect(state.xp).toBe(0);
    expect(state.barnLevel).toBe(balance.barn.capacities.length);
    expect(state.items).toEqual({ oat: 3 });
    expect(state.patches).toEqual(['home', 'east']);

    const ids = state.objects.map((object) => object.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(500);
    const byId = new Map(plots(state).map((plot) => [plot.id, plot]));
    expect(byId.get(501)?.crop).toBeNull();
    expect(byId.get(502)?.plantedAt).toBe(state.time);
    expect(state.nextId).toBeGreaterThan(Math.max(...ids));

    expect(state.orders[0]?.order?.customer).toBe('poko');
    // The order for an unknown item is replaced by a fresh one.
    expect(state.orders[1]?.order?.wants.every((want) => want.item !== 'unicorn')).toBe(true);
    // A wait far in the future is pulled back to the normal wait.
    expect(state.orders[2]).toEqual({ order: null, readyAt: state.time + balance.orders.skipWaitMs });
  });

  it('gives up only when there is nothing to work with', () => {
    expect(errorCode(() => normalizeState('farm', START))).toBe('corrupt');
    expect(errorCode(() => normalizeState(null, START))).toBe('corrupt');
  });
});

describe('backup codes', () => {
  it('exports a code that imports back to the same farm', () => {
    const state = newGame();
    plantCrop(state, firstPlot(state).id, 'oat');
    state.items = { carrot: 7 };
    const code = exportSaveCode(state, 3);
    expect(code).toMatch(/^KUMO1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
    const opened = importSaveCode(code, START);
    expect(opened.state).toEqual(state);
    expect(opened.rev).toBe(3);
  });

  it('ignores spaces and line breaks around and inside the code', () => {
    const code = exportSaveCode(newGame(), 1);
    const messy = `  ${code.slice(0, 20)}\n${code.slice(20, 50)} \r\n ${code.slice(50)}\n`;
    expect(importSaveCode(messy, START).state.level).toBe(1);
  });

  it('survives text outside plain ASCII', () => {
    const file: SaveFile = { app: 'kumo-farm', v: 1, rev: 1, state: { note: 'ฟาร์ม ☁️' } };
    expect(decodeSaveCode(encodeSaveCode(file))).toEqual(file);
  });

  it('rejects a cut-off, mistyped or foreign code', () => {
    const code = exportSaveCode(newGame(), 1);
    expect(errorCode(() => importSaveCode(code.slice(0, -12), START))).toBe('corrupt');
    const middle = Math.floor(code.length / 2);
    const swapped = code.slice(0, middle) + (code[middle] === 'A' ? 'B' : 'A') + code.slice(middle + 1);
    expect(errorCode(() => importSaveCode(swapped, START))).toBe('corrupt');
    expect(errorCode(() => importSaveCode('hello there', START))).toBe('not-a-save');
    expect(errorCode(() => importSaveCode('', START))).toBe('not-a-save');
    expect(errorCode(() => importSaveCode('KUMO9.abc.def', START))).toBe('not-a-save');
  });
});
