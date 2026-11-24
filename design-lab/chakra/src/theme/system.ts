// The Arcade theme, built with Chakra v3's `createSystem`.
//
// Seasons in this kit:
//   1. tokens          – one static 50–950 scale per season for brand / accent / neutral (derived in palette.ts)
//   2. conditions      – `_seasonLny`, `_seasonMaf`, `_seasonWin` match `<html data-season="…">`
//   3. semantic tokens – `brand.*`, `accent.*`, `neutral.*` scales that switch on those conditions, and the
//                        usual role tokens (solid / fg / subtle / … plus bg, fg, border) that switch on
//                        `_light` / `_dark` and point at the seasonal scales.
// Every Chakra component then follows through `colorPalette="brand"` (set once on <html>).
import { createSystem, defaultConfig, defineConfig, defineRecipe, defineSlotRecipe } from '@chakra-ui/react';
import { cardAnatomy, segmentGroupAnatomy } from '@chakra-ui/react/anatomy';
import { seasons, type SeasonKey } from '@shared/seasons';
import { accentScale, brandScale, heroStops, neutralScale, type Scale } from './palette';

const seasonId: Record<SeasonKey, string> = { default: 'std', lunarNewYear: 'lny', midAutumn: 'maf', winter: 'win' };
const seasonCondition: Record<SeasonKey, string> = {
  default: 'base',
  lunarNewYear: '_seasonLny',
  midAutumn: '_seasonMaf',
  winter: '_seasonWin',
};

const asTokens = (scale: Scale) => Object.fromEntries(Object.entries(scale).map(([step, value]) => [step, { value }]));

// 1. static per-season scales --------------------------------------------------------------------
export const seasonPalettes = Object.fromEntries(
  seasons.map((s) => [
    s.key,
    { brand: brandScale(s.primary), accent: accentScale(s.accent), neutral: neutralScale(s.primary), hero: heroStops(s.gradient) },
  ]),
) as Record<SeasonKey, { brand: Scale; accent: Scale; neutral: Scale; hero: { from: string; via: string; to: string } }>;

const seasonTokens = Object.fromEntries(
  seasons.map((s) => {
    const p = seasonPalettes[s.key];
    return [seasonId[s.key], { brand: asTokens(p.brand), accent: asTokens(p.accent), neutral: asTokens(p.neutral), hero: asTokens(p.hero) }];
  }),
);

// 3a. seasonal scales as semantic tokens ----------------------------------------------------------
const seasonal = (group: 'brand' | 'accent' | 'neutral' | 'hero', step: string) => ({
  value: Object.fromEntries(seasons.map((s) => [seasonCondition[s.key], `{colors.ssn.${seasonId[s.key]}.${group}.${step}}`])),
});
const seasonalScale = (group: 'brand' | 'accent' | 'neutral' | 'hero') =>
  Object.fromEntries(Object.keys(seasonPalettes.default[group]).map((step) => [step, seasonal(group, step)]));

// 3b. role tokens -----------------------------------------------------------------------------------
const role = (light: string, dark: string) => ({ value: { _light: light, _dark: dark } });
const n = (step: number) => `{colors.neutral.${step}}`;
const b = (step: number) => `{colors.brand.${step}}`;
const a = (step: number) => `{colors.accent.${step}}`;

/** Role mapping shared with scripts/contrast.ts so the WCAG check tests exactly what ships. */
export const roles = {
  bg: { DEFAULT: [50, 950], subtle: [100, 900], muted: [200, 850], emphasized: [300, 800], panel: [0, 925], inverted: [950, 50] },
  fg: { DEFAULT: [950, 50], muted: [600, 400], subtle: [500, 500], inverted: [50, 950] },
  border: { DEFAULT: [200, 800], muted: [100, 850], subtle: [50, 900], emphasized: [300, 700], inverted: [800, 200] },
  brand: { solid: [600, 600], fg: [700, 300], subtle: [100, 950], muted: [200, 900], emphasized: [300, 800], focusRing: [500, 400], border: [300, 800], depth: [800, 800] },
  accent: { solid: [400, 400], fg: [800, 300], subtle: [100, 950], muted: [200, 900], emphasized: [300, 800], focusRing: [600, 400], border: [300, 800], depth: [600, 600], contrast: [950, 950] },
} as const;

const mapRoles = <K extends string>(table: Record<K, readonly [number, number]>, ref: (step: number) => string) =>
  Object.fromEntries(
    (Object.entries(table) as [K, readonly [number, number]][]).map(([name, [light, dark]]) => [
      name,
      role(light === 0 ? '{colors.white}' : ref(light), dark === 0 ? '{colors.white}' : ref(dark)),
    ]),
  );

