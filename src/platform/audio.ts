/**
 * Soft little sounds, made with the Web Audio API (no audio files to download).
 * Nothing can play until the player has tapped the screen once: browsers
 * require that, and it is also what we want.
 */
type AudioContextClass = typeof AudioContext;

let context: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

/** Call from the first tap. Later calls wake the sound up again if the browser paused it. */
export function unlockAudio(): void {
  try {
    if (!context) {
      const Context: AudioContextClass | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
      if (!Context) return;
      context = new Context();
    }
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

interface Note {
  /** Pitch in hertz. */
  freq: number;
  /** Seconds after the sound starts. */
  at?: number;
  /** Length in seconds. */
  length?: number;
  /** Pitch to glide to, for a "bloop". */
  glideTo?: number;
  volume?: number;
  wave?: OscillatorType;
}

function play(notes: Note[]): void {
  if (!enabled || !context || context.state !== 'running') return;
  try {
    const now = context.currentTime;
    for (const note of notes) {
      const start = now + (note.at ?? 0);
      const length = note.length ?? 0.16;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = note.wave ?? 'sine';
      oscillator.frequency.setValueAtTime(note.freq, start);
      if (note.glideTo) oscillator.frequency.exponentialRampToValueAtTime(note.glideTo, start + length);
      // A quick, gentle rise and a soft fade, so nothing clicks or startles.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(note.volume ?? 0.07, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + length + 0.02);
    }
  } catch {
    // Sound is a nice extra; never let it break the game.
  }
}

/** Every sound in the game. To change one, edit its notes here. */
export const sfx = {
  tap: () => play([{ freq: 520, length: 0.06, volume: 0.035, wave: 'triangle' }]),
  plant: () => play([{ freq: 330, glideTo: 440, length: 0.14, wave: 'triangle' }]),
  harvest: () => play([{ freq: 520, glideTo: 880, length: 0.13 }]),
  lucky: () =>
    play([
      { freq: 520, glideTo: 880, length: 0.13 },
      { freq: 1175, at: 0.1, length: 0.12, volume: 0.05 },
      { freq: 1568, at: 0.18, length: 0.2, volume: 0.05 },
    ]),
  collect: () => play([{ freq: 440, glideTo: 660, length: 0.12, wave: 'triangle' }]),
  feed: () =>
    play([
      { freq: 392, length: 0.07, wave: 'triangle' },
      { freq: 392, at: 0.09, length: 0.07, wave: 'triangle' },
    ]),
  coin: () =>
    play([
      { freq: 988, length: 0.09, volume: 0.05 },
      { freq: 1319, at: 0.07, length: 0.22, volume: 0.05 },
    ]),
  deliver: () =>
    play([
      { freq: 659, length: 0.12 },
      { freq: 784, at: 0.1, length: 0.12 },
      { freq: 1047, at: 0.2, length: 0.3 },
    ]),
  levelUp: () =>
    play([
      { freq: 523, length: 0.14 },
      { freq: 659, at: 0.12, length: 0.14 },
      { freq: 784, at: 0.24, length: 0.14 },
      { freq: 1047, at: 0.36, length: 0.45 },
      { freq: 1319, at: 0.36, length: 0.45, volume: 0.04 },
    ]),
  place: () => play([{ freq: 220, glideTo: 165, length: 0.16, volume: 0.09, wave: 'triangle' }]),
  start: () => play([{ freq: 294, glideTo: 392, length: 0.18, wave: 'triangle' }]),
  nope: () => play([{ freq: 247, glideTo: 208, length: 0.16, volume: 0.05, wave: 'triangle' }]),
};
