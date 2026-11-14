import { clone } from '../clone';
import { SAVE_VERSION, SaveError, type SaveFile } from './schema';

/** Takes the `state` of a save in one version and returns it in the next version. */
export type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/**
 * Upgrade steps for old saves. `migrations[n]` turns a version n save into
 * version n + 1. Steps run one after another, so a very old save walks through
 * every step up to the current version.
 *
 * When you change the shape of GameState:
 *   1. raise SAVE_VERSION in schema.ts by one,
 *   2. add a step here under the old version number,
 *   3. add a test in save.test.ts with an example of the old shape.
 *
 */
export const migrations: Record<number, Migration> = {
  // Version 2 added animals, production buildings, decorations and the list of
  // one-time notes. Old farms simply have none of the new things yet.
  1: (state) => ({ ...state, seen: { installHint: false } }),
};

/** Brings a save up to `target`. Never changes the file it is given. */
export function migrateSave(
  file: SaveFile,
  table: Record<number, Migration> = migrations,
  target: number = SAVE_VERSION,
): SaveFile {
  // A save from a newer game than this one: refuse, rather than damage it.
  if (file.v > target) throw new SaveError('too-new');
  let version = file.v;
  let state = file.state as Record<string, unknown>;
  while (version < target) {
    const step = table[version];
    if (!step) throw new SaveError('corrupt');
    try {
      state = step(clone(state));
    } catch {
      throw new SaveError('corrupt');
    }
    version += 1;
  }
  return { ...file, v: version, state };
}
