import { VisuallyHidden } from '@chakra-ui/react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import type { Locale } from '@shared/data';
import { formatNumber } from '@shared/strings';

type Props = {
  value: number;
  locale: Locale;
  /** Custom formatter (e.g. percent); defaults to the shared locale-aware integer format. */
  format?: (value: number) => string;
  /** Where the first tween starts; 0 gives the count-up on load. */
  from?: number;
};

/**
 * Tweens to `value` on mount and on every change. The digits are written straight to the DOM from a
 * motion value, so a counting number never re-renders React. Screen readers get the final value only.
 */
export function AnimatedNumber({ value, locale, format, from = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(from);
  const reduced = useReducedMotion();
  const fmt = useCallback((v: number) => (format ? format(v) : formatNumber(locale, Math.round(v))), [format, locale]);

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

  // Locale switched mid-flight: re-format what is currently shown.
  useEffect(() => {
    if (ref.current) ref.current.textContent = fmt(motionValue.get());
  }, [fmt, motionValue]);

  return (
    <>
      <VisuallyHidden>{fmt(value)}</VisuallyHidden>
      <span ref={ref} aria-hidden style={{ fontVariantNumeric: 'tabular-nums' }}>
        {fmt(motionValue.get())}
      </span>
    </>
  );
}
