import { VisuallyHidden } from '@chakra-ui/react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { useFormat } from '../i18n/hooks';

interface AnimatedNumberProps {
  value: number;
  /** Where the first tween starts. 0 (default) gives the count-up on load; pass `value` to start settled. */
  from?: number;
  /** Custom formatter; defaults to the locale-aware integer format. */
  format?: (value: number) => string;
}

/**
 * Tweens to `value` on mount and on every change. The digits are written straight to the DOM from a motion
 * value, so a counting number never re-renders React. Screen readers get the final value only.
 * Jumps straight there under reduced motion.
 */
export function AnimatedNumber({ value, from = 0, format }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(from);
  const reduced = useReducedMotion();
  const { number } = useFormat();
  const fmt = useCallback((v: number) => (format ? format(v) : number(Math.round(v))), [format, number]);

  useEffect(() => {
    if (reduced) {
      motionValue.set(value);
      return;
    }
    // Slightly over-damped: a counter that overshoots its target reads as a mistake.
    const controls = animate(motionValue, value, { type: 'spring', stiffness: 70, damping: 18, restDelta: 0.5 });
    return () => controls.stop();
  }, [value, reduced, motionValue]);

  useMotionValueEvent(motionValue, 'change', (v) => {
    if (ref.current) ref.current.textContent = fmt(v);
  });

  // Language switched mid-flight: re-format what is currently shown.
  useEffect(() => {
    if (ref.current) ref.current.textContent = fmt(motionValue.get());
  }, [fmt, motionValue]);

  return (
    <>
      <VisuallyHidden>{fmt(value)}</VisuallyHidden>
      <span ref={ref} aria-hidden style={{ fontVariantNumeric: 'tabular-nums' }} />
    </>
  );
}
