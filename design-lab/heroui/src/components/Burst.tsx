import { motion } from 'motion/react';

const colours = ['var(--accent)', 'var(--aurora-accent)', 'var(--warning)', 'var(--success)'];

/**
 * A short radial burst of light for redeem / check-in. Render it inside a `relative` box and bump
 * `fire` to replay; it draws nothing while `fire` is 0. Transform + opacity only.
 */
export function Burst({ fire, count = 16, radius = 96 }: { fire: number; count?: number; radius?: number }) {
  if (!fire) return null;
  return (
    <span key={fire} aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <motion.span
        className="absolute size-16 rounded-full border-2 border-accent"
        initial={{ scale: 0.3, opacity: 0.9 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 2 ? 0.28 : 0);
        const distance = radius * (0.55 + ((i * 37) % 10) / 18);
        const size = 5 + ((i * 13) % 6);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: size, height: size, background: colours[i % colours.length] }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance - 12,
              scale: [0, 1.25, 0.5],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: i * 0.008 }}
          />
        );
      })}
    </span>
  );
}
