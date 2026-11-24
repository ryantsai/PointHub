// Colour maths for the Arcade theme: every season only gives us two hex values (primary, accent) and a
// gradient, so the 50–950 scales Chakra's `colorPalette` expects are derived here in OKLCH. Kept
// dependency-free so `scripts/contrast.ts` can run it in plain Node and check WCAG ratios.

type Lch = { l: number; c: number; h: number };

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexToLch(hex: string): Lch {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: Math.atan2(B, A) };
}

function lchToLinearRgb({ l: L, c, h }: Lch): [number, number, number] {
  const A = c * Math.cos(h);
  const B = c * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH → hex, pulling chroma in until the colour fits sRGB. */
export function lchToHex(input: Lch): string {
  const lch = { ...input, l: Math.min(1, Math.max(0, input.l)) };
  let rgb = lchToLinearRgb(lch);
  for (let i = 0; i < 40 && rgb.some((v) => v < -0.0005 || v > 1.0005); i++) {
    lch.c *= 0.94;
    rgb = lchToLinearRgb(lch);
  }
  return (
    '#' +
    rgb
      .map((v) => Math.round(toGamma(Math.min(1, Math.max(0, v))) * 255))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Darken (in OKLCH lightness) until `hex` reaches `ratio` against `against`. */
export function ensureContrast(hex: string, against: string, ratio: number): string {
  const lch = hexToLch(hex);
  let out = hex;
  for (let i = 0; i < 60 && contrast(out, against) < ratio; i++) {
    lch.l -= 0.006;
    out = lchToHex(lch);
  }
  return out;
}

export function mix(a: string, b: string, weightB: number): string {
  const [ra, ga, ba] = hexToRgb(a);
  const [rb, gb, bb] = hexToRgb(b);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * weightB).toString(16).padStart(2, '0');
  return `#${ch(ra, rb)}${ch(ga, gb)}${ch(ba, bb)}`;
}

export type Scale = Record<string, string>;

const LIGHT_END = 0.978;

/** A scale whose `anchor` step is exactly `hex`; lighter steps travel towards near-white, darker ones towards ink. */
function anchoredScale(hex: string, anchor: 400 | 600): Scale {
  const base = hexToLch(hex);
  // [step, how far towards LIGHT_END (0–1) or how much lightness is kept (darker steps), chroma factor]
  const lighter: [number, number, number][] =
    anchor === 600
      ? [[500, 0.2, 1], [400, 0.42, 0.86], [300, 0.62, 0.62], [200, 0.79, 0.4], [100, 0.9, 0.22], [50, 0.96, 0.1]]
      : [[300, 0.36, 0.78], [200, 0.62, 0.52], [100, 0.83, 0.28], [50, 0.94, 0.13]];
  const darker: [number, number, number][] =
    anchor === 600
      ? [[700, 0.86, 0.96], [800, 0.72, 0.86], [900, 0.57, 0.7], [950, 0.44, 0.55]]
      : [[500, 0.9, 1], [600, 0.77, 0.98], [700, 0.62, 0.94], [800, 0.5, 0.85], [900, 0.4, 0.7], [950, 0.3, 0.55]];

  const scale: Scale = { [anchor]: hex.toLowerCase() };
  for (const [step, t, cf] of lighter) scale[step] = lchToHex({ l: base.l + (LIGHT_END - base.l) * t, c: base.c * cf, h: base.h });
  for (const [step, keep, cf] of darker) scale[step] = lchToHex({ l: base.l * keep, c: base.c * cf, h: base.h });
  return scale;
}

/** Brand scale: 600 is the season's primary, nudged only if white text on it would miss AA. */
export const brandScale = (primary: string): Scale => anchoredScale(ensureContrast(primary, '#ffffff', 4.6), 600);

/** Accent scale: 400 is the season's accent (always a light, loud colour that carries dark text). */
export const accentScale = (accent: string): Scale => anchoredScale(accent, 400);

/** Neutrals tinted with the season's hue, so surfaces, borders and text shift temperature with it. */
export function neutralScale(primary: string): Scale {
  const { h } = hexToLch(primary);
  const steps: [number, number, number][] = [
    [50, 0.982, 0.007], [100, 0.958, 0.012], [200, 0.918, 0.017], [300, 0.862, 0.022], [400, 0.735, 0.027],
    [500, 0.585, 0.03], [600, 0.49, 0.032], [700, 0.42, 0.04], [800, 0.355, 0.044], [850, 0.31, 0.044],
    [900, 0.275, 0.042], [925, 0.243, 0.04], [950, 0.195, 0.036],
  ];
  return Object.fromEntries(steps.map(([step, l, c]) => [step, lchToHex({ l, c, h })]));
}

/** Hero gradient stops: the first two carry white text, so they are held to AA; the third is a glow only. */
export function heroStops(gradient: string[]): { from: string; via: string; to: string } {
  const [a, b, c] = gradient as [string, string, string | undefined];
  return {
    from: ensureContrast(a, '#ffffff', 6.4),
    via: ensureContrast(b, '#ffffff', 6.4),
    to: c ?? b,
  };
}
