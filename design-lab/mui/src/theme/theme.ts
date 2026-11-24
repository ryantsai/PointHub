// "Tonal" theme: one MUI theme per season, each with a light and a dark colour scheme, all driven
// by CSS theme variables. Components only ever reference `theme.vars.*`, so switching season or
// scheme swaps custom-property values and never re-generates component CSS (no flash).
import type { CSSProperties } from 'react';
import { createTheme } from '@mui/material/styles';
import type { Shadows, Theme } from '@mui/material/styles';
import { seasons } from '@shared/seasons';
import type { Season, SeasonKey } from '@shared/seasons';
import { tonalRoles } from './color';
import type { TonalRoles } from './color';

/** Shape scale (px). Small parts are gently rounded, containers are bold, actions are pills. */
export const radius = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, xxl: 40, full: 999 } as const;

/** Material 3 easing set; durations in ms. */
export const easing = {
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  accelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
} as const;

declare module '@mui/material/styles' {
  interface CssThemeVariables {
    enabled: true;
  }
  interface Palette {
    tonal: TonalRoles;
  }
  interface PaletteOptions {
    tonal?: TonalRoles;
  }
  interface TypographyVariants {
    display: CSSProperties;
    label: CSSProperties;
  }
  interface TypographyVariantsOptions {
    display?: CSSProperties;
    label?: CSSProperties;
  }
}
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    display: true;
    label: true;
  }
}
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    tonal: true;
  }
}
declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    tonal: true;
  }
}

// Latin first, then CJK in the order that suits the page language (Han unification: a Japanese
// page must not fall back to Traditional Chinese glyph shapes, and vice versa).
const latin = '"Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue"';
const tc = '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC"';
const jp = '"Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", "Meiryo"';
const fontTc = `${latin}, ${tc}, ${jp}, sans-serif`;
const fontJp = `${latin}, ${jp}, ${tc}, sans-serif`;

const mix = (fg: string, pct: number, bg = 'transparent') => `color-mix(in srgb, ${fg} ${pct}%, ${bg})`;

const baseShadows = createTheme().shadows;
const level = [
  'none',
  '0 1px 2px rgb(0 0 0 / 0.14), 0 1px 3px 1px rgb(0 0 0 / 0.08)',
  '0 1px 2px rgb(0 0 0 / 0.14), 0 2px 6px 2px rgb(0 0 0 / 0.08)',
  '0 1px 3px rgb(0 0 0 / 0.16), 0 4px 8px 3px rgb(0 0 0 / 0.08)',
  '0 2px 3px rgb(0 0 0 / 0.16), 0 6px 10px 4px rgb(0 0 0 / 0.08)',
  '0 4px 4px rgb(0 0 0 / 0.16), 0 8px 12px 6px rgb(0 0 0 / 0.08)',
];
const shadows = baseShadows.map((_, i) => level[Math.min(level.length - 1, Math.ceil(i / 3))]) as Shadows;

function schemePalette(season: Season, scheme: 'light' | 'dark') {
  const r = tonalRoles(season, scheme);
  return {
    palette: {
      mode: scheme,
      primary: { main: r.primary, light: r.primaryContainer, dark: r.onPrimaryContainer, contrastText: r.onPrimary },
      secondary: { main: r.tertiary, light: r.tertiaryContainer, dark: r.onTertiaryContainer, contrastText: r.onTertiary },
      error: { main: r.negative, light: r.negativeContainer, dark: r.onNegativeContainer, contrastText: scheme === 'light' ? '#ffffff' : '#3b0a0a' },
      success: { main: r.positive, light: r.positiveContainer, dark: r.onPositiveContainer, contrastText: scheme === 'light' ? '#ffffff' : '#06290f' },
      background: { default: r.surface, paper: r.surfaceContainerLow },
      text: { primary: r.onSurface, secondary: r.onSurfaceVariant },
      divider: r.outlineVariant,
      tonal: r,
    },
  };
}

