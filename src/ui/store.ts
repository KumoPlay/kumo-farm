import { advanceClock, clone, createNewGame, tick, type GameEvent, type GameState, type Result } from '../core';
import { saveGame } from '../platform/storage';

type Listener = () => void;
type EventListener = (event: GameEvent) => void;

/**
 * Holds the current farm and is the only place that changes it.
 * Every change goes through `run`, which works on a copy, so a refused action
 * leaves the farm exactly as it was. Every accepted change is saved at once.
 */
export class GameStore {
  private state: GameState;
  private rev: number;
  private stopped = false;
  private readonly listeners = new Set<Listener>();
  private readonly eventListeners = new Set<EventListener>();

  constructor(state: GameState, rev: number) {
    this.state = state;
    this.rev = rev;
  }

  static startNew(): GameStore {
    const seed = Math.floor(Math.random() * 0xffffffff);
    const store = new GameStore(createNewGame(Date.now(), seed), 0);
    store.save();
    return store;
  }

  getState(): GameState {
    return this.state;
  }

  getRev(): number {
    return this.rev;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /** Runs one game action, saves if it worked, and tells the screen. */
  run(action: (draft: GameState) => Result): Result {
    if (this.stopped) return { ok: false, reason: 'not-found' };
    const draft = clone(this.state);
    advanceClock(draft, Date.now());
    const result = action(draft);
    if (!result.ok) return result;
    this.state = draft;
    this.save();
    this.listeners.forEach((listener) => listener());
    result.events.forEach((event) => this.eventListeners.forEach((listener) => listener(event)));
    return result;
  }

  /** Brings timers up to date. Called about once a second, and when the tab wakes up. */
  tick(): void {
    if (this.stopped) return;
    const draft = clone(this.state);
    const changed = tick(draft, Date.now());
    this.state = draft;
    if (changed) this.save();
    this.listeners.forEach((listener) => listener());
  }

  /** Saves right now, for example when the tab is being hidden. */
  save(): void {
    if (this.stopped) return;
    this.rev += 1;
    saveGame(this.state, this.rev);
  }

  /** Swaps in another farm (a loaded backup or a brand-new farm). */
  replace(state: GameState): void {
    this.state = state;
    this.tick();
    this.save();
  }

  /** Stops all changes and saving, when another tab has taken over. */
  stop(): void {
    this.stopped = true;
  }
}
