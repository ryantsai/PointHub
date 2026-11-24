// Small OKLCH toolkit: enough to derive a Mantine 10-shade tuple and contrast-safe variants from
// the single `primary` / `accent` hex values a season provides. No dependency on a colour library.
import type { MantineColorsTuple } from '@mantine/core';

type Rgb = [number, number, number]; // 0..1, gamma encoded
type Lch = { l: number; c: number; h: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((x) => x + x)
          .join('')
      : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const to = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

function rgbToLch(rgb: Rgb): Lch {
  const [r, g, b] = rgb.map(toLinear);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return { l: L, c: Math.hypot(a, bb), h: Math.atan2(bb, a) };
}

function lchToLinear({ l, c, h }: Lch): Rgb {
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

/** OKLCH → hex, pulling chroma in until the colour fits sRGB. */
function lchToHex(lch: Lch): string {
  let c = lch.c;
  for (let i = 0; i < 24; i++) {
    const lin = lchToLinear({ ...lch, c });
    if (lin.every((v) => v >= -0.0005 && v <= 1.0005)) return rgbToHex(lin.map((v) => toGamma(clamp01(v))) as Rgb);
    c *= 0.92;
  }
  return rgbToHex(lchToLinear({ ...lch, c: 0 }).map((v) => toGamma(clamp01(v))) as Rgb);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Linear sRGB-space mix; `amount` is the share of `b`. */
export function mix(a: string, b: string, amount: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex(ra.map((v, i) => v + (rb[i] - v) * amount) as Rgb);
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v * 255));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Moves the colour's lightness (keeping hue, easing chroma) away from `against` until the WCAG
 * contrast ratio is reached. Used for text-on-surface and chart strokes so every season passes AA.
 */
export function ensureContrast(hex: string, against: string, ratio: number): string {
  if (contrast(hex, against) >= ratio) return hex;
  const lch = rgbToLch(hexToRgb(hex));
  const dir = luminance(against) > 0.4 ? -1 : 1;
  let out = hex;
  for (let i = 1; i <= 60; i++) {
    const l = clamp01(lch.l + dir * i * 0.0125);
    out = lchToHex({ l, c: lch.c * (1 - i * 0.004), h: lch.h });
    if (contrast(out, against) >= ratio) break;
  }
  return out;
}

/**
 * Ten shades with the seed colour kept exactly at index 6 (Mantine's light `primaryShade`), so the
 * season's brand colour is the one buttons use. Lighter steps lose chroma towards a paper tint;
 * darker steps deepen for hover / pressed states.
 */
export function buildTuple(seed: string): MantineColorsTuple {
  const base = rgbToLch(hexToRgb(seed));
  const top = 0.975;
  const lightSteps = [1, 0.86, 0.68, 0.5, 0.33, 0.16]; // share of the way from base to `top` for 0..5
  const chromaSteps = [0.16, 0.3, 0.5, 0.72, 0.88, 0.97];
  const shades: string[] = [];
  for (let i = 0; i < 6; i++) {
    shades.push(lchToHex({ l: base.l + (top - base.l) * lightSteps[i], c: base.c * chromaSteps[i], h: base.h }));
  }
  shades.push(seed.toLowerCase());
  for (let i = 1; i <= 3; i++) {
    shades.push(lchToHex({ l: base.l * (1 - 0.1 * i), c: base.c * (1 - 0.06 * i), h: base.h }));
  }
  return shades as unknown as MantineColorsTuple;
}
