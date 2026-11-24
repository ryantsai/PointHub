// "Console" theme: maps a shared Season + scheme onto Ant Design's token system.
// Seeds go through antd's algorithm; text-facing derivatives are overridden with
// contrast-checked values so every season stays WCAG AA in light and dark.
import { theme as antdTheme, type ThemeConfig } from 'antd';
import type { CSSProperties } from 'react';
import type { Locale } from '@shared/data';
import type { Season } from '@shared/seasons';
import type { Scheme } from '@shared/urlState';

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = (rgb: RGB): string =>
  '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** Mix `a` towards `b`; `t` is the share of `b`. */
export const mix = (a: string, b: string, t: number): string => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
};

export const alpha = (hex: string, a: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string): number => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Nudge `fg` away from `bg` (towards black or white) until it reaches `ratio`. */
export const ensureContrast = (fg: string, bg: string, ratio: number): string => {
  if (contrast(fg, bg) >= ratio) return fg;
  const target = luminance(bg) > 0.3 ? '#000000' : '#ffffff';
  for (let t = 0.03; t <= 1; t += 0.03) {
    const candidate = mix(fg, target, t);
    if (contrast(candidate, bg) >= ratio) return candidate;
  }
  return target;
};

const FONT_STACKS: Record<Locale, string> = {
  en: '"Segoe UI", system-ui, -apple-system, "Noto Sans TC", "Microsoft JhengHei", "Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", sans-serif',
  // Japanese glyph forms first so shared kanji are not drawn with Traditional Chinese shapes.
  ja: '"Segoe UI", "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", Meiryo, "Noto Sans TC", "Microsoft JhengHei", sans-serif',
  'zh-Hant': '"Segoe UI", "Microsoft JhengHei UI", "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", "Noto Sans JP", "Yu Gothic UI", sans-serif',
};

export const MONO_STACK = '"Cascadia Mono", Consolas, "SF Mono", ui-monospace, monospace';

export type Palette = ReturnType<typeof buildPalette>;

export function buildPalette(season: Season, scheme: Scheme) {
  const dark = scheme === 'dark';
  const tint = (base: string, share: number) => mix(base, season.primary, share);

  // Surfaces carry a whisper of the season so a season change re-tints the whole console.
  const bgLayout = dark ? tint('#0B0D11', 0.05) : tint('#F3F4F6', 0.04);
  const bgContainer = dark ? tint('#13161B', 0.04) : '#FFFFFF';
  const bgElevated = dark ? tint('#1A1E25', 0.05) : '#FFFFFF';
  const bgSunken = dark ? tint('#0F1216', 0.05) : tint('#F7F8FA', 0.03);
  const border = dark ? tint('#2A2F38', 0.08) : tint('#D9DDE3', 0.06);
  const borderSubtle = dark ? tint('#20242C', 0.06) : tint('#E8EAEE', 0.05);
  const fill = dark ? tint('#1E222A', 0.08) : tint('#EEF0F3', 0.06);

  const text = dark ? '#ECEEF2' : '#12151C';
  const textSecondary = dark ? '#A9B1BD' : '#4A5261';
  const textTertiary = dark ? '#8C95A3' : '#5E6675';

  // Solid primary sits under white text (buttons); states darken so the label never loses contrast.
  const primarySolid = ensureContrast(season.primary, '#ffffff', 4.5);
  const primaryHover = mix(primarySolid, '#000000', 0.12);
  const primaryActive = mix(primarySolid, '#000000', 0.22);
  const primaryBg = dark ? mix(bgContainer, season.primary, 0.2) : mix('#ffffff', season.primary, 0.08);
  const primaryBgHover = dark ? mix(bgContainer, season.primary, 0.28) : mix('#ffffff', season.primary, 0.13);
  const primaryBorder = dark ? mix(bgContainer, season.primary, 0.5) : mix('#ffffff', season.primary, 0.35);
  // Colours used as text / icons are checked against every surface they can sit on (page, card,
  // popup, fills), so the same token is safe wherever it lands. Each step only pushes the colour
  // further from all surfaces, so the result satisfies the whole list.
  const surfaces = [bgLayout, bgContainer, bgElevated, bgSunken, fill];
  const readable = (color: string, ratio: number) => surfaces.reduce((acc, bg) => ensureContrast(acc, bg, ratio), color);
  const primaryText = ensureContrast(readable(season.primary, 4.6), primaryBg, 4.6);
  const primaryGraphic = readable(season.primary, 3.1);
  const accentGraphic = readable(season.accent, 3.1);
  const accentText = readable(season.accent, 4.6);

  const success = readable(dark ? '#34C17F' : '#15803D', 4.6);
  const warning = readable(dark ? '#F0B429' : '#B45309', 4.6);
  const error = readable(dark ? '#F87171' : '#C81E1E', 4.6);

  // Hero gradient: first two stops must carry white text; the third is only a corner glow.
  const [g1 = season.primary, g2 = season.primary, g3 = season.accent] = season.gradient;
  const hero1 = ensureContrast(g1, '#ffffff', 5.6);
  const hero2 = ensureContrast(g2, '#ffffff', 5.6);

  return {
    dark,
    bgLayout, bgContainer, bgElevated, bgSunken, border, borderSubtle, fill,
    text, textSecondary, textTertiary,
    primarySolid, primaryHover, primaryActive, primaryBg, primaryBgHover, primaryBorder,
    primaryText, primaryGraphic, accentGraphic, accentText, accent: season.accent,
    success, warning, error,
    hero1, hero2, heroGlow: g3,
  };
}

