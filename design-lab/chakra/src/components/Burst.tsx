import { Box } from '@chakra-ui/react';
import { motion, useReducedMotion } from 'motion/react';
import { seeded } from '../motion';

const colors = ['accent.solid', 'brand.solid', 'accent.emphasized', 'brand.emphasized', 'accent.solid', 'white'];

type Props = {
  /** Increment to fire. 0 renders nothing. */
  trigger: number;
  count?: number;
  radius?: number;
};

/**
 * Confetti pop for reward moments. A fixed, small number of transform/opacity-only particles that are
 * replaced (by key) on the next trigger. Skipped entirely for prefers-reduced-motion.
 */
export function Burst({ trigger, count = 16, radius = 92 }: Props) {
  const reduced = useReducedMotion();
  if (!trigger || reduced) return null;

  return (
    <Box key={trigger} aria-hidden position="absolute" top="50%" left="50%" w="0" h="0" pointerEvents="none" zIndex="2">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + seeded(i, trigger) * 0.6;
        const distance = radius * (0.55 + seeded(i, trigger + 7) * 0.6);
        const size = 6 + Math.round(seeded(i, 3) * 6);
        const shape = i % 3; // dot, square, streamer
        return (
          <Box
            key={i}
            asChild
            position="absolute"
            top={`-${size / 2}px`}
            left={`-${size / 2}px`}
            w={shape === 2 ? `${size * 0.5}px` : `${size}px`}
            h={shape === 2 ? `${size * 1.6}px` : `${size}px`}
            borderRadius={shape === 0 ? 'full' : '2px'}
            bg={colors[i % colors.length]}
          >
            <motion.span
              initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
              animate={{
                x: Math.cos(angle) * distance,
                y: [0, Math.sin(angle) * distance - 18, Math.sin(angle) * distance + 26],
                scale: [0, 1.15, 0.7],
                rotate: (seeded(i, 5) - 0.5) * 520,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.85 + seeded(i, 9) * 0.25, ease: [0.16, 0.84, 0.3, 1], times: [0, 0.45, 1] }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
