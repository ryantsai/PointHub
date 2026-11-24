// Maps a shared `Season` onto Mantine's theming system:
//  - `colors.brand` / `colors.accent`: 10-shade tuples generated from the season's primary / accent
//  - `primaryColor: 'brand'`, so every Mantine component (buttons, focus ring, progress, nav) follows
//  - a `cssVariablesResolver` that adds the Matsuri surface / gradient tokens (`--mx-*`) per colour
//    scheme and points Mantine's semantic variables (body, text, dimmed, default…) at them.
import {
  ActionIcon,
  Badge,
  Button,
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type MantineThemeOverride,
  SegmentedControl,
  TextInput,
  Tooltip,
} from '@mantine/core';
import type { Locale } from '@shared/data';
import type { Season } from '@shared/seasons';
import { alpha, buildTuple, ensureContrast, mix } from './palette';

const LATIN = '"Segoe UI"';
const TC = '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC"';
const JP = '"Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", "Meiryo"';

/** Same families for every locale; the order changes so Han glyphs use the reader's regional forms. */
const fontStack = (locale: Locale) => (locale === 'ja' ? `${LATIN}, ${JP}, ${TC}, system-ui, sans-serif` : `${LATIN}, ${TC}, ${JP}, system-ui, sans-serif`);

// Warm paper greys for light mode and plum-tinted "festival night" greys for dark mode.
const warmGray: MantineColorsTuple = ['#fcf8f3', '#f6efe7', '#ece2d7', '#dfd2c4', '#cdbdad', '#a99888', '#807062', '#66584c', '#493e35', '#2a211b'];
const nightPlum: MantineColorsTuple = ['#f6f0ea', '#d2c9d5', '#aaa0b0', '#807688', '#4b4356', '#362f40', '#272131', '#1c1823', '#16121c', '#100d15'];

export const MX_TOKENS = [
  '--mx-bg',
  '--mx-surface',
  '--mx-surface-2',
  '--mx-border',
  '--mx-text',
  '--mx-dim',
  '--mx-g1',
  '--mx-g2',
  '--mx-g3',
  '--mx-primary-text',
  '--mx-primary-strong',
  '--mx-accent',
  '--mx-accent-strong',
  '--mx-accent-text',
  '--mx-tint',
  '--mx-accent-tint',
  '--mx-glow',
  '--mx-wash-1',
  '--mx-wash-2',
  '--mx-shadow',
  '--mx-particle',
  '--mx-pos',
  '--mx-pos-tint',
  '--mx-neg',
  '--mx-neg-tint',
  '--mx-warn',
  '--mx-warn-tint',
] as const;

type MxToken = (typeof MX_TOKENS)[number];

function tokens(season: Season, scheme: 'light' | 'dark'): Record<MxToken, string> {
  const p = season.primary;
  const a = season.accent;
  const light = scheme === 'light';

  const bg = light ? mix('#fff8f0', p, 0.035) : mix('#120f17', p, 0.05);
  const surface = light ? mix('#fffdfb', p, 0.008) : mix('#1c1823', p, 0.07);
  const surface2 = light ? mix('#fbf2e7', p, 0.05) : mix('#27212f', p, 0.09);
  const border = light ? mix('#ebdfd2', p, 0.08) : mix('#3a3344', p, 0.1);
  const text = light ? mix('#2a1f18', p, 0.08) : '#f6f0ea';
  const dim = ensureContrast(light ? '#6a5c54' : '#c2b8c7', surface2, 5);

  // White text sits on g1→g2, so both are pushed to AA against white; g3 is only ever a glow.
  const deepen = (c: string) => ensureContrast(light ? c : mix(c, '#000000', 0.14), '#ffffff', 4.8);
  const stops = season.gradient;
  const g1 = deepen(stops[0]);
  const g2 = deepen(stops[Math.min(1, stops.length - 1)]);
  const g3 = stops[stops.length - 1];

  const tint = light ? mix(surface, p, 0.09) : mix(surface, p, 0.24);
  const accentTint = light ? mix(surface, a, 0.2) : mix(surface, a, 0.18);

  // Status colours are season-independent hues, tuned per scheme so text passes AA on its own tint and on cards.
  const status = (hue: string, tintShare: number) => {
    const statusTint = mix(surface, hue, tintShare);
    const onTint = ensureContrast(hue, statusTint, 4.6);
    return { tint: statusTint, text: ensureContrast(onTint, surface2, 4.6) };
  };
  const pos = status('#0f9d6b', light ? 0.12 : 0.16);
  const neg = status('#d6453d', light ? 0.1 : 0.16);
  const warn = status(light ? '#c27a00' : '#f5a524', light ? 0.16 : 0.18);

  return {
    '--mx-bg': bg,
    '--mx-surface': surface,
    '--mx-surface-2': surface2,
    '--mx-border': border,
    '--mx-text': text,
    '--mx-dim': dim,
    '--mx-g1': g1,
    '--mx-g2': g2,
    '--mx-g3': g3,
    '--mx-primary-text': ensureContrast(p, tint, 4.6),
    '--mx-primary-strong': ensureContrast(p, surface, 3.1),
    '--mx-accent': a,
    '--mx-accent-strong': ensureContrast(a, surface, 3.1),
    '--mx-accent-text': ensureContrast(a, accentTint, 4.6),
    '--mx-tint': tint,
    '--mx-accent-tint': accentTint,
    '--mx-glow': alpha(p, light ? 0.3 : 0.45),
    '--mx-wash-1': alpha(p, light ? 0.1 : 0.2),
    '--mx-wash-2': alpha(a, light ? 0.14 : 0.1),
    '--mx-shadow': light ? alpha(mix('#5a3a1e', p, 0.35), 0.16) : 'rgba(0, 0, 0, 0.5)',
    '--mx-particle': light ? mix(a, p, 0.35) : mix(a, '#ffffff', 0.55),
    '--mx-pos': pos.text,
    '--mx-pos-tint': pos.tint,
    '--mx-neg': neg.text,
    '--mx-neg-tint': neg.tint,
    '--mx-warn': warn.text,
    '--mx-warn-tint': warn.tint,
  };
}