// Recipes ---------------------------------------------------------------------------------------------
// Chunky "arcade button": a solid face sitting on a darker slab that it sinks into when pressed.
const button = defineRecipe({
  base: {
    borderRadius: 'l2',
    fontWeight: 'bold',
    letterSpacing: '0.01em',
    transitionProperty: 'transform, box-shadow, background-color, border-color, color, filter',
    transitionDuration: '160ms',
    transitionTimingFunction: 'cubic-bezier(0.3, 1.6, 0.5, 1)',
    '--btn-depth': 'colors.colorPalette.depth',
    focusVisibleRing: 'outside',
    focusRingWidth: '3px',
    focusRingOffset: '2px',
  },
  variants: {
    variant: {
      solid: {
        boxShadow: '0 4px 0 0 var(--btn-depth)',
        _hover: { bg: 'colorPalette.solid', filter: 'brightness(1.08)', transform: 'translateY(-1px)', boxShadow: '0 5px 0 0 var(--btn-depth)' },
        _active: { transform: 'translateY(3px)', boxShadow: '0 1px 0 0 var(--btn-depth)', transitionDuration: '60ms' },
      },
      subtle: {
        _hover: { transform: 'translateY(-1px)' },
        _active: { transform: 'translateY(1px) scale(0.98)', transitionDuration: '60ms' },
      },
      outline: {
        borderWidth: '2px',
        borderColor: 'border.emphasized',
        bg: 'bg.panel',
        color: 'fg',
        boxShadow: '0 3px 0 0 {colors.border.emphasized}',
        _hover: { bg: 'bg.subtle', transform: 'translateY(-1px)', boxShadow: '0 4px 0 0 {colors.border.emphasized}' },
        _active: { transform: 'translateY(2px)', boxShadow: '0 1px 0 0 {colors.border.emphasized}', transitionDuration: '60ms' },
      },
      ghost: {
        _active: { transform: 'scale(0.96)', transitionDuration: '60ms' },
      },
    },
  },
});

const badge = defineRecipe({
  base: { borderRadius: 'full', fontWeight: 'bold', letterSpacing: '0.01em' },
});

const input = defineRecipe({
  base: { borderRadius: 'l2' },
  variants: {
    variant: {
      outline: { borderWidth: '2px', borderColor: 'border.emphasized', bg: 'bg.panel', focusRingWidth: '3px' },
    },
  },
});

// Sticker-like panels: thick outline with a hard drop instead of a soft blur.
const card = defineSlotRecipe({
  slots: cardAnatomy.keys(),
  base: { root: { borderRadius: 'l3' } },
  variants: {
    variant: {
      outline: {
        root: { bg: 'bg.panel', borderWidth: '2px', borderColor: 'border', boxShadow: '0 4px 0 0 {colors.border}' },
      },
    },
  },
});

const segmentGroup = defineSlotRecipe({
  slots: segmentGroupAnatomy.keys(),
  base: {
    root: {
      '--segment-radius': 'radii.full',
      '--segment-indicator-bg': 'colors.colorPalette.solid',
      '--segment-indicator-shadow': '0 2px 0 0 {colors.colorPalette.depth}',
      bg: 'bg.muted',
      boxShadow: 'none',
      p: '1',
      gap: '0.5',
    },
    item: {
      fontWeight: 'bold',
      color: 'fg.muted',
      transition: 'color 160ms',
      _before: { display: 'none' },
      _hover: { color: 'fg' },
      _checked: { color: 'colorPalette.contrast', _hover: { color: 'colorPalette.contrast' } },
    },
    indicator: {
      transitionTimingFunction: 'cubic-bezier(0.3, 1.4, 0.5, 1)',
      transitionDuration: '320ms',
    },
  },
});

const cjkFallback = '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", "Noto Sans JP", "Yu Gothic UI", "Hiragino Sans"';

