// One motion vocabulary for the whole design: springs that are lively but settle fast (a single small
// overshoot at most), and the entrance choreography both views share.
import type { Transition, Variants } from 'motion/react';

export const springs = {
  /** Layout shifts and entrances: no visible overshoot. */
  soft: { type: 'spring', stiffness: 230, damping: 26, mass: 0.9 },
  /** Reward moments: one small, quickly damped bounce. */
  bouncy: { type: 'spring', stiffness: 420, damping: 20, mass: 0.8 },
  /** Small UI swaps (icons, badges). */
  snap: { type: 'spring', stiffness: 560, damping: 30 },
} satisfies Record<string, Transition>;

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: springs.soft },
};

/**
 * Scroll reveal for cards further down the page. Transform only – the resting-off state stays fully
 * opaque, so nothing is ever invisible while waiting for the intersection observer.
 */
export const settle: Variants = {
  hidden: { y: 22, scale: 0.95 },
  show: { y: 0, scale: 1, transition: springs.bouncy },
};

export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: springs.bouncy },
};

/** Deterministic pseudo-random in [0, 1) so particles keep their place between renders. */
export const seeded = (i: number, salt = 1) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
