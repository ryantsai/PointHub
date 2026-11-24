// A burst of expressive shapes for the moments of delight (redeem, check-in).
import { useCallback, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Portal from '@mui/material/Portal';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'motion/react';
import { ease } from '../motion';
import { lobedPath } from './Shapes';

type BurstAt = { id: number; x: number; y: number };

const PIECES = 18;
// Deterministic pseudo-random in [0, 1): stable across renders, no Math.random in render.
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function BurstPieces({ at }: { at: BurstAt }) {
  const theme = useTheme();
  const tonal = theme.vars.palette.tonal;
  const colors = [theme.vars.palette.primary.main, tonal.accentVivid, tonal.tertiaryContainer, theme.vars.palette.secondary.main, tonal.primaryContainer];
  return (
    <Box aria-hidden sx={{ position: 'fixed', left: at.x, top: at.y, width: 0, height: 0, pointerEvents: 'none', zIndex: theme.zIndex.tooltip + 1 }}>
      {Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * Math.PI * 2 + rand(at.id + i) * 0.5;
        const distance = 70 + rand(at.id * 3 + i) * 90;
        const size = 10 + Math.round(rand(at.id * 7 + i) * 12);
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - 26;
        const kind = i % 4;
        const color = colors[i % colors.length];
        return (
          <motion.span
            key={i}
            style={{ position: 'absolute', left: -size / 2, top: -size / 2, width: kind === 1 ? size * 1.8 : size, height: size, color, willChange: 'transform, opacity' }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{ x: [0, dx, dx * 1.12], y: [0, dy, dy + 70], scale: [0, 1.1, 0.5], opacity: [1, 1, 0], rotate: (rand(i + at.id) - 0.5) * 540 }}
            transition={{ duration: 1.15, times: [0, 0.42, 1], ease: ease.decelerate, delay: rand(i * 5 + at.id) * 0.06 }}
          >
            {kind === 3 ? (
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <path d={lobedPath(i % 8 === 3 ? 4 : 8, i % 8 === 3 ? 0.2 : 0.09)} fill="currentColor" />
              </svg>
            ) : (
              <span style={{ display: 'block', width: '100%', height: '100%', background: 'currentColor', borderRadius: kind === 2 ? '28%' : 999 }} />
            )}
          </motion.span>
        );
      })}
    </Box>
  );
}

/** Returns the burst layer (render it once) and a function that fires a burst from an element. */
export function useBurst() {
  const seq = useRef(0);
  const reduce = useReducedMotion();
  const [bursts, setBursts] = useState<BurstAt[]>([]);

  const fire = useCallback(
    (from: Element | null) => {
      if (!from || reduce) return;
      const rect = from.getBoundingClientRect();
      seq.current += 1;
      const id = seq.current;
      setBursts((list) => [...list, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }]);
      window.setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), 1500);
    },
    [reduce],
  );

  const layer = (
    <Portal>
      {bursts.map((b) => (
        <BurstPieces key={b.id} at={b} />
      ))}
    </Portal>
  );
  return [layer, fire] as const;
}
