// Maps @shared/seasons onto shadcn/ui's CSS variables.
//
// shadcn themes are plain CSS custom properties, so a season is just a rule block:
//   [data-season="winter"]        { --primary: …; --primary-foreground: …; --ring: …; --chart-1: …; }
//   .dark[data-season="winter"]   { … lighter variant … }
// The blocks are generated from the shared hex values (no copies of them in CSS) and each shade is
// nudged in OKLCH lightness until it clears WCAG AA both as text on the muted surface and as a
// button background, so all four seasons are safe in light and dark without hand-tuning.
import { seasons } from '@shared/seasons';

type Rgb = [number, number, number];
type Lch = { l: number; c: number; h: number };

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function hexToLch(hex: string): Lch {
  const n = parseInt(hex.slice(1), 16);
  const r = toLinear(((n >> 16) & 255) / 255);
  const g = toLinear(((n >> 8) & 255) / 255);
  const b = toLinear((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

function lchToLinearRgb({ l, c, h }: Lch): Rgb {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** Pull chroma in until the colour is displayable in sRGB. */
function fit(color: Lch): Lch {
  let next = color;
  while (!inGamut(lchToLinearRgb(next)) && next.c > 0.005) next = { ...next, c: next.c * 0.97 };
  return next;
}

const luminance = (color: Lch) => {
  const [r, g, b] = lchToLinearRgb(color).map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// Luminance of the surfaces the accent has to work on (the muted greys from index.css; grey Y = L³).
const SURFACE = { light: 0.965 ** 3, dark: 0.23 ** 3 };
const MIN_CONTRAST = 4.6;

function solve(hex: string, scheme: 'light' | 'dark'): Lch {
  let color = fit(hexToLch(hex));
  const step = scheme === 'light' ? -0.005 : 0.005;
  for (let i = 0; i < 120 && contrast(luminance(color), SURFACE[scheme]) < MIN_CONTRAST; i++) {
    color = fit({ ...color, l: color.l + step });
  }
  return color;
}

const css = ({ l, c, h }: Lch) => `oklch(${l.toFixed(4)} ${c.toFixed(4)} ${h.toFixed(2)})`;

export function seasonTokens(scheme: 'light' | 'dark') {
  return seasons.map((season) => {
    const primary = solve(season.primary, scheme);
    return { key: season.key, primary, value: css(primary), raw: season.primary, secondary: season.accent };
  });
}

export function buildSeasonCss(): string {
  const block = (scheme: 'light' | 'dark') =>
    seasonTokens(scheme)
      .map(({ key, value, secondary }) => {
        const selector = scheme === 'light' ? `[data-season="${key}"]` : `.dark[data-season="${key}"]`;
        const foreground = scheme === 'light' ? 'oklch(0.99 0 0)' : 'oklch(0.145 0 0)';
        return `${selector}{--primary:${value};--primary-foreground:${foreground};--ring:${value};--chart-1:${value};--season-secondary:${secondary};}`;
      })
      .join('\n');
  return `${block('light')}\n${block('dark')}`;
}

/** Injects the generated season rules once. */
export function installSeasonStyles(): void {
  if (document.getElementById('ink-seasons')) return;
  const style = document.createElement('style');
  style.id = 'ink-seasons';
  style.textContent = buildSeasonCss();
  document.head.appendChild(style);
}
