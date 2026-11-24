import { memo, useMemo } from 'react';
import type { Sprite } from './types';

interface PixelSpriteProps {
  sprite: Sprite;
  /** Whole number of CSS pixels per sprite pixel (1–8 are all crisp). */
  scale?: number;
  /** Accessible name. Without it the sprite is decorative and hidden from assistive technology. */
  title?: string;
  className?: string;
}

/** Horizontal runs of one colour become one <rect>, so a 16 × 16 sprite is ~60 nodes instead of 256. */
function toRuns(sprite: Sprite) {
  const runs: { x: number; y: number; w: number; fill: string }[] = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const cell = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === cell) end++;
      const fill = cell === '.' ? undefined : sprite.palette[cell];
      if (fill) runs.push({ x, y, w: end - x, fill });
      x = end;
    }
  });
  return runs;
}

/** Renders a sprite as inline SVG at an integer scale. The only way theme art gets on screen outside the canvas. */
export const PixelSprite = memo(function PixelSprite({ sprite, scale = 2, title, className }: PixelSpriteProps) {
  const runs = useMemo(() => toRuns(sprite), [sprite]);
  const px = Math.max(1, Math.round(scale));
  return (
    <svg
      className={className}
      width={sprite.w * px}
      height={sprite.h * px}
      viewBox={`0 0 ${sprite.w} ${sprite.h}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {runs.map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.w} height={1} fill={run.fill} />
      ))}
    </svg>
  );
});
