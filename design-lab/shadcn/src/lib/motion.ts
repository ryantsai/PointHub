import type { Transition, Variants } from 'motion/react';

// Ink motion: precise and quick. One easing family, no overshoot anywhere.
export const EASE = [0.16, 1, 0.3, 1] as const; // out-expo

export const quick: Transition = { duration: 0.18, ease: EASE };
export const base: Transition = { duration: 0.34, ease: EASE };
export const layoutSpring: Transition = { type: 'spring', stiffness: 520, damping: 46, mass: 0.9 };

/** Page-level orchestration: children with `item` variants reveal in reading order. */
export const page: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** Text line that rises out of a clipped box (wrap in overflow-hidden). */
export const line: Variants = {
  hidden: { y: '105%' },
  show: { y: '0%', transition: { duration: 0.7, ease: EASE } },
};