export function buildTheme(p: Palette, locale: Locale, reducedMotion: boolean): ThemeConfig {
  return {
    algorithm: p.dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    cssVar: { key: 'ph-console' },
    token: {
      // seeds
      colorPrimary: p.primarySolid,
      colorInfo: p.primarySolid,
      colorSuccess: p.dark ? '#34C17F' : '#15803D',
      colorWarning: p.dark ? '#F0B429' : '#C2740A',
      colorError: p.dark ? '#EF5350' : '#C81E1E',
      colorLink: p.primaryText,
      colorTextBase: p.dark ? '#F2F4F7' : '#0E1116',
      fontFamily: FONT_STACKS[locale],
      fontFamilyCode: MONO_STACK,
      fontSize: 14,
      borderRadius: 8,
      controlHeight: 34,
      wireframe: false,
      motion: !reducedMotion,
      // map / alias overrides
      colorPrimaryHover: p.primaryHover,
      colorPrimaryActive: p.primaryActive,
      colorPrimaryBg: p.primaryBg,
      colorPrimaryBgHover: p.primaryBgHover,
      colorPrimaryBorder: p.primaryBorder,
      colorPrimaryBorderHover: p.primaryGraphic,
      colorPrimaryText: p.primaryText,
      colorPrimaryTextHover: p.primaryText,
      colorPrimaryTextActive: p.primaryText,
      colorLinkHover: p.primaryText,
      colorLinkActive: p.primaryText,
      colorBgLayout: p.bgLayout,
      colorBgContainer: p.bgContainer,
      colorBgElevated: p.bgElevated,
      colorBorder: p.border,
      colorBorderSecondary: p.borderSubtle,
      colorSplit: p.borderSubtle,
      colorText: p.text,
      colorTextSecondary: p.textSecondary,
      colorTextTertiary: p.textTertiary,
      colorTextDescription: p.textTertiary,
      colorTextPlaceholder: p.textTertiary,
      colorTextHeading: p.text,
      colorTextLabel: p.textSecondary,
      colorFillQuaternary: p.bgSunken,
      colorFillTertiary: p.fill,
      colorSuccessText: p.success,
      colorWarningText: p.warning,
      colorErrorText: p.error,
      borderRadiusLG: 12,
      borderRadiusSM: 6,
      borderRadiusXS: 3,
      controlHeightSM: 26,
      controlHeightLG: 44,
      fontSizeSM: 12,
      fontSizeLG: 16,
      fontSizeXL: 20,
      fontSizeHeading1: 28,
      fontSizeHeading2: 22,
      fontSizeHeading3: 18,
      fontSizeHeading4: 16,
      fontSizeHeading5: 14,
      lineHeight: 1.55,
      fontWeightStrong: 600,
      boxShadowTertiary: p.dark ? '0 1px 2px rgba(0, 0, 0, 0.4)' : '0 1px 2px rgba(16, 24, 40, 0.05)',
      controlOutlineWidth: 3,
    },
    components: {
      Layout: {
        headerBg: p.bgContainer,
        headerHeight: 56,
        headerPadding: '0 20px',
        siderBg: 'transparent',
        bodyBg: p.bgLayout,
        footerBg: p.bgLayout,
      },
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemHeight: 36,
        itemBorderRadius: 8,
        itemMarginInline: 10,
        itemMarginBlock: 2,
        itemColor: p.textSecondary,
        itemHoverColor: p.text,
        itemHoverBg: p.fill,
        itemActiveBg: p.fill,
        itemSelectedBg: p.primaryBg,
        itemSelectedColor: p.primaryText,
        activeBarBorderWidth: 0,
        iconSize: 15,
        collapsedIconSize: 16,
        collapsedWidth: 64,
      },
      Table: {
        headerBg: p.bgSunken,
        headerColor: p.textSecondary,
        headerSplitColor: 'transparent',
        headerBorderRadius: 0,
        borderColor: p.borderSubtle,
        rowHoverBg: p.dark ? mix(p.bgContainer, p.primarySolid, 0.1) : mix('#ffffff', p.primarySolid, 0.045),
        cellPaddingBlockSM: 9,
        cellPaddingInlineSM: 12,
        cellFontSizeSM: 13,
      },
      Card: {
        headerFontSize: 14,
        headerFontSizeSM: 14,
        headerHeight: 48,
        headerHeightSM: 44,
        bodyPadding: 16,
        bodyPaddingSM: 12,
        headerPadding: 16,
        headerPaddingSM: 12,
      },
      Segmented: {
        trackBg: p.fill,
        trackPadding: 3,
        itemColor: p.textSecondary,
        itemHoverColor: p.text,
        itemSelectedBg: p.dark ? mix(p.bgElevated, '#ffffff', 0.08) : '#FFFFFF',
        itemSelectedColor: p.text,
      },
      Button: {
        fontWeight: 600,
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
        paddingInline: 14,
        paddingInlineSM: 10,
        contentFontSizeLG: 15,
      },
      Select: {
        optionSelectedBg: p.primaryBg,
        optionSelectedColor: p.primaryText,
        optionSelectedFontWeight: 600,
        optionActiveBg: p.fill,
      },
      Progress: {
        defaultColor: p.primaryGraphic,
        remainingColor: p.fill,
      },
      Statistic: {
        titleFontSize: 12,
        contentFontSize: 26,
      },
      Tag: {
        defaultBg: p.bgSunken,
        defaultColor: p.textSecondary,
      },
      Tooltip: {
        colorBgSpotlight: p.dark ? '#2A2F38' : '#1B1F27',
      },
      Input: {
        activeShadow: `0 0 0 3px ${alpha(p.primarySolid, p.dark ? 0.32 : 0.16)}`,
      },
    },
  };
}

