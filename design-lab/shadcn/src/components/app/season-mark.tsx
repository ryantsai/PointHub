import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Season, SeasonKey } from '@shared/seasons';
import { cn } from '@/lib/utils';
import { EASE } from '@/lib/motion';

// One hairline glyph per season, drawn stroke by stroke when the season changes.
const GLYPHS: Record<SeasonKey, string[]> = {
  default: [
    'M20 5 C21 14 26 19 35 20 C26 21 21 26 20 35 C19 26 14 21 5 20 C14 19 19 14 20 5 Z',
    'M32 5 V11',
    'M29 8 H35',
  ],
  lunarNewYear: [
    'M20 3 V8',
    'M15 8 H25',
    'M20 8 C11 8 8 15 8 20 C8 25 11 32 20 32 C29 32 32 25 32 20 C32 15 29 8 20 8 Z',
    'M20 8 V32',
    'M14.5 9.5 C12 14 12 26 14.5 30.5',
    'M25.5 9.5 C28 14 28 26 25.5 30.5',
    'M16 32 H24',
    'M20 32 V38',
  ],
  midAutumn: [
    'M20 6 A14 14 0 1 0 20 34 A14 14 0 1 0 20 6 Z',
    'M25 9.5 A11.5 11.5 0 0 1 25 30.5',
    'M3 27 H17',
    'M24 31 H37',
    'M8 23 H13',
  ],
  winter: [
    'M20 4 V36',
    'M6.1 12 L33.9 28',
    'M6.1 28 L33.9 12',
    'M16.5 7.5 L20 11 L23.5 7.5',
    'M16.5 32.5 L20 29 L23.5 32.5',
    'M7.4 17.6 L12.2 15.5 L11.6 10.3',
    'M32.6 22.4 L27.8 24.5 L28.4 29.7',
    'M7.4 22.4 L12.2 24.5 L11.6 29.7',
    'M32.6 17.6 L27.8 15.5 L28.4 10.3',
  ],
};

export function SeasonMark({ season, className }: { season: SeasonKey; className?: string }) {
  return (
    <span aria-hidden className={cn('relative block size-10 text-primary', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.svg
          key={season}
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute inset-0 size-full"
          exit={{ opacity: 0, transition: { duration: 0.14 } }}
        >
          {GLYPHS[season].map((d, i) => (
            <motion.path
              key={d}
              d={d}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 0.7, ease: EASE, delay: 0.08 + i * 0.05 },
                opacity: { duration: 0.1, delay: 0.08 + i * 0.05 },
              }}
            />
          ))}
        </motion.svg>
      </AnimatePresence>
    </span>
  );
}

// ---- ambient particles ------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNT = 10;

const SHAPE: Record<Exclude<Season['particles'], 'none'>, string> = {
  // small outlined lantern, rising
  lanterns: 'h-2.5 w-2 rounded-[40%] border border-current',
  // leaf, falling and turning
  leaves: 'h-2.5 w-1.5 rounded-[0_80%_0_80%] bg-current',
  // snow, falling
  snow: 'size-1 rounded-full bg-current',
};

function usePageHidden() {
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}

/**
 * A sparse drift of season particles behind the hero. Ten elements, CSS keyframes on
 * transform/opacity only, paused while the tab is hidden and removed for reduced motion (index.css).
 */
export function SeasonParticles({ kind }: { kind: Season['particles'] }) {
  const hidden = usePageHidden();
  const particles = useMemo(() => {
    const random = mulberry32(kind.length * 7919);
    return Array.from({ length: COUNT }, (_, i) => {
      const rising = kind === 'lanterns';
      const style = {
        left: `${6 + random() * 88}%`,
        top: rising ? '100%' : '-4%',
        '--p-y': rising ? `${-(260 + random() * 220)}px` : `${300 + random() * 220}px`,
        '--p-x': `${(random() - 0.5) * (kind === 'leaves' ? 160 : 50)}px`,
        '--p-r': kind === 'leaves' ? `${180 + random() * 360}deg` : kind === 'lanterns' ? `${(random() - 0.5) * 16}deg` : '0deg',
        '--p-d': `${(kind === 'snow' ? 9 : 12) + random() * 8}s`,
        '--p-delay': `${-random() * 14}s`,
        '--p-o': `${0.16 + random() * 0.3}`,
        scale: `${0.7 + random() * 0.9}`,
      } as CSSProperties;
      return { id: i, style };
    });
  }, [kind]);

  return (
    <div aria-hidden data-paused={hidden} className="pointer-events-none absolute inset-0 overflow-hidden text-primary">
      <AnimatePresence>
        {kind !== 'none' && (
          <motion.div
            key={kind}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {particles.map((p) => (
              <span key={p.id} className={cn('ink-particle absolute block', SHAPE[kind])} style={p.style} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
