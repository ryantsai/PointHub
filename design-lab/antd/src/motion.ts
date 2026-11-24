// Shared motion vocabulary: one easing curve, one stagger, one "rise" entrance.
import type { Transition, Variants } from 'motion/react';

export const EASE = [0.16, 1, 0.3, 1] as const;
export const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 };

export const stagger = (step = 0.06, delay = 0.04): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

export const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};