/** Our own custom properties for the bespoke parts (hero, chart, lists). Registered in CSS so they tween. */
export function cssVars(p: Palette, locale: Locale): CSSProperties {
  const vars: Record<string, string> = {
    '--ph-bg': p.bgLayout,
    '--ph-surface': p.bgContainer,
    '--ph-elevated': p.bgElevated,
    '--ph-sunken': p.bgSunken,
    '--ph-border': p.border,
    '--ph-border-subtle': p.borderSubtle,
    '--ph-fill': p.fill,
    '--ph-text': p.text,
    '--ph-text-2': p.textSecondary,
    '--ph-text-3': p.textTertiary,
    '--ph-primary': p.primarySolid,
    '--ph-primary-text': p.primaryText,
    '--ph-primary-graphic': p.primaryGraphic,
    '--ph-primary-bg': p.primaryBg,
    '--ph-primary-border': p.primaryBorder,
    '--ph-accent': p.accent,
    '--ph-accent-graphic': p.accentGraphic,
    '--ph-accent-text': p.accentText,
    '--ph-success': p.success,
    '--ph-warning': p.warning,
    '--ph-error': p.error,
    '--ph-hero-1': p.hero1,
    '--ph-hero-2': p.hero2,
    '--ph-hero-glow': p.heroGlow,
    '--ph-font': FONT_STACKS[locale],
    '--ph-mono': MONO_STACK,
    '--ph-shadow-card': p.dark ? '0 1px 2px rgba(0, 0, 0, 0.4)' : '0 1px 2px rgba(16, 24, 40, 0.05)',
    '--ph-shadow-pop': p.dark ? '0 12px 32px rgba(0, 0, 0, 0.55)' : '0 12px 32px rgba(16, 24, 40, 0.12)',
  };
  return vars as CSSProperties;
}