export function buildTheme(season: Season, locale: Locale): MantineThemeOverride {
  const family = fontStack(locale);
  return createTheme({
    primaryColor: 'brand',
    primaryShade: { light: 6, dark: 6 },
    colors: {
      brand: buildTuple(season.primary),
      accent: buildTuple(season.accent),
      gray: warmGray,
      dark: nightPlum,
    },
    white: '#ffffff',
    black: '#2a1f18',
    fontFamily: family,
    fontFamilyMonospace: `"Cascadia Mono", Consolas, ui-monospace, monospace`,
    headings: {
      fontFamily: family,
      fontWeight: '800',
      sizes: {
        h1: { fontSize: '1.75rem', lineHeight: '1.25' },
        h2: { fontSize: '1.375rem', lineHeight: '1.3' },
        h3: { fontSize: '1.0625rem', lineHeight: '1.35' },
        h4: { fontSize: '0.9375rem', lineHeight: '1.4' },
      },
    },
    fontSizes: { xs: '0.75rem', sm: '0.8125rem', md: '0.9375rem', lg: '1.0625rem', xl: '1.25rem' },
    radius: { xs: '0.375rem', sm: '0.625rem', md: '0.875rem', lg: '1.125rem', xl: '1.5rem' },
    defaultRadius: 'md',
    spacing: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
    cursorType: 'pointer',
    focusRing: 'auto',
    respectReducedMotion: true,
    activeClassName: 'mx-press',
    components: {
      Button: Button.extend({ defaultProps: { radius: 'xl' }, styles: { label: { fontWeight: 700 } } }),
      ActionIcon: ActionIcon.extend({ defaultProps: { radius: 'xl' } }),
      Badge: Badge.extend({ defaultProps: { radius: 'xl', tt: 'none', fw: 700 } }),
      SegmentedControl: SegmentedControl.extend({ defaultProps: { radius: 'xl' } }),
      TextInput: TextInput.extend({ defaultProps: { radius: 'xl' } }),
      Tooltip: Tooltip.extend({ defaultProps: { radius: 'md', withArrow: true, openDelay: 250 } }),
    },
  });
}

export function buildResolver(season: Season): CSSVariablesResolver {
  const semantic = {
    '--mantine-color-body': 'var(--mx-bg)',
    '--mantine-color-text': 'var(--mx-text)',
    '--mantine-color-dimmed': 'var(--mx-dim)',
    '--mantine-color-placeholder': 'var(--mx-dim)',
    '--mantine-color-default': 'var(--mx-surface)',
    '--mantine-color-default-hover': 'var(--mx-surface-2)',
    '--mantine-color-default-color': 'var(--mx-text)',
    '--mantine-color-default-border': 'var(--mx-border)',
    '--mantine-color-anchor': 'var(--mx-primary-text)',
  };
  const light = { ...tokens(season, 'light'), ...semantic };
  const dark = { ...tokens(season, 'dark'), ...semantic };
  return () => ({ variables: {}, light, dark });
}