const config = defineConfig({
  conditions: {
    seasonLny: '[data-season=lunarNewYear] &',
    seasonMaf: '[data-season=midAutumn] &',
    seasonWin: '[data-season=winter] &',
  },
  globalCss: {
    html: {
      colorPalette: 'brand',
      // Latin first, then the CJK family that matches the active language (set from <html lang>).
      '--ph-font': `"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, ${cjkFallback}, sans-serif`,
      '--ph-font-display': `"Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, ${cjkFallback}, sans-serif`,
      '&[lang=ja]': {
        '--ph-font': '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", "Meiryo", sans-serif',
        '--ph-font-display': '"Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, "Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", "Meiryo", sans-serif',
      },
      '&[lang=zh-Hant]': {
        '--ph-font': '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
        '--ph-font-display': '"Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
      },
      scrollBehavior: 'smooth',
      // On the root this applies to the viewport, so the sticky control bar keeps working.
      overflowX: 'hidden',
    },
    body: {
      minHeight: '100dvh',
      // faint arcade dot grid on the canvas
      backgroundImage: 'radial-gradient({colors.border} 1.2px, transparent 1.2px)',
      backgroundSize: '22px 22px',
    },
    '*, *::before, *::after': {
      _motionReduce: {
        transitionDuration: '100ms !important',
        animation: 'none !important',
        scrollBehavior: 'auto !important',
      },
    },
    // Ambient particles stop when the tab is in the background (set from season.ts).
    'html[data-tab=hidden] [data-ambient] *': { animationPlayState: 'paused !important' },
  },
  theme: {
    tokens: {
      colors: { ssn: seasonTokens },
      fonts: {
        body: { value: 'var(--ph-font)' },
        heading: { value: 'var(--ph-font-display)' },
      },
      radii: {
        chunk: { value: '1.375rem' },
      },
      easings: {
        bounce: { value: 'cubic-bezier(0.3, 1.5, 0.5, 1)' },
      },
    },
    semanticTokens: {
      radii: {
        l1: { value: '{radii.md}' },
        l2: { value: '{radii.xl}' },
        l3: { value: '{radii.chunk}' },
      },
      colors: {
        brand: { ...seasonalScale('brand'), ...mapRoles(roles.brand, b), contrast: role('{colors.white}', '{colors.white}') },
        accent: { ...seasonalScale('accent'), ...mapRoles(roles.accent, a) },
        neutral: seasonalScale('neutral'),
        hero: seasonalScale('hero'),
        bg: mapRoles(roles.bg, n),
        fg: mapRoles(roles.fg, n),
        border: mapRoles(roles.border, n),
        // "gray" is what Chakra components fall back to; route it through the tinted neutrals too.
        gray: {
          contrast: role('{colors.white}', n(950)),
          fg: role(n(800), n(200)),
          subtle: role(n(100), n(900)),
          muted: role(n(200), n(850)),
          emphasized: role(n(300), n(800)),
          solid: role(n(900), n(50)),
          focusRing: role(n(500), n(400)),
          border: role(n(200), n(800)),
          depth: role(n(950), n(400)),
        },
        green: { depth: role('{colors.green.800}', '{colors.green.800}') },
        red: { depth: role('{colors.red.800}', '{colors.red.800}') },
        // signed amounts
        gain: role('{colors.green.700}', '{colors.green.300}'),
        loss: role('{colors.red.700}', '{colors.red.300}'),
      },
    },
    recipes: { button, badge, input },
    slotRecipes: { card, segmentGroup },
    keyframes: {
      phFall: {
        '0%': { transform: 'translate3d(0, -12%, 0) rotate(0deg)', opacity: '0' },
        '12%': { opacity: 'var(--ph-o, 0.8)' },
        '88%': { opacity: 'var(--ph-o, 0.8)' },
        '100%': { transform: 'translate3d(var(--ph-dx, 20px), var(--ph-dy, 420px), 0) rotate(var(--ph-rot, 180deg))', opacity: '0' },
      },
      phRise: {
        '0%': { transform: 'translate3d(0, 0, 0) rotate(-4deg)', opacity: '0' },
        '15%': { opacity: 'var(--ph-o, 0.8)' },
        '50%': { transform: 'translate3d(calc(var(--ph-dx, 20px) * 0.5), calc(var(--ph-dy, -200px) * 0.5), 0) rotate(4deg)' },
        '85%': { opacity: 'var(--ph-o, 0.8)' },
        '100%': { transform: 'translate3d(var(--ph-dx, 20px), var(--ph-dy, -200px), 0) rotate(-4deg)', opacity: '0' },
      },
      phPing: {
        '0%': { transform: 'scale(1)', opacity: '0.7' },
        '80%, 100%': { transform: 'scale(2.4)', opacity: '0' },
      },
      phFlash: {
        '0%, 25%': { backgroundColor: 'var(--flash)' },
        '100%': { backgroundColor: 'transparent' },
      },
      phFloat: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-4px)' },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
