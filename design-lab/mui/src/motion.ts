// Motion tokens for the Tonal design: Material 3 "emphasized" easing for effects, slightly
// overshooting springs for anything that moves in space.
import type { Transition, Variants } from 'motion/react';

export const ease = {
  emphasized: [0.2, 0, 0, 1],
  decelerate: [0.05, 0.7, 0.1, 1],
  accelerate: [0.3, 0, 0.8, 0.15],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export const spring = {
  /** Default spatial spring: quick, a hint of overshoot. */
  spatial: { type: 'spring', stiffness: 420, damping: 32, mass: 0.9 },
  /** For celebratory moments. */
  bouncy: { type: 'spring', stiffness: 380, damping: 17, mass: 0.8 },
  /** For layout shifts of whole rows / cards. */
  layout: { type: 'spring', stiffness: 520, damping: 44, mass: 1 },
} as const satisfies Record<string, Transition>;

/** Parent of a staggered entrance. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: ease.accelerate } },
};

/** Child of a staggered entrance: rises, un-squashes and fades in. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: ease.decelerate } },
};

export const riseSmall: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: ease.decelerate } },
};
