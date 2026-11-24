// The Arcade design system, built with Chakra v3's `createSystem` from the kit-neutral registry.
//
// How a theme reaches a component:
//   1. tokens          – one static 50–950 scale per theme for brand / accent / neutral, plus the hero stops:
//                        `colors.ssn.<themeId>.<group>.<step>` (derived in palette.ts)
//   2. conditions      – `_theme<Id>` matches `<html data-theme="<key>">`
//   3. semantic tokens – `brand.*`, `accent.*`, `neutral.*`, `hero.*` switch on those conditions; the role tokens
//                        (solid / fg / subtle / … and bg, fg, border) switch on `_light` / `_dark` and point at them.
// Every Chakra component follows through `colorPalette="brand"`, set once on <html>.
import { createSystem, defaultConfig, defineConfig, defineRecipe, defineSlotRecipe } from '@chakra-ui/react';
import { cardAnatomy, nativeSelectAnatomy, numberInputAnatomy, segmentGroupAnatomy } from '@chakra-ui/react/anatomy';
import { accentScale, brandScale, heroStops, neutralScale, type Scale } from './palette';
import { THEMES, type ThemeDefinition, type ThemeId } from './registry';

type Group = 'brand' | 'accent' | 'neutral' | 'hero';
export type ThemePalette = Record<Group, Scale>;

const conditionName = (theme: ThemeDefinition) => `theme${theme.id[0].toUpperCase()}${theme.id.slice(1)}`;
const conditionKey = (theme: ThemeDefinition) => (theme.key === 'default' ? 'base' : `_${conditionName(theme)}`);

// 1. static per-theme scales ------------------------------------------------------------------------
export const themePalettes = Object.fromEntries(
  THEMES.map((theme) => [
    theme.id,
    {
      brand: brandScale(theme.primary),
      accent: accentScale(theme.accent),
      neutral: neutralScale(theme.neutralTint ?? theme.primary, theme.neutralChroma ?? 1),
      hero: heroStops(theme.gradient),
    },
  ]),
) as unknown as Record<ThemeId, ThemePalette>;

const asTokens = (scale: Scale) => Object.fromEntries(Object.entries(scale).map(([step, value]) => [step, { value }]));
const GROUPS: Group[] = ['brand', 'accent', 'neutral', 'hero'];

const themeTokens = Object.fromEntries(
  THEMES.map((theme) => [theme.id, Object.fromEntries(GROUPS.map((group) => [group, asTokens(themePalettes[theme.id][group])]))]),
);

// 3a. themed scales as semantic tokens --------------------------------------------------------------
const themedScale = (group: Group) =>
  Object.fromEntries(
    Object.keys(themePalettes.default[group]).map((step) => [
      step,
      { value: Object.fromEntries(THEMES.map((theme) => [conditionKey(theme), `{colors.ssn.${theme.id}.${group}.${step}}`])) },
    ]),
  );

// 3b. role tokens -----------------------------------------------------------------------------------
const role = (light: string, dark: string) => ({ value: { _light: light, _dark: dark } });
const n = (step: number) => `{colors.neutral.${step}}`;
const b = (step: number) => `{colors.brand.${step}}`;
const a = (step: number) => `{colors.accent.${step}}`;

/** [light step, dark step]; 0 means white. Shared with scripts/contrast.ts so the WCAG check tests what ships. */
export const roles = {
  bg: { DEFAULT: [50, 950], subtle: [100, 900], muted: [200, 850], emphasized: [300, 800], panel: [0, 925], inverted: [950, 50] },
  fg: { DEFAULT: [950, 50], muted: [600, 400], subtle: [500, 500], inverted: [50, 950] },
  border: { DEFAULT: [200, 800], muted: [100, 850], subtle: [50, 900], emphasized: [300, 700], inverted: [800, 200] },
  brand: { solid: [600, 600], fg: [700, 300], subtle: [100, 950], muted: [200, 900], emphasized: [300, 800], focusRing: [600, 400], border: [300, 800], depth: [800, 800] },
  accent: { solid: [400, 400], fg: [800, 300], subtle: [100, 950], muted: [200, 900], emphasized: [300, 800], focusRing: [600, 400], border: [300, 800], depth: [600, 600], contrast: [950, 950] },
} as const;

const mapRoles = <K extends string>(table: Record<K, readonly [number, number]>, ref: (step: number) => string) =>
  Object.fromEntries(
    (Object.entries(table) as [K, readonly [number, number]][]).map(([name, [light, dark]]) => [
      name,
      role(light === 0 ? '{colors.white}' : ref(light), dark === 0 ? '{colors.white}' : ref(dark)),
    ]),
  );

