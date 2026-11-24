// The colour inputs of every theme. Plain data with no runtime imports, so `scripts/contrast.ts` can load it
// in Node and check WCAG ratios. registry.ts adds the sprites and the ambient effect.
import type { ThemeKey } from '../api/types';

/** camelCase id: the key under `themes.*` in the locale files and the token group `colors.ssn.<id>`. */
export type ThemeId =
  | 'default'
  | 'newYear'
  | 'lunarNewYear'
  | 'lanternFestival'
  | 'qingming'
  | 'dragonBoat'
  | 'qixi'
  | 'ghostFestival'
  | 'midAutumn'
  | 'nationalDay'
  | 'doubleNinth'
  | 'winterSolstice'
  | 'christmas';

export interface ThemeColors {
  /** The contract value (`ThemeKey` in docs/api.md), also what `?theme=` and `<html data-theme>` carry. */
  key: ThemeKey;
  id: ThemeId;
  /** Brand colour: buttons, links, highlights. Darkened automatically where white text sits on it. */
  primary: string;
  /** Loud, light secondary colour: coins, progress, rewards. Carries dark text. */
  accent: string;
  /** Hero background: two stops that carry white text (darkened to AA if needed), then a glow. */
  gradient: readonly [string, string, string];
  /** Hue of the neutral greys (defaults to `primary`) and how strongly they are tinted (default 1). */
  neutralTint?: string;
  neutralChroma?: number;
}

export const THEME_COLORS: readonly ThemeColors[] = [
  // Company colours: blue is primary, green is the accent, the grey tints the neutrals.
  { key: 'default', id: 'default', primary: '#199ECF', accent: '#75B42B', gradient: ['#0F6F9C', '#199ECF', '#75B42B'], neutralTint: '#54555A', neutralChroma: 0.45 },
  // 元旦: midnight sky, champagne gold, the first sunrise.
  { key: 'new-year', id: 'newYear', primary: '#5B4BDB', accent: '#FFC53D', gradient: ['#1E1B4B', '#4C3FD1', '#FFC53D'] },
  // 春節: red envelopes, gold, firecrackers.
  { key: 'lunar-new-year', id: 'lunarNewYear', primary: '#D32F2F', accent: '#F5B301', gradient: ['#B71C1C', '#E53935', '#F5B301'] },
  // 元宵節: sky lanterns glowing against the night.
  { key: 'lantern-festival', id: 'lanternFestival', primary: '#DB5A1B', accent: '#FFD166', gradient: ['#2A1B4A', '#C2410C', '#FFD166'] },
  // 清明節: fresh spring greens, kites, willow. Kept gentle.
  { key: 'qingming', id: 'qingming', primary: '#2F8F6B', accent: '#BFE07A', gradient: ['#1F6F5C', '#2F8F6B', '#CDEB8B'] },
  // 端午節: mugwort green, river teal, zongzi-string amber.
  { key: 'dragon-boat', id: 'dragonBoat', primary: '#5C7F2B', accent: '#F2A93B', gradient: ['#1F5E57', '#4D7C2A', '#F2A93B'] },
  // 七夕: the magpie bridge across a violet night sky.
  { key: 'qixi', id: 'qixi', primary: '#B4388F', accent: '#F9A8D4', gradient: ['#1E1A4D', '#7C3AAD', '#F9A8D4'] },
  // 中元節: water lanterns on deep indigo. Calm and respectful.
  { key: 'ghost-festival', id: 'ghostFestival', primary: '#34508F', accent: '#F3C77A', gradient: ['#101A3D', '#2B3F7A', '#F3C77A'] },
  // 中秋節: the full moon, the moon rabbit, mooncakes.
  { key: 'mid-autumn', id: 'midAutumn', primary: '#C2570C', accent: '#FBBF24', gradient: ['#1E1B4B', '#7C2D12', '#F59E0B'] },
  // 國慶日: red, white and blue fireworks. No flags or emblems.
  { key: 'national-day', id: 'nationalDay', primary: '#1E40AF', accent: '#FF7A7A', gradient: ['#172554', '#1D4ED8', '#EF4444'] },
  // 重陽節: chrysanthemum gold.
  { key: 'double-ninth', id: 'doubleNinth', primary: '#B7791F', accent: '#FFD54A', gradient: ['#6B4410', '#A66A12', '#FFD54A'] },
  // 冬至: red-bean rose, pink and white tangyuan, ginger syrup.
  { key: 'winter-solstice', id: 'winterSolstice', primary: '#B24C63', accent: '#FFC2CF', gradient: ['#5E2B3C', '#B24C63', '#FFD9A0'] },
  // 聖誕節: pine green, holly red, snow.
  { key: 'christmas', id: 'christmas', primary: '#12804F', accent: '#FF7468', gradient: ['#0B4D36', '#12804F', '#E5484D'] },
];
