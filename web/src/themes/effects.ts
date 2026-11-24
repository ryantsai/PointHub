// Ambient effects as data: which sprites drift where. SeasonalEffects.tsx draws them on one canvas.
import type { EffectKind } from './registry';
import { dragonBoat, kite, magpie, moon, rabbit, waterLantern } from './sprites/motifs';
import {
  bambooLeaf,
  firecracker,
  lanternSmall,
  petal,
  snowflake,
  snowflakeOnLight,
  sparkle,
  sparkleLilac,
  sparkleSmall,
  tangyuanPink,
  tangyuanWhite,
  willowLeaf,
} from './sprites/minis';
import type { Sprite } from './sprites/types';

type Range = readonly [number, number];

export interface DriftLayer {
  sprites: readonly Sprite[];
  /** Sprites per 100,000 px² of viewport, capped by `max`. Use `count` for a fixed number instead. */
  density?: number;
  max?: number;
  count?: number;
  /** Integer scales to pick from: sprites are never drawn at fractional sizes. */
  scales: readonly number[];
  /** Velocity in px/s. Negative `vy` rises. */
  vx?: Range;
  vy?: Range;
  /** Side-to-side sway in px/s. */
  sway?: number;
  /** Vertical bob in px (floating on water, hanging in the wind). */
  bob?: number;
  /** Hop height in px (rabbits). */
  hop?: number;
  /** Where the sprite's top edge may be, as fractions of the viewport height. Default: anywhere. */
  band?: Range;
  /** Scatter along a rising arc across the sky instead of evenly (the magpie bridge). */
  arc?: boolean;
  /** Fixed centre position as fractions of the viewport (the moon). */
  pin?: Range;
  /** Blink in hard steps instead of moving. */
  twinkle?: boolean;
  alpha?: Range;
}

export interface FireworkSpec {
  colors: readonly string[];
  /** Seconds between launches. */
  interval: Range;
  /** Burst radius in px. */
  size: Range;
}

export interface EffectSpec {
  layers: readonly DriftLayer[];
  fireworks?: FireworkSpec;
}

/** `dark` picks colours that show on the current page background (white snow is invisible on a light page). */
export function getEffect(kind: EffectKind, dark: boolean): EffectSpec | null {
  switch (kind) {
    case 'none':
      return null;
    case 'snow':
      return {
        layers: [{ sprites: [dark ? snowflake : snowflakeOnLight], density: 3.2, max: 64, scales: [1, 1, 2], vx: [-6, 6], vy: [18, 46], sway: 12, alpha: [0.55, 0.95] }],
      };
    case 'petals':
      return { layers: [{ sprites: [petal], density: 2, max: 40, scales: [1, 2], vx: [-4, 10], vy: [20, 44], sway: 20, alpha: [0.6, 0.95] }] };
    case 'firecrackers':
      return {
        layers: [
          { sprites: [firecracker], density: 1, max: 20, scales: [1, 2], vy: [26, 54], sway: 10, alpha: [0.7, 1] },
          { sprites: [sparkleSmall, sparkle], density: 1.6, max: 30, scales: [1, 2], twinkle: true, alpha: [0.6, 1] },
        ],
        fireworks: { colors: ['#e53935', '#f5b301', '#ffe08a'], interval: [2.4, 4.8], size: [36, 60] },
      };
    case 'skyLanterns':
      return { layers: [{ sprites: [lanternSmall], density: 1, max: 18, scales: [1, 2, 2, 3], vy: [-22, -9], sway: 8, alpha: [0.65, 1] }] };
    case 'kites':
      return {
        layers: [
          { sprites: [kite], count: 3, scales: [2], vx: [6, 14], bob: 6, band: [0.1, 0.36], alpha: [0.8, 1] },
          { sprites: [willowLeaf], density: 1.1, max: 22, scales: [1, 2], vx: [10, 24], vy: [14, 30], sway: 8, alpha: [0.55, 0.9] },
        ],
      };
    case 'dragonBoat':
      return {
        layers: [
          { sprites: [dragonBoat], count: 1, scales: [3], vx: [-18, -18], bob: 2, band: [0.8, 0.8], alpha: [0.9, 0.9] },
          { sprites: [bambooLeaf], density: 1.2, max: 24, scales: [1, 2], vx: [-14, -4], vy: [16, 34], sway: 8, alpha: [0.55, 0.9] },
        ],
      };
    case 'starBridge':
      return {
        layers: [
          { sprites: [sparkle, sparkleLilac, sparkleSmall, sparkleSmall], density: 3, max: 56, scales: [1, 1, 2], twinkle: true, arc: true, alpha: [0.55, 1] },
          { sprites: [magpie], count: 2, scales: [2], vx: [-12, -8], bob: 5, band: [0.1, 0.3], alpha: [0.85, 1] },
        ],
      };
    case 'waterLanterns':
      return { layers: [{ sprites: [waterLantern], density: 0.6, max: 8, scales: [2], vx: [5, 11], bob: 2, band: [0.76, 0.86], alpha: [0.75, 1] }] };
    case 'moonRabbits':
      return {
        layers: [
          { sprites: [moon], count: 1, scales: [4], pin: [0.84, 0.17], alpha: [0.9, 0.9] },
          { sprites: [sparkleSmall], density: 1.4, max: 28, scales: [1, 2], twinkle: true, band: [0.08, 0.5], alpha: [0.5, 0.95] },
          { sprites: [rabbit], count: 2, scales: [2], vx: [14, 22], hop: 10, band: [0.82, 0.82], alpha: [0.9, 1] },
        ],
      };
    case 'tangyuan':
      return {
        layers: [{ sprites: [tangyuanPink, tangyuanWhite], density: 1.5, max: 30, scales: [1, 2, 2, 3], vy: [-16, -6], sway: 6, alpha: [0.6, 0.95] }],
      };
    case 'fireworks':
      return {
        layers: [{ sprites: [sparkleSmall], density: 1, max: 20, scales: [1, 2], twinkle: true, band: [0.05, 0.6], alpha: [0.5, 0.9] }],
        fireworks: { colors: ['#ffc53d', '#ff7ab6', '#5bd6ff', '#a78bfa', dark ? '#ffffff' : '#8f86e8'], interval: [0.9, 2.2], size: [48, 96] },
      };
    case 'tricolorFireworks':
      return {
        layers: [],
        fireworks: { colors: ['#ef4444', '#3b6fe0', dark ? '#ffffff' : '#9fb2e8'], interval: [1, 2.4], size: [48, 96] },
      };
  }
}
