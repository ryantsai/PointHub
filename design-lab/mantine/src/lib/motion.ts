import type { Transition, Variants } from 'motion/react';

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 };
export const softSpring: Transition = { type: 'spring', stiffness: 220, damping: 26 };

/** Parent of a staggered entrance. Children use `rise`. */
export const stagger = (delayChildren = 0.04, each = 0.07): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren: each } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } },
});

export const rise: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
};
