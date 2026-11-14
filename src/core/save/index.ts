import type { GameState } from '../state';
import { decodeSaveCode, encodeSaveCode } from './codec';
import { migrateSave } from './migrations';
import { asSaveFile, normalizeState, toSaveFile } from './schema';

export { decodeSaveCode, encodeSaveCode } from './codec';
export { migrateSave, migrations, type Migration } from './migrations';
export { asSaveFile, normalizeState, SAVE_APP, SAVE_VERSION, SaveError, toSaveFile } from './schema';
export type { SaveErrorCode, SaveFile } from './schema';

export interface OpenedSave {
  state: GameState;
  rev: number;
}

/** Stored data → a ready GameState: check, upgrade old versions, repair. Throws SaveError. */
export function openSave(raw: unknown, wallNow: number): OpenedSave {
  const file = migrateSave(asSaveFile(raw));
  return { state: normalizeState(file.state, wallNow), rev: file.rev };
}

/** The current farm as a backup code. */
export function exportSaveCode(state: GameState, rev: number): string {
  return encodeSaveCode(toSaveFile(state, rev));
}

/** A pasted backup code → a ready GameState. Throws SaveError. */
export function importSaveCode(code: string, wallNow: number): OpenedSave {
  return openSave(decodeSaveCode(code), wallNow);
}