function buildTheme(season: Season): Theme {
  return createTheme({
    cssVariables: { colorSchemeSelector: 'data-scheme', cssVarPrefix: 'ph' },
    colorSchemes: { light: schemePalette(season, 'light'), dark: schemePalette(season, 'dark') },
    shape: { borderRadius: radius.md },
    shadows,
    spacing: 8,
    motion: { reducedMotion: 'system' },
    focusVisible: { outlineWidth: '3px', outlineOffset: '2px' },
    transitions: {
      easing: { easeInOut: easing.emphasized, easeOut: easing.decelerate, easeIn: easing.accelerate, sharp: easing.emphasized },
      duration: { shortest: 120, shorter: 180, short: 220, standard: 300, complex: 450, enteringScreen: 400, leavingScreen: 200 },
    },
    typography: {
      fontFamily: 'var(--ph-font)',
      fontWeightMedium: 600,
      display: {
        fontFamily: 'var(--ph-font)',
        fontSize: 'clamp(3.25rem, 2.2rem + 5.2vw, 5.5rem)',
        lineHeight: 1,
        fontWeight: 700,
        letterSpacing: '-0.035em',
        fontVariantNumeric: 'tabular-nums',
      },
      label: { fontFamily: 'var(--ph-font)', fontSize: '0.8125rem', lineHeight: 1.35, fontWeight: 600, letterSpacing: '0.01em' },
      h1: { fontSize: 'clamp(2rem, 1.5rem + 2vw, 2.875rem)', lineHeight: 1.12, fontWeight: 700, letterSpacing: '-0.025em' },
      h2: { fontSize: 'clamp(1.5rem, 1.3rem + 0.9vw, 1.875rem)', lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.012em' },
      h4: { fontSize: '1.75rem', lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' },
      h5: { fontSize: '1.125rem', lineHeight: 1.3, fontWeight: 700 },
      h6: { fontSize: '1rem', lineHeight: 1.35, fontWeight: 700 },
      subtitle1: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 600 },
      subtitle2: { fontSize: '0.875rem', lineHeight: 1.4, fontWeight: 600 },
      body1: { fontSize: '1rem', lineHeight: 1.5 },
      body2: { fontSize: '0.875rem', lineHeight: 1.45 },
      caption: { fontSize: '0.75rem', lineHeight: 1.35, fontWeight: 500 },
      button: { fontSize: '0.875rem', lineHeight: 1.25, fontWeight: 600, textTransform: 'none', letterSpacing: '0.005em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          ':root': { '--ph-font': fontTc, scrollPaddingTop: 88 },
          ':root:lang(ja)': { '--ph-font': fontJp },
          html: { WebkitTextSizeAdjust: '100%' },
          body: {
            backgroundColor: theme.vars.palette.background.default,
            overflowX: 'hidden',
            overflowWrap: 'anywhere',
            lineBreak: 'strict',
            fontFeatureSettings: '"palt" 0',
          },
          '::selection': { backgroundColor: theme.vars.palette.tonal.primaryContainer, color: theme.vars.palette.tonal.onPrimaryContainer },
          // Season / scheme change = a view transition: the new colours flood out from the control.
          '::view-transition-old(root)': { animation: 'none', mixBlendMode: 'normal' },
          '::view-transition-new(root)': { animation: `ph-flood 620ms ${easing.emphasized} both`, mixBlendMode: 'normal' },
          '@keyframes ph-flood': {
            from: { clipPath: 'circle(0 at var(--ph-vt-x, 90%) var(--ph-vt-y, 32px))' },
            to: { clipPath: 'circle(150vmax at var(--ph-vt-x, 90%) var(--ph-vt-y, 32px))' },
          },
          '@keyframes ph-fade': { from: { opacity: 0 }, to: { opacity: 1 } },
          // Fallback where the View Transitions API is missing: colours ease instead (see useLabState).
          '.ph-theming *, .ph-theming *::before, .ph-theming *::after': {
            transition: 'background-color 450ms ease, color 450ms ease, border-color 450ms ease, fill 450ms ease, stroke 450ms ease !important',
          },
          '@media (prefers-reduced-motion: reduce)': {
            '::view-transition-new(root)': { animation: 'ph-fade 160ms linear both' },
          },
        }),
      },
      MuiButton: {
        defaultProps: { disableElevation: true, variant: 'contained' },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: radius.full,
            minHeight: 40,
            paddingInline: 24,
            whiteSpace: 'nowrap',
            // Expressive press: the pill squares off while held.
            transition: theme.transitions.create(['background-color', 'box-shadow', 'border-radius', 'color', 'transform'], { duration: 200 }),
            '&:active': { borderRadius: radius.sm, transform: 'scale(0.97)' },
            '&.Mui-disabled': { backgroundColor: mix(theme.vars.palette.tonal.onSurface, 10), color: mix(theme.vars.palette.tonal.onSurface, 46) },
          }),
          sizeLarge: { minHeight: 56, paddingInline: 32, fontSize: '1.0625rem', '&:active': { borderRadius: radius.md } },
          sizeSmall: { minHeight: 32, paddingInline: 14, fontSize: '0.8125rem' },
          contained: ({ theme }) => ({ '&:hover': { boxShadow: theme.vars.shadows[2] } }),
          outlined: ({ theme }) => ({ borderColor: theme.vars.palette.tonal.outline, '&.Mui-disabled': { backgroundColor: 'transparent', borderColor: mix(theme.vars.palette.tonal.onSurface, 14) } }),
          text: { paddingInline: 14, '&.Mui-disabled': { backgroundColor: 'transparent' } },
        },
        variants: [
          {
            props: { variant: 'tonal' },
            style: ({ theme }) => ({
              backgroundColor: theme.vars.palette.tonal.secondaryContainer,
              color: theme.vars.palette.tonal.onSecondaryContainer,
              '&:hover': { backgroundColor: mix(theme.vars.palette.tonal.onSecondaryContainer, 9, theme.vars.palette.tonal.secondaryContainer), boxShadow: theme.vars.shadows[1] },
            }),
          },
          {
            props: { variant: 'tonal', color: 'primary' },
            style: ({ theme }) => ({
              backgroundColor: theme.vars.palette.tonal.primaryContainer,
              color: theme.vars.palette.tonal.onPrimaryContainer,
              '&:hover': { backgroundColor: mix(theme.vars.palette.tonal.onPrimaryContainer, 9, theme.vars.palette.tonal.primaryContainer) },
            }),
          },
          {
            props: { variant: 'tonal', color: 'error' },
            style: ({ theme }) => ({
              backgroundColor: theme.vars.palette.tonal.negativeContainer,
              color: theme.vars.palette.tonal.onNegativeContainer,
              '&:hover': { backgroundColor: mix(theme.vars.palette.tonal.onNegativeContainer, 9, theme.vars.palette.tonal.negativeContainer) },
            }),
          },
        ],
      },
      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            color: theme.vars.palette.tonal.onSurfaceVariant,
            borderRadius: radius.full,
            transition: theme.transitions.create(['background-color', 'border-radius', 'transform'], { duration: 200 }),
            '&:hover': { backgroundColor: mix(theme.vars.palette.tonal.onSurface, 8) },
            '&:active': { borderRadius: radius.sm, transform: 'scale(0.94)' },
          }),
        },
      },
      MuiFab: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: radius.lg,
            boxShadow: theme.vars.shadows[6],
            textTransform: 'none',
            fontWeight: 700,
            transition: theme.transitions.create(['background-color', 'box-shadow', 'border-radius', 'transform'], { duration: 250 }),
            '&:hover': { boxShadow: theme.vars.shadows[9] },
            '&:active': { boxShadow: theme.vars.shadows[6], borderRadius: radius.xl, transform: 'scale(0.96)' },
          }),
          extended: { height: 64, borderRadius: radius.lg, paddingInline: 22, fontSize: '1.0625rem', gap: 10 },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: radius.xl,
            backgroundColor: theme.vars.palette.tonal.surfaceContainerLow,
            color: theme.vars.palette.tonal.onSurface,
            overflow: 'hidden',
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: radius.xs, fontWeight: 600, fontSize: '0.8125rem', height: 30, maxWidth: '100%' },
          sizeSmall: { height: 24, fontSize: '0.75rem', '& .MuiChip-label': { paddingInline: 8 } },
          label: { paddingInline: 10 },
          icon: { marginLeft: 6, marginRight: -4, fontSize: 16, color: 'inherit' },
          outlined: ({ theme }) => ({ borderColor: theme.vars.palette.tonal.outlineVariant, color: theme.vars.palette.tonal.onSurfaceVariant }),
        },
        variants: [
          {
            props: { variant: 'tonal' },
            style: ({ theme }) => ({ backgroundColor: theme.vars.palette.tonal.secondaryContainer, color: theme.vars.palette.tonal.onSecondaryContainer }),
          },
          {
            props: { variant: 'tonal', color: 'primary' },
            style: ({ theme }) => ({ backgroundColor: theme.vars.palette.tonal.primaryContainer, color: theme.vars.palette.tonal.onPrimaryContainer }),
          },
          {
            props: { variant: 'tonal', color: 'secondary' },
            style: ({ theme }) => ({ backgroundColor: theme.vars.palette.tonal.tertiaryContainer, color: theme.vars.palette.tonal.onTertiaryContainer }),
          },
          {
            props: { variant: 'tonal', color: 'success' },
            style: ({ theme }) => ({ backgroundColor: theme.vars.palette.tonal.positiveContainer, color: theme.vars.palette.tonal.onPositiveContainer }),
          },
          {
            props: { variant: 'tonal', color: 'error' },
            style: ({ theme }) => ({ backgroundColor: theme.vars.palette.tonal.negativeContainer, color: theme.vars.palette.tonal.onNegativeContainer }),
          },
        ],
      },
      MuiAvatar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.vars.palette.tonal.secondaryContainer,
            color: theme.vars.palette.tonal.onSecondaryContainer,
            fontWeight: 700,
            fontSize: '1rem',
          }),
          rounded: { borderRadius: radius.md },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: ({ theme }) => ({ height: 8, borderRadius: radius.full, backgroundColor: mix(theme.vars.palette.tonal.onSurface, 10) }),
          bar: { borderRadius: radius.full, transitionDuration: '700ms', transitionTimingFunction: easing.emphasized },
        },
      },
      MuiTableContainer: { styleOverrides: { root: { borderRadius: radius.lg } } },
      MuiTable: { styleOverrides: { root: { borderCollapse: 'separate', borderSpacing: 0 } } },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({ borderBottom: `1px solid ${theme.vars.palette.tonal.outlineVariant}`, padding: '14px 12px', fontSize: '0.875rem', lineHeight: 1.4 }),
          head: ({ theme }) => ({
            ...theme.typography.label,
            color: theme.vars.palette.tonal.onSurfaceVariant,
            backgroundColor: theme.vars.palette.tonal.surfaceContainerHigh,
            borderBottom: 'none',
            paddingBlock: 10,
            whiteSpace: 'nowrap',
            '&:first-of-type': { borderRadius: `${radius.sm}px 0 0 ${radius.sm}px`, paddingLeft: 16 },
            '&:last-of-type': { borderRadius: `0 ${radius.sm}px ${radius.sm}px 0` },
          }),
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: ({ theme }) => ({
            transition: theme.transitions.create('background-color', { duration: 150 }),
            '&.MuiTableRow-hover:hover': { backgroundColor: mix(theme.vars.palette.tonal.onSurface, 5) },
            '&:last-of-type > td': { borderBottom: 'none' },
          }),
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: false, enterDelay: 400 },
        styleOverrides: {
          tooltip: ({ theme }) => ({
            backgroundColor: theme.vars.palette.tonal.inverseSurface,
            color: theme.vars.palette.tonal.inverseOnSurface,
            borderRadius: radius.xs,
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '6px 10px',
          }),
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: radius.lg,
            backgroundColor: theme.vars.palette.tonal.surfaceContainer,
            boxShadow: theme.vars.shadows[6],
            marginTop: 8,
            minWidth: 208,
          }),
          list: { padding: 8, display: 'grid', gap: 2 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: radius.sm,
            minHeight: 48,
            gap: 12,
            fontWeight: 500,
            transition: theme.transitions.create(['background-color', 'border-radius'], { duration: 180 }),
            '&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': {
              backgroundColor: theme.vars.palette.tonal.secondaryContainer,
              color: theme.vars.palette.tonal.onSecondaryContainer,
              borderRadius: radius.full,
              fontWeight: 700,
            },
          }),
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: ({ theme }) => ({ backgroundColor: theme.vars.palette.tonal.surfaceContainerHigh, borderRadius: radius.full, padding: 4, gap: 2 }),
          grouped: { border: 0, borderRadius: `${radius.full}px !important`, margin: '0 !important' },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            ...theme.typography.button,
            position: 'relative',
            color: theme.vars.palette.tonal.onSurfaceVariant,
            padding: '0 14px',
            minHeight: 36,
            gap: 6,
            whiteSpace: 'nowrap',
            transition: theme.transitions.create(['color', 'transform'], { duration: 200 }),
            '&:hover': { backgroundColor: mix(theme.vars.palette.tonal.onSurface, 6) },
            '&:active': { transform: 'scale(0.96)' },
            // The selected pill is a shared-layout element drawn by the control bar.
            '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: 'transparent', color: theme.vars.palette.primary.contrastText },
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: radius.full,
            backgroundColor: theme.vars.palette.tonal.surfaceContainerHigh,
            transition: theme.transitions.create(['background-color', 'box-shadow'], { duration: 200 }),
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent', transition: theme.transitions.create('border-color', { duration: 200 }) },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.vars.palette.tonal.outlineVariant },
            '&.Mui-focused': { backgroundColor: theme.vars.palette.tonal.surfaceContainerLowest },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.vars.palette.primary.main, borderWidth: 2 },
          }),
          input: ({ theme }) => ({ paddingBlock: 12, '&::placeholder': { color: theme.vars.palette.tonal.onSurfaceVariant, opacity: 1 } }),
        },
      },
      MuiSnackbarContent: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.vars.palette.tonal.inverseSurface,
            color: theme.vars.palette.tonal.inverseOnSurface,
            borderRadius: radius.md,
            fontWeight: 600,
            boxShadow: theme.vars.shadows[6],
          }),
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({ borderRadius: radius.xxl, backgroundColor: theme.vars.palette.tonal.surfaceContainerHigh, boxShadow: theme.vars.shadows[9] }),
        },
      },
      MuiBackdrop: { styleOverrides: { root: ({ theme }) => ({ '&:not(.MuiBackdrop-invisible)': { backgroundColor: theme.vars.palette.tonal.scrim } }) } },
      MuiDivider: { styleOverrides: { root: ({ theme }) => ({ borderColor: theme.vars.palette.tonal.outlineVariant }) } },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({ borderRadius: radius.md, transition: theme.transitions.create(['background-color', 'border-radius'], { duration: 200 }) }),
        },
      },
    },
  });
}

const cache = new Map<SeasonKey, Theme>();

export function themeForSeason(key: SeasonKey): Theme {
  let theme = cache.get(key);
  if (!theme) {
    theme = buildTheme(seasons.find((s) => s.key === key) ?? seasons[0]);
    cache.set(key, theme);
  }
  return theme;
}
