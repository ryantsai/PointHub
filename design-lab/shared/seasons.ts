// Seasonal themes every design alternative must be able to switch between at runtime.
// These are inputs, not a stylesheet: each design maps them onto its own UI kit's theming system
// (and is free to derive extra shades), which is exactly what the comparison is meant to show.
import type { StringKey } from './strings';

export type SeasonKey = 'default' | 'lunarNewYear' | 'midAutumn' | 'winter';

export type Season = {
  key: SeasonKey;
  nameKey: StringKey;
  emoji: string;
  /** Brand colour for buttons, links and highlights (works on light and dark surfaces). */
  primary: string;
  /** Secondary accent for badges, charts and gradients. */
  accent: string;
  /** Two or three stops for hero backgrounds. */
  gradient: string[];
  /** Ambient decoration the design may animate. 'none' means keep it calm. */
  particles: 'none' | 'lanterns' | 'leaves' | 'snow';
};

export const seasons: Season[] = [
  { key: 'default', nameKey: 'season_default', emoji: '✨', primary: '#4F46E5', accent: '#06B6D4', gradient: ['#4F46E5', '#7C3AED', '#06B6D4'], particles: 'none' },
  { key: 'lunarNewYear', nameKey: 'season_lunarNewYear', emoji: '🧧', primary: '#D32F2F', accent: '#F5B301', gradient: ['#B71C1C', '#E53935', '#F5B301'], particles: 'lanterns' },
  { key: 'midAutumn', nameKey: 'season_midAutumn', emoji: '🥮', primary: '#C2570C', accent: '#FBBF24', gradient: ['#1E1B4B', '#7C2D12', '#F59E0B'], particles: 'leaves' },
  { key: 'winter', nameKey: 'season_winter', emoji: '❄️', primary: '#0E7490', accent: '#38BDF8', gradient: ['#0C4A6E', '#0E7490', '#A5F3FC'], particles: 'snow' },
];

export const seasonByKey = (key: SeasonKey): Season => seasons.find((s) => s.key === key) ?? seasons[0];
