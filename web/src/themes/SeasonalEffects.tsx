import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { useColorMode } from './colorMode';
import { getEffect, type DriftLayer, type EffectSpec } from './effects';
import type { EffectKind } from './registry';
import type { Sprite } from './sprites/types';

interface Mote {
  layer: DriftLayer;
  image: HTMLCanvasElement;
  w: number;
  h: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  alpha: number;
}

interface Shell {
  x: number;
  y: number;
  targetY: number;
  color: string;
  radius: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
}

const between = (range: readonly [number, number] | undefined, fallback = 0) =>
  range ? range[0] + Math.random() * (range[1] - range[0]) : fallback;
const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/** Each sprite is drawn once at 1 px per cell and then blitted unsmoothed, so every scale stays crisp. */
const rasterCache = new WeakMap<Sprite, HTMLCanvasElement>();
function rasterise(sprite: Sprite): HTMLCanvasElement {
  const cached = rasterCache.get(sprite);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = sprite.w;
  canvas.height = sprite.h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    sprite.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const fill = row[x] === '.' ? undefined : sprite.palette[row[x]];
        if (!fill) continue;
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }
  rasterCache.set(sprite, canvas);
  return canvas;
}

function spawn(layer: DriftLayer, width: number, height: number): Mote {
  const sprite = pick(layer.sprites);
  const scale = pick(layer.scales);
  const w = sprite.w * scale;
  const h = sprite.h * scale;
  let x = Math.random() * width;
  let y = layer.band ? between(layer.band) * height : Math.random() * height;
  if (layer.arc) {
    // A band of stars rising from the lower left to the upper right, thicker in the middle.
    const t = Math.random();
    x = t * width;
    y = height * (0.7 - 0.5 * t) + (Math.random() - 0.5) * height * 0.22 * Math.sin(Math.PI * t + 0.4);
  }
  if (layer.pin) {
    x = layer.pin[0] * width - w / 2;
    y = layer.pin[1] * height - h / 2;
  }
  return {
    layer,
    image: rasterise(sprite),
    w,
    h,
    x,
    y,
    vx: between(layer.vx),
    vy: between(layer.vy),
    phase: Math.random() * Math.PI * 2,
    alpha: between(layer.alpha, 1),
  };
}

function targetCount(layer: DriftLayer, width: number, height: number): number {
  if (layer.count !== undefined) return layer.count;
  return Math.min(layer.max ?? 40, Math.round(((width * height) / 100_000) * (layer.density ?? 1)));
}

// Sprites drift behind headings that sit directly on the page background. These caps keep body text at AA even
// with a sprite right behind it: dark ink over a dark outline (light scheme), light text over a white sprite (dark).
const DIM_LIGHT = 0.5;
const DIM_DARK = 0.36;

const SPARK_PX = 4;
const snap = (value: number) => Math.round(value / SPARK_PX) * SPARK_PX;

