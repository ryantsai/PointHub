// A small radial confetti burst for moments of delight (redeem, check-in). Transform/opacity only.
import { motion, useReducedMotion } from 'motion/react';
import { EASE } from '../motion';

const COUNT = 14;

export function Burst({ fire, colors }: { fire: number; colors: string[] }) {
  const reduce = useReducedMotion();
  if (!fire || reduce) return null;
  return (
    <span className="ph-burst" aria-hidden="true" key={fire}>
      {Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2 + (i % 2 ? 0.22 : -0.12);
        const distance = 38 + (i % 3) * 16;
        return (
          <motion.i
            key={i}
            style={{ background: colors[i % colors.length], borderRadius: i % 3 === 0 ? 2 : 99 }}
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance - 6,
              scale: [0.2, 1, 0.7],
              opacity: [1, 1, 0],
              rotate: i % 2 ? 140 : -140,
            }}
            transition={{ duration: 0.85, ease: EASE, delay: (i % 4) * 0.015 }}
          />
        );
      })}
    </span>
  );
}
