// The theme registry. Kit-neutral: colours (colors.ts), sprites and the ambient effect of each theme, nothing
// about Chakra (system.ts turns this into tokens) or the canvas (effects.ts turns `effect` into particles).
import type { ThemeKey } from '../api/types';
import { THEME_COLORS, type ThemeColors, type ThemeId } from './colors';
import {
  chrysanthemum,
  dragonBoat,
  firework,
  kite,
  magpie,
  mooncake,
  present,
  rabbit,
  redEnvelope,
  skyLantern,
  sunrise,
  tangyuanBowl,
  tree,
  trophy,
  waterLantern,
  zongzi,
} from './sprites/motifs';
import { firecracker, sparkle, willowLeaf } from './sprites/minis';
import type { Sprite } from './sprites/types';

export type { ThemeId } from './colors';

export type EffectKind =
  | 'none'
  | 'fireworks'
  | 'firecrackers'
  | 'skyLanterns'
  | 'kites'
  | 'dragonBoat'
  | 'starBridge'
  | 'waterLanterns'
  | 'moonRabbits'
  | 'tricolorFireworks'
  | 'petals'
  | 'tangyuan'
  | 'snow';

interface ThemeArt {
  /** 16 × 16 pixel-art motif shown wherever the theme introduces itself. */
  motif: Sprite;
  /** Optional second sprite for larger decorations (hero, sign-in page). */
  companion?: Sprite;
  /** Ambient layer behind the page. `none` keeps it calm. */
  effect: EffectKind;
}

export interface ThemeDefinition extends ThemeColors, ThemeArt {}

const ART: Record<ThemeId, ThemeArt> = {
  default: { motif: trophy, effect: 'none' },
  newYear: { motif: sunrise, companion: sparkle, effect: 'fireworks' },
  lunarNewYear: { motif: redEnvelope, companion: firecracker, effect: 'firecrackers' },
  lanternFestival: { motif: skyLantern, effect: 'skyLanterns' },
  qingming: { motif: kite, companion: willowLeaf, effect: 'kites' },
  dragonBoat: { motif: dragonBoat, companion: zongzi, effect: 'dragonBoat' },
  qixi: { motif: magpie, companion: sparkle, effect: 'starBridge' },
  ghostFestival: { motif: waterLantern, effect: 'waterLanterns' },
  midAutumn: { motif: rabbit, companion: mooncake, effect: 'moonRabbits' },
  nationalDay: { motif: firework, effect: 'tricolorFireworks' },
  doubleNinth: { motif: chrysanthemum, effect: 'petals' },
  winterSolstice: { motif: tangyuanBowl, effect: 'tangyuan' },
  christmas: { motif: tree, companion: present, effect: 'snow' },
};

export const DEFAULT_THEME_KEY: ThemeKey = 'default';

/** Every theme, `default` first. The order is the order of the festival year. */
export const THEMES: readonly ThemeDefinition[] = THEME_COLORS.map((colors) => ({ ...colors, ...ART[colors.id] }));

const BY_KEY = new Map<string, ThemeDefinition>(THEMES.map((theme) => [theme.key, theme]));

export function isThemeKey(key: unknown): key is ThemeKey {
  return typeof key === 'string' && BY_KEY.has(key);
}

/** Unknown keys (a theme the server knows but this build does not) fall back to the standard theme. */
export function getTheme(key: string | null | undefined): ThemeDefinition {
  return (key ? BY_KEY.get(key) : undefined) ?? THEMES[0];
}
