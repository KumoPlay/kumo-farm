import { en, type Strings } from './en';

/** The text for the current language. English only for now. */
export const s: Strings = en;

/** Fills {placeholders}: fmt('Level {n}', { n: 3 }) → 'Level 3'. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

export function itemName(id: string): string {
  return s.items[id] ?? id;
}

export function objectName(id: string): string {
  return s.objects[id] ?? id;
}

export function animalName(id: string): string {
  return s.animals[id] ?? id;
}

export function customerName(id: string): string {
  return s.customers[id] ?? id;
}

/**
 * A short, friendly duration: 25s, 1m 20s, 12m, 2h 5m.
 * Seconds are dropped from ten minutes up, so long timers stay calm.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const seconds = (n: number): string => fmt(s.time.seconds, { n });
  const minutes = (n: number): string => fmt(s.time.minutes, { n });
  const hours = (n: number): string => fmt(s.time.hours, { n });

  if (totalSeconds < 60) return seconds(totalSeconds);
  if (totalSeconds < 600) {
    const m = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return sec === 0 ? minutes(m) : `${minutes(m)} ${seconds(sec)}`;
  }
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) return minutes(totalMinutes);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? hours(h) : `${hours(h)} ${minutes(m)}`;
}
