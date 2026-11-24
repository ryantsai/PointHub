import type { Transition, Variants } from 'motion/react';

/** Fluid, slightly under-damped spring used for almost everything. */
export const spring: Transition = { type: 'spring', stiffness: 240, damping: 26, mass: 0.9 };
/** Softer spring for large panes. */
export const softSpring: Transition = { type: 'spring', stiffness: 150, damping: 22, mass: 1 };
/** Snappy spring for presses and small pops. */
export const popSpring: Transition = { type: 'spring', stiffness: 420, damping: 24, mass: 0.7 };

/** Parent: reveals its children one after another. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const staggerFast: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.12 } },
};

/** Child: a pane of glass rising into place. Opacity sits on the pane itself so its backdrop blur keeps sampling the page. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
};

export const riseSmall: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
};
