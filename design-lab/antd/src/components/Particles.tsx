// Ambient seasonal particles, kept inside the hero card (restrained on purpose).
// Pure CSS keyframes on transform/opacity; paused while the tab is hidden; removed for reduced motion.
import { useEffect, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Season } from '@shared/seasons';

const COUNTS: Record<Season['particles'], number> = { none: 0, snow: 14, leaves: 8, lanterns: 6 };

// Deterministic pseudo-random so the layout is stable between renders.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const particleStyle = (i: number): CSSProperties => {
  const vars: Record<string, string> = {
    '--x': Math.round(4 + rand(i, 1) * 92) + '%',
    '--dur': (7 + rand(i, 2) * 8).toFixed(1) + 's',
    '--delay': (-rand(i, 3) * 14).toFixed(1) + 's',
    '--drift': Math.round(-30 + rand(i, 4) * 60) + 'px',
    '--size': (0.6 + rand(i, 5) * 0.8).toFixed(2),
  };
  return vars as CSSProperties;
};

export function Particles({ kind }: { kind: Season['particles'] }) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(document.visibilityState === 'hidden');

  useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const count = reduce ? 0 : COUNTS[kind];
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key={kind}
          className={'ph-particles ph-particles-' + kind}
          data-paused={paused}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {Array.from({ length: count }, (_, i) => (
            <i key={i} style={particleStyle(i)} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
