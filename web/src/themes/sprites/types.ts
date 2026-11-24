// Pixel-art sprites are plain data: a grid of characters and a palette. One cell = one pixel.
// The same data feeds <PixelSprite> (inline SVG) and the ambient canvas (rasterised once, drawn unsmoothed).

export interface Sprite {
  w: number;
  h: number;
  /** `h` strings of `w` characters. '.' is transparent; every other character is a key of `palette`. */
  rows: readonly string[];
  /** Any CSS colour. Sprites that are drawn on the canvas must use plain hex values (no `var()`). */
  palette: Readonly<Record<string, string>>;
}

/** The one outline colour of the whole set, so thirteen themes read as one sprite sheet. */
export const INK = '#2b2440';

export function sprite(palette: Record<string, string>, rows: string[]): Sprite {
  const w = rows[0]?.length ?? 0;
  if (import.meta.env.DEV) {
    rows.forEach((row, y) => {
      if (row.length !== w) throw new Error(`Sprite row ${y} is ${row.length} wide, expected ${w}: "${row}"`);
      for (const cell of row) {
        if (cell !== '.' && !(cell in palette) && cell !== 'k') throw new Error(`Sprite uses "${cell}" without a palette entry`);
      }
    });
  }
  return { w, h: rows.length, rows, palette: { k: INK, ...palette } };
}

/** Same drawing, other colours (a willow leaf becomes a bamboo leaf). */
export function recolor(source: Sprite, palette: Record<string, string>): Sprite {
  return { ...source, palette: { ...source.palette, ...palette } };
}
