import { type CSSProperties, useMemo } from 'react';
import { useDocumentVisibility } from '@mantine/hooks';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Season } from '@shared/seasons';
import classes from './fx.module.css';

type Kind = Season['particles'];
type Props = {
  kind: Kind;
  /** `page` is the fixed backdrop behind the content; `hero` is a small layer inside the balance card. */
  placement: 'page' | 'hero';
};

// Deterministic pseudo-random so a season always lays its particles out the same way.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const Lantern = () => (
  <svg className={classes.shape} viewBox="0 0 24 34" fill="none">
    <path d="M6.2 4.5C8 2.4 16 2.4 17.8 4.5L21 23.5c-2.4 2.6-15.6 2.6-18 0L6.2 4.5Z" fill="url(#mx-lantern)" />
    <path d="M8.5 25.6h7l-.8 3.2H9.3l-.8-3.2Z" fill="var(--mx-g1)" opacity=".8" />
    <ellipse cx="12" cy="19" rx="5" ry="6" fill="#fff6d6" opacity=".55" />
  </svg>
);

const Leaf = ({ tone }: { tone: number }) => (
  <svg className={classes.shape} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 22c0-5.5-7.5-6.6-10-12.4C5.3 3.4 18.7 3.4 22 9.6 19.500 15.4 12 16.500 12 22Z"
      fill={tone === 0 ? 'var(--mx-accent)' : tone === 1 ? 'var(--mx-g3)' : 'var(--mantine-color-brand-5)'}
    />
    <path d="M12 21.500V9.500" stroke="rgba(0,0,0,.18)" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

function ParticleField({ kind, placement }: { kind: Exclude<Kind, 'none'>; placement: Props['placement'] }) {
  const items = useMemo(() => {
    const rand = seeded(kind.length * 97 + (placement === 'hero' ? 13 : 5));
    const count = placement === 'hero' ? 7 : kind === 'snow' ? 18 : 11;
    return Array.from({ length: count }, (_, i) => {
      const base = kind === 'snow' ? 5 + rand() * 7 : kind === 'leaves' ? 13 + rand() * 11 : 15 + rand() * 13;
      const size = placement === 'hero' ? base * 0.8 : base;
      const dur = (kind === 'lanterns' ? 22 : kind === 'leaves' ? 15 : 13) * (0.75 + rand() * 0.6) * (placement === 'hero' ? 0.62 : 1);
      return {
        id: i,
        tone: i % 3,
        style: {
          '--x': `${((i + rand() * 0.8) / count) * 100}%`,
          '--size': `${size.toFixed(1)}px`,
          '--dur': `${dur.toFixed(1)}s`,
          '--delay': `${(-rand() * dur).toFixed(1)}s`,
          '--drift': `${((rand() - 0.5) * (kind === 'lanterns' ? 40 : 90)).toFixed(0)}px`,
          '--sway': `${(kind === 'lanterns' ? 7 : 16) + rand() * 10}px`,
          '--tilt': `${kind === 'lanterns' ? 4 : kind === 'leaves' ? 28 : 0}deg`,
          '--sway-dur': `${(2.6 + rand() * 2.4).toFixed(1)}s`,
          '--spin-dur': `${(5 + rand() * 5).toFixed(1)}s`,
          // inside the hero the particles drift behind white text, so they stay faint there
          '--alpha': placement === 'hero' ? 0.2 + rand() * 0.22 : 0.38 + rand() * 0.4,
        } as CSSProperties,
      };
    });
  }, [kind, placement]);

  return (
    <>
      {kind === 'lanterns' && (
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="mx-lantern" x1="12" y1="2" x2="12" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--mx-g2)" />
              <stop offset="1" stopColor="var(--mx-accent)" />
            </linearGradient>
          </defs>
        </svg>
      )}
      {items.map((p) => (
        <span key={p.id} className={classes.particle} data-travel={kind === 'lanterns' ? 'rise' : 'fall'} style={p.style}>
          <span className={classes.sway}>
            {kind === 'snow' && <span className={classes.snow} />}
            {kind === 'lanterns' && <Lantern />}
            {kind === 'leaves' && (
              <span className={classes.spin}>
                <Leaf tone={p.tone} />
              </span>
            )}
          </span>
        </span>
      ))}
    </>
  );
}

/** Season ambience: lanterns rise, leaves and snow fall. CSS-only motion (transform), paused while the tab is hidden. */
export function Particles({ kind, placement }: Props) {
  const reduce = useReducedMotion();
  const visibility = useDocumentVisibility();
  if (reduce) return null;
  return (
    <AnimatePresence>
      {kind !== 'none' && (
        <motion.div
          key={kind}
          className={classes.layer}
          data-fixed={placement === 'page' || undefined}
          data-on-hero={placement === 'hero' || undefined}
          data-paused={visibility === 'hidden' || undefined}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          <ParticleField kind={kind} placement={placement} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
