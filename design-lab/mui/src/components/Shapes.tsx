// Expressive shape vocabulary: scalloped "cookies", clovers and soft bursts, drawn as SVG paths.
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

const cache = new Map<string, string>();

/** Closed polar curve r = 1 - depth + depth * cos(lobes * angle), scaled to a 100 x 100 box. */
export function lobedPath(lobes: number, depth: number): string {
  const key = `${lobes}:${depth}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const steps = lobes * 16;
  let d = '';
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const r = 50 * (1 - depth + depth * Math.cos(lobes * angle));
    d += `${i === 0 ? 'M' : 'L'}${(50 + r * Math.cos(angle)).toFixed(2)} ${(50 + r * Math.sin(angle)).toFixed(2)}`;
  }
  d += 'Z';
  cache.set(key, d);
  return d;
}

type LobedProps = { lobes?: number; depth?: number; size?: number | string; sx?: SxProps<Theme> };

/** Decorative lobed shape; colour comes from `color` (currentColor). */
export function Lobed({ lobes = 12, depth = 0.045, size = 48, sx }: LobedProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 100 100"
      aria-hidden
      focusable="false"
      sx={[{ width: size, height: size, display: 'block', flexShrink: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <path d={lobedPath(lobes, depth)} fill="currentColor" />
    </Box>
  );
}

type BadgeProps = { children: ReactNode; size?: number; lobes?: number; depth?: number; bg: string; fg: string; spin?: boolean };

/** Content (icon, emoji, initials) centred on a lobed shape. */
export function ShapeBadge({ children, size = 48, lobes = 10, depth = 0.05, bg, fg, spin = false }: BadgeProps) {
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'grid', placeItems: 'center', color: fg }}>
      <Lobed
        lobes={lobes}
        depth={depth}
        size={size}
        sx={{
          position: 'absolute',
          inset: 0,
          color: bg,
          '@keyframes ph-spin': { to: { transform: 'rotate(360deg)' } },
          '@media (prefers-reduced-motion: no-preference)': spin ? { animation: 'ph-spin 28s linear infinite' } : {},
        }}
      />
      <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center', lineHeight: 1 }}>{children}</Box>
    </Box>
  );
}
