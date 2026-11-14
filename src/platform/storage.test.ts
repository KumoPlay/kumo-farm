import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createNewGame, plantCrop, SAVE_VERSION, toSaveFile } from '../core';
import { eraseGame, loadGame, saveGame } from './storage';

const NOW = 1_700_000_000_000;

/** A tiny stand-in for the browser's localStorage. */
function installLocalStorage(): Map<string, string> {
  const data = new Map<string, string>();
  const fake = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
  Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true });
  return data;
}

function rawPut(key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('kumo-farm', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('saves');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('saves', 'readwrite');
      tx.objectStore('saves').put(value, key);
      tx.oncomplete = () => {
        open.result.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20));

describe('saving on the device', () => {
  let mirror: Map<string, string>;

  beforeEach(async () => {
    mirror = installLocalStorage();
    await eraseGame();
  });

  it('reports a new player when nothing is saved', async () => {
    expect(await loadGame(NOW)).toEqual({ status: 'new' });
  });

  it('saves and loads the farm', async () => {
    const state = createNewGame(NOW, 5);
    const plot = state.objects.find((object) => object.kind === 'plot');
    plantCrop(state, plot?.id ?? 0, 'carrot');
    saveGame(state, 3);
    await settle();

    const loaded = await loadGame(NOW);
    expect(loaded).toMatchObject({ status: 'loaded', rev: 3 });
    if (loaded.status === 'loaded') expect(loaded.state).toEqual(state);
  });

  it('keeps the newest of several quick saves', async () => {
    const state = createNewGame(NOW, 5);
    for (let rev = 1; rev <= 5; rev += 1) {
      state.coins = rev * 10;
      saveGame(structuredClone(state), rev);
    }
    await settle();
    const loaded = await loadGame(NOW);
    expect(loaded).toMatchObject({ status: 'loaded', rev: 5, state: { coins: 50 } });
  });

  it('uses the mirror copy when it is newer than the database', async () => {
    const state = createNewGame(NOW, 5);
    saveGame(state, 1);
    await settle();
    // As if the tab closed right after the quick mirror write, before the database write.
    const newer = { ...state, coins: 777 };
    mirror.set('kumo-farm.save', JSON.stringify(toSaveFile(newer, 2)));

    const loaded = await loadGame(NOW);
    expect(loaded).toMatchObject({ status: 'loaded', rev: 2, state: { coins: 777 } });
  });

  it('falls back to the backup copy when the main save is damaged', async () => {
    const state = createNewGame(NOW, 5);
    saveGame(state, 4);
    await settle();
    await loadGame(NOW); // a good load keeps a backup copy
    await settle();

    await rawPut('main', { app: 'kumo-farm', v: SAVE_VERSION, rev: 9, state: 'scrambled' });
    mirror.set('kumo-farm.save', '{not json');
    const loaded = await loadGame(NOW);
    expect(loaded).toMatchObject({ status: 'loaded', rev: 4 });
  });

  it('says so when every copy is damaged, instead of starting over silently', async () => {
    await rawPut('main', { app: 'kumo-farm', v: SAVE_VERSION, rev: 1, state: 'scrambled' });
    expect(await loadGame(NOW)).toEqual({ status: 'unreadable', reason: 'corrupt' });
  });

  it('never replaces a save from a newer game with an older copy', async () => {
    const state = createNewGame(NOW, 5);
    saveGame(state, 1);
    await settle();
    await rawPut('main', { ...toSaveFile(state, 2), v: SAVE_VERSION + 1 });
    expect(await loadGame(NOW)).toEqual({ status: 'unreadable', reason: 'too-new' });
  });

  it('works with only the mirror when the database is missing', async () => {
    const state = createNewGame(NOW, 5);
    mirror.set('kumo-farm.save', JSON.stringify(toSaveFile(state, 6)));
    const loaded = await loadGame(NOW);
    expect(loaded).toMatchObject({ status: 'loaded', rev: 6 });
  });

  it('erases every copy for a new farm', async () => {
    saveGame(createNewGame(NOW, 5), 1);
    await settle();
    await loadGame(NOW);
    await settle();
    await eraseGame();
    expect(mirror.size).toBe(0);
    expect(await loadGame(NOW)).toEqual({ status: 'new' });
  });
});
