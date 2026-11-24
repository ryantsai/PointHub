import { AnimatePresence, motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { SeasonKey } from '@shared/seasons';
import { seasonByKey } from '@shared/seasons';

const counts = { none: 0, snow: 16, leaves: 9, lanterns: 7 } as const;

/** Deterministic pseudo-random in [0, 1) so particles keep their lanes across renders. */
const noise = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The page backdrop: three slow colour fields (the season gradient) plus the season's particles.
 * Pure CSS animation on transform/opacity; colours come from HeroUI-level CSS variables so they
 * tween when the season changes. Everything sits behind the glass panes, which blur it.
 */
export function Aurora({ season }: { season: SeasonKey }) {
  const kind = seasonByKey(season).particles;

  const particles = useMemo(() => {
    return Array.from({ length: counts[kind] }, (_, i) => {
      const a = noise(i + 1);
      const b = noise(i + 51);
      const c = noise(i + 101);
      const size = kind === 'snow' ? 4 + a * 7 : kind === 'leaves' ? 12 + a * 12 : 18 + a * 16;
      const duration = kind === 'snow' ? 14 + b * 12 : kind === 'leaves' ? 16 + b * 12 : 24 + b * 16;
      return {
        '--x': `${((i + 0.5) / counts[kind]) * 100 + (c - 0.5) * 8}%`,
        '--s': `${size.toFixed(1)}px`,
        '--d': `${duration.toFixed(1)}s`,
        '--delay': `${(-c * duration).toFixed(1)}s`,
        '--drift': `${((b - 0.5) * 22).toFixed(1)}vw`,
        '--spin': `${a > 0.5 ? 540 : -420}deg`,
        '--o': (kind === 'lanterns' ? 0.5 + a * 0.3 : 0.45 + a * 0.45).toFixed(2),
      } as CSSProperties;
    });
  }, [kind]);

  return (
    <>
      <div className="aurora" aria-hidden>
        <div className="aurora__blob aurora__blob--1" />
        <div className="aurora__blob aurora__blob--2" />
        <div className="aurora__blob aurora__blob--3" />
      </div>
      <AnimatePresence>
        {kind !== 'none' && (
          <motion.div
            key={kind}
            aria-hidden
            className="particles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            {particles.map((style, i) => (
              <span key={i} className={`particle particle--${kind}`} style={style} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