/** Chakra's own palettes get the `depth` role the chunky button needs (the slab under a solid button). */
const STATUS_PALETTES = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink'] as const;
const statusDepth = Object.fromEntries(
  STATUS_PALETTES.map((name) => [name, { depth: role(`{colors.${name}.800}`, `{colors.${name}.800}`) }]),
);

// Recipes -------------------------------------------------------------------------------------------
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
        _disabled: { boxShadow: 'none', transform: 'none', filter: 'none' },
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
        _disabled: { boxShadow: 'none', transform: 'none' },
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

// Sticker-like fields: a thick outline on the panel colour, a wide focus ring.
const fieldOutline = { borderWidth: '2px', borderColor: 'border.emphasized', bg: 'bg.panel', focusRingWidth: '3px' } as const;

const input = defineRecipe({
  base: { borderRadius: 'l2' },
  variants: { variant: { outline: fieldOutline } },
});

const textarea = defineRecipe({
  base: { borderRadius: 'l2' },
  variants: { variant: { outline: fieldOutline } },
});

const nativeSelect = defineSlotRecipe({
  slots: nativeSelectAnatomy.keys(),
  base: { field: { borderRadius: 'l2', fontWeight: 'medium' } },
  variants: { variant: { outline: { field: fieldOutline } } },
});

const numberInput = defineSlotRecipe({
  slots: numberInputAnatomy.keys(),
  base: { input: { borderRadius: 'l2' } },
  variants: { variant: { outline: { input: fieldOutline } } },
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

const latin = '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system';
const latinDisplay = '"Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system';
const tc = '"Noto Sans TC", "Microsoft JhengHei UI", "Microsoft JhengHei", "PingFang TC"';
const jp = '"Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", "Meiryo"';

const config = defineConfig({
  conditions: Object.fromEntries(
    THEMES.filter((theme) => theme.key !== 'default').map((theme) => [conditionName(theme), `[data-theme=${theme.key}] &`]),
  ),
  globalCss: {
    html: {
      colorPalette: 'brand',
      // Latin first, then the CJK family that matches the page language: Han characters are shared between
      // Japanese and Chinese, so the font order decides which glyph shapes are used.
      '--ph-font': `${latin}, ${tc}, ${jp}, sans-serif`,
      '--ph-font-display': `${latinDisplay}, ${tc}, ${jp}, sans-serif`,
      '&[lang=ja]': {
        '--ph-font': `${latin}, ${jp}, sans-serif`,
        '--ph-font-display': `${latinDisplay}, ${jp}, sans-serif`,
      },
      '&[lang=zh-Hant]': {
        '--ph-font': `${latin}, ${tc}, sans-serif`,
        '--ph-font-display': `${latinDisplay}, ${tc}, sans-serif`,
      },
      // The page background lives on the root so the ambient canvas (z-index -1) paints above it.
      bg: 'bg',
      backgroundImage: 'radial-gradient({colors.border} 1.2px, transparent 1.2px)',
      backgroundSize: '22px 22px',
      // On the root this applies to the viewport, so sticky headers keep working.
      overflowX: 'hidden',
    },
    body: {
      minHeight: '100dvh',
      bg: 'transparent',
      color: 'fg',
      fontFamily: 'body',
    },
    '*, *::before, *::after': {
      _motionReduce: {
        transitionDuration: '100ms !important',
        animation: 'none !important',
        scrollBehavior: 'auto !important',
      },
    },
    // CSS-animated decorations stop while the tab is in the background (set by themes/runtime.ts).
    'html[data-tab=hidden] [data-ambient], html[data-tab=hidden] [data-ambient] *': { animationPlayState: 'paused !important' },
  },
  theme: {
    tokens: {
      colors: { ssn: themeTokens },
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
        brand: { ...themedScale('brand'), ...mapRoles(roles.brand, b), contrast: role('{colors.white}', '{colors.white}') },
        accent: { ...themedScale('accent'), ...mapRoles(roles.accent, a) },
        neutral: themedScale('neutral'),
        hero: themedScale('hero'),
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
        ...statusDepth,
        // signed amounts
        gain: role('{colors.green.700}', '{colors.green.300}'),
        loss: role('{colors.red.700}', '{colors.red.300}'),
      },
    },
    recipes: { button, badge, input, textarea },
    slotRecipes: { card, segmentGroup, nativeSelect, numberInput },
    keyframes: {
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
      // Pixel-art bob: two hard steps instead of an eased float.
      phBob: {
        '0%, 49.9%': { transform: 'translateY(0)' },
        '50%, 100%': { transform: 'translateY(calc(var(--ph-bob, 2px) * -1))' },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
