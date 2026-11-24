import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import classes from './fx.module.css';

const COLORS = ['var(--mx-accent)', 'var(--mantine-color-brand-4)', 'var(--mx-g3)', '#ffffff', 'var(--mantine-color-brand-6)'];

type Props = { count?: number; spread?: number };

/**
 * One-shot confetti from the centre of the nearest positioned ancestor. Mount it with a fresh `key`
 * to fire; pieces only animate transform and opacity.
 */
export function Burst({ count = 18, spread = 110 }: Props) {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const distance = spread * (0.55 + Math.random() * 0.6);
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 20,
          rotate: (Math.random() - 0.5) * 540,
          color: COLORS[i % COLORS.length],
          round: i % 3 === 0,
          delay: Math.random() * 0.06,
          size: 7 + Math.round(Math.random() * 5),
        };
      }),
    [count, spread],
  );
  if (reduce) return null;
  return (
    <span className={classes.burst} aria-hidden="true">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className={classes.piece}
          style={{ background: p.color, width: p.size, height: p.round ? p.size : p.size * 0.5, borderRadius: p.round ? '50%' : 2 }}
          initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 56], scale: [0.2, 1, 0.85], opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{
            // out fast, then a short fall while fading: each property gets its own curve
            x: { duration: 1.1, delay: p.delay, ease: [0.16, 1, 0.3, 1] },
            y: { duration: 1.1, delay: p.delay, times: [0, 0.42, 1], ease: ['easeOut', 'easeIn'] },
            rotate: { duration: 1.1, delay: p.delay, ease: 'easeOut' },
            scale: { duration: 1.1, delay: p.delay, times: [0, 0.2, 1], ease: 'easeOut' },
            opacity: { duration: 1.1, delay: p.delay, times: [0, 0.68, 1], ease: 'linear' },
          }}
        />
      ))}
    </span>
  );
}
