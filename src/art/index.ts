/**
 * All the game's pictures live in this folder, one SVG file per picture.
 *
 * To swap in better art, replace a file and keep its name; nothing else needs
 * to change. New content finds its pictures by name:
 *
 *   items/<item id>.svg            what sits in the barn and in orders
 *   crops/<crop id>-growing.svg    a half-grown crop on its plot
 *   crops/<crop id>-ready.svg      a crop ready to harvest
 *   buildings/<object id>.svg      things standing on the farm
 *   people/<customer id>.svg       the neighbours who send orders
 *
 * Crop and item pictures use a 64 × 64 viewBox; buildings use 64 per tile.
 */
const files = import.meta.glob<string>('./**/*.svg', { eager: true, query: '?raw', import: 'default' });

const cache = new Map<string, string>();

/** True when a picture with this name exists, e.g. hasArt('items/oat'). */
export function hasArt(name: string): boolean {
  return `./${name}.svg` in files;
}

export function artNames(): string[] {
  return Object.keys(files).map((path) => path.slice(2, -4));
}

/** A URL for <img src>. Unknown names give a soft placeholder instead of breaking. */
export function art(name: string): string {
  let url = cache.get(name);
  if (!url) {
    const svg = files[`./${name}.svg`] ?? files['./ui/missing.svg'] ?? '';
    url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    cache.set(name, url);
  }
  return url;
}
