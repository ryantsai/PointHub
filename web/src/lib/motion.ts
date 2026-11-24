import type { Transition, Variants } from 'motion/react';

// One motion vocabulary for the whole app. <MotionConfig reducedMotion="user"> in main.tsx turns the
// transforms off for people who ask for reduced motion, leaving only opacity changes.

export const springs = {
  /** Layout shifts and entrances: no visible overshoot. */
  soft: { type: 'spring', stiffness: 230, damping: 26, mass: 0.9 },
  /** Reward moments: one small, quickly damped bounce. */
  bouncy: { type: 'spring', stiffness: 420, damping: 20, mass: 0.8 },
  /** Small UI swaps (icons, badges). */
  snap: { type: 'spring', stiffness: 560, damping: 30 },
} satisfies Record<string, Transition>;

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { ...springs.soft, staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: springs.soft },
};

export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: springs.bouncy },
};

/** Deterministic pseudo-random in [0, 1) so decorative particles keep their place between renders. */
export const seeded = (i: number, salt = 1) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