function EffectCanvas({ spec, dim }: { spec: EffectSpec; dim: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let frameId = 0;
    let last = 0;
    let motes: Mote[] = [];
    const shells: Shell[] = [];
    const sparks: Spark[] = [];
    let nextLaunch = 0.4;
    // Firework sparks are 4 px squares: far too small to hide a letter, so they may be brighter than sprites.
    const sparkDim = Math.min(1, dim * 2);

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.imageSmoothingEnabled = false;
      motes = spec.layers.flatMap((layer) => {
        const existing = motes.filter((mote) => mote.layer === layer && !layer.pin && !layer.arc);
        const target = targetCount(layer, width, height);
        while (existing.length < target) existing.push(spawn(layer, width, height));
        return layer.pin || layer.arc ? Array.from({ length: target }, () => spawn(layer, width, height)) : existing.slice(0, target);
      });
    };

    const stepFireworks = (dt: number) => {
      const fw = spec.fireworks;
      if (!fw) return;
      nextLaunch -= dt;
      if (nextLaunch <= 0 && shells.length < 3) {
        nextLaunch = between(fw.interval);
        shells.push({
          x: width * (0.1 + Math.random() * 0.8),
          y: height,
          targetY: height * (0.12 + Math.random() * 0.33),
          color: pick(fw.colors),
          radius: between(fw.size),
        });
      }
      for (let i = shells.length - 1; i >= 0; i--) {
        const shell = shells[i];
        shell.y -= 420 * dt;
        ctx.globalAlpha = sparkDim;
        ctx.fillStyle = shell.color;
        ctx.fillRect(snap(shell.x), snap(shell.y), SPARK_PX, SPARK_PX * 2);
        if (shell.y > shell.targetY) continue;
        shells.splice(i, 1);
        const count = 22;
        for (let s = 0; s < count; s++) {
          const angle = (s / count) * Math.PI * 2;
          const speed = shell.radius * (s % 2 === 0 ? 1.15 : 0.65);
          sparks.push({ x: shell.x, y: shell.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 1.1 + Math.random() * 0.4, color: s % 5 === 0 ? pick(fw.colors) : shell.color });
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        spark.age += dt;
        if (spark.age >= spark.life) {
          sparks.splice(i, 1);
          continue;
        }
        const drag = Math.exp(-1.6 * dt);
        spark.vx *= drag;
        spark.vy = spark.vy * drag + 46 * dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        const left = 1 - spark.age / spark.life;
        // Fade in three hard steps, like a sprite animation.
        ctx.globalAlpha = sparkDim * (left > 0.5 ? 1 : left > 0.22 ? 0.6 : 0.3);
        ctx.fillStyle = spark.color;
        ctx.fillRect(snap(spark.x), snap(spark.y), SPARK_PX, SPARK_PX);
      }
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); // clamp so a stalled tab does not teleport sprites
      const time = now / 1000;
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (const mote of motes) {
        const { layer } = mote;
        let drawY = mote.y;
        let alpha = mote.alpha;
        if (layer.twinkle) {
          const wave = Math.sin(time * 1.4 + mote.phase * 3);
          alpha *= wave > 0.5 ? 1 : wave > -0.3 ? 0.55 : 0.12;
        } else if (!layer.pin) {
          mote.x += (mote.vx + Math.sin(time * 0.8 + mote.phase) * (layer.sway ?? 0)) * dt;
          mote.y += mote.vy * dt;
          if (mote.x > width + mote.w) mote.x = -mote.w;
          else if (mote.x < -mote.w) mote.x = width + mote.w;
          if (!layer.band) {
            if (mote.y > height + mote.h) mote.y = -mote.h;
            else if (mote.y < -mote.h) mote.y = height + mote.h;
          }
          drawY = mote.y;
          if (layer.bob) drawY += Math.round(Math.sin(time * 1.3 + mote.phase)) * layer.bob;
          if (layer.hop) drawY -= Math.abs(Math.sin(time * 4 + mote.phase)) * layer.hop;
        }
        ctx.globalAlpha = alpha * dim;
        ctx.drawImage(mote.image, Math.round(mote.x), Math.round(drawY), mote.w, mote.h);
      }
      stepFireworks(dt);
      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (frameId !== 0) return;
      last = performance.now();
      frameId = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(frameId);
      frameId = 0;
    };
    const onVisibilityChange = () => (document.hidden ? stop() : start());

    resize();
    if (!document.hidden) start();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [spec, dim]);

  return (
    <motion.canvas
      ref={canvasRef}
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', zIndex: -1, pointerEvents: 'none' }}
    />
  );
}

/**
 * Ambient pixel-art layer behind the page content (above the page background, below everything else).
 * One canvas; sprites only move by whole pixels and are drawn translucent. Not rendered when the OS asks for reduced motion,
 * paused while the tab is hidden, cross-faded when the theme or colour scheme changes.
 */
export function SeasonalEffects({ effect }: { effect: EffectKind }) {
  const reducedMotion = useReducedMotion();
  const { colorMode } = useColorMode();
  const dark = colorMode === 'dark';
  const spec = useMemo(() => getEffect(effect, dark), [effect, dark]);
  const active = spec !== null && !reducedMotion;

  return (
    <AnimatePresence>
      {active && <EffectCanvas key={`${effect}-${colorMode}`} spec={spec} dim={dark ? DIM_DARK : DIM_LIGHT} />}
    </AnimatePresence>
  );
}
