// Tonal colour maths for the "Tonal" design.
// Every season only gives us `primary`, `accent` and a gradient; Material-style tonal roles
// (containers, surfaces, outlines) are derived here in OKLCH so lightness is perceptual and the
// same recipe gives AA-safe pairs for all four seasons in light and dark.
import type { Season } from '@shared/seasons';

type Lch = { l: number; c: number; h: number };

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number];
}

function rgbToHex(rgb: number[]): string {
  return `#${rgb
    .map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function hexToLch(hex: string): Lch {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180) / Math.PI };
}

function lchToLinearRgb({ l: L, c, h }: Lch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** OKLCH -> hex, reducing chroma (never lightness) until the colour fits sRGB. */
export function lch(l: number, c: number, h: number): string {
  let lo = 0;
  let hi = c;
  let rgb = lchToLinearRgb({ l, c, h });
  if (!inGamut(rgb)) {
    for (let i = 0; i < 18; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(lchToLinearRgb({ l, c: mid, h }))) lo = mid;
      else hi = mid;
    }
    rgb = lchToLinearRgb({ l, c: lo, h });
  }
  return rgbToHex(rgb.map(toGamma));
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Nudge a colour's lightness away from `against` until it reaches the wanted contrast ratio. */
export function ensureContrast(hex: string, against: string, ratio = 4.5): string {
  const base = hexToLch(hex);
  const direction = luminance(against) > 0.3 ? -1 : 1;
  let out = hex;
  for (let step = 0; step < 60 && contrast(out, against) < ratio; step += 1) {
    out = lch(Math.min(1, Math.max(0, base.l + direction * 0.01 * (step + 1))), base.c, base.h);
  }
  return out;
}

export type TonalRoles = {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  /** The season accent, unmodified, for decoration only (never behind or as text). */
  accentVivid: string;
  /** Second chart series: the accent hue at a tone clearly apart from primary (3:1 on surfaces). */
  chartAlt: string;
  surface: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  positive: string;
  positiveContainer: string;
  onPositiveContainer: string;
  negative: string;
  negativeContainer: string;
  onNegativeContainer: string;
  /** Hero surface: the season gradient remapped to one tone so text on it always passes AA. */
  heroFrom: string;
  heroVia: string;
  heroTo: string;
  onHero: string;
  onHeroMuted: string;
  scrim: string;
};

export function tonalRoles(season: Season, scheme: 'light' | 'dark'): TonalRoles {
  const p = hexToLch(season.primary);
  const a = hexToLch(season.accent);
  const stops = season.gradient.map(hexToLch);
  const light = scheme === 'light';
  // Neutral surfaces carry a little of the primary hue: that tint is what makes the UI "tonal".
  const n = (l: number, c: number) => lch(l, c, p.h);

  const surface = light ? n(0.985, 0.006) : n(0.165, 0.012);
  const surfaceContainerHighest = light ? n(0.905, 0.022) : n(0.3, 0.022);

  const heroL = light ? 0.47 : 0.36;
  const heroTone = (s: Lch, dl = 0) => lch(heroL + dl, Math.min(s.c, light ? 0.17 : 0.12), s.h);
  const onHero = '#ffffff';
  // The last gradient stop is usually a bright accent that turns muddy when darkened, so the hero
  // ends half-way (shortest hue arc) between the middle stop and that accent instead.
  const mid = stops[Math.min(1, stops.length - 1)];
  const end = stops[stops.length - 1];
  const arc = ((end.h - mid.h + 540) % 360) - 180;
  const hero = [
    heroTone(stops[0], -0.04),
    heroTone(mid),
    heroTone({ l: end.l, c: Math.max(mid.c, end.c), h: mid.h + arc / 2 }, light ? -0.02 : 0),
  ].map((c) => ensureContrast(c, onHero, 5.2));

  const primary = light
    ? ensureContrast(season.primary, surfaceContainerHighest, 4.5)
    : lch(0.83, Math.min(p.c, 0.12), p.h);
  const tertiary = light
    ? ensureContrast(lch(0.5, Math.min(a.c, 0.13), a.h), surfaceContainerHighest, 4.5)
    : lch(0.85, Math.min(a.c, 0.13), a.h);

  return {
    primary,
    onPrimary: light ? '#ffffff' : lch(0.24, Math.min(p.c, 0.09), p.h),
    primaryContainer: light ? lch(0.91, Math.min(p.c * 0.5, 0.065), p.h) : lch(0.37, Math.min(p.c, 0.1), p.h),
    onPrimaryContainer: light ? lch(0.29, Math.min(p.c, 0.12), p.h) : lch(0.93, 0.045, p.h),
    secondaryContainer: light ? n(0.918, 0.036) : n(0.33, 0.04),
    onSecondaryContainer: light ? n(0.27, 0.05) : n(0.93, 0.03),
    tertiary,
    onTertiary: light ? '#ffffff' : lch(0.25, Math.min(a.c, 0.07), a.h),
    tertiaryContainer: light ? lch(0.925, Math.min(a.c * 0.6, 0.085), a.h) : lch(0.38, Math.min(a.c, 0.085), a.h),
    onTertiaryContainer: light ? lch(0.3, Math.min(a.c, 0.075), a.h) : lch(0.94, 0.05, a.h),
    accentVivid: season.accent,
    chartAlt: light ? lch(0.66, Math.min(a.c, 0.14), a.h) : lch(0.62, Math.min(a.c, 0.13), a.h),
    surface,
    surfaceContainerLowest: light ? '#ffffff' : n(0.135, 0.01),
    surfaceContainerLow: light ? n(0.968, 0.011) : n(0.2, 0.014),
    surfaceContainer: light ? n(0.95, 0.015) : n(0.225, 0.016),
    surfaceContainerHigh: light ? n(0.928, 0.019) : n(0.26, 0.019),
    surfaceContainerHighest,
    onSurface: light ? n(0.21, 0.025) : n(0.93, 0.012),
    onSurfaceVariant: light ? n(0.4, 0.03) : n(0.8, 0.025),
    outline: light ? n(0.56, 0.03) : n(0.64, 0.025),
    outlineVariant: light ? n(0.84, 0.025) : n(0.36, 0.022),
    inverseSurface: light ? n(0.27, 0.02) : n(0.92, 0.012),
    inverseOnSurface: light ? n(0.96, 0.01) : n(0.25, 0.02),
    positive: light ? lch(0.47, 0.13, 152) : lch(0.84, 0.14, 152),
    positiveContainer: light ? lch(0.93, 0.06, 152) : lch(0.36, 0.07, 152),
    onPositiveContainer: light ? lch(0.3, 0.08, 152) : lch(0.93, 0.07, 152),
    negative: light ? lch(0.5, 0.19, 25) : lch(0.82, 0.1, 25),
    negativeContainer: light ? lch(0.925, 0.04, 25) : lch(0.37, 0.09, 25),
    onNegativeContainer: light ? lch(0.31, 0.11, 25) : lch(0.93, 0.04, 25),
    heroFrom: hero[0],
    heroVia: hero[1],
    heroTo: hero[2],
    onHero,
    onHeroMuted: light ? '#ffffffd9' : '#ffffffd1',
    scrim: light ? '#00000052' : '#00000099',
  };
}
