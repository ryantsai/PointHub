import { useEffect, useLayoutEffect, useRef } from 'react';
import { VisuallyHidden } from '@mantine/core';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react';
import type { Locale } from '@shared/data';
import { formatNumber } from '@shared/strings';
import { formatShare } from '../lib/format';

type Props = {
  value: number;
  locale: Locale;
  /** `share` formats a 0..1 ratio as a percentage. */
  kind?: 'number' | 'share';
  className?: string;
  duration?: number;
};

/**
 * Tweens to `value` on mount and whenever it changes. The tween writes straight to the text node
 * (no React render per frame); screen readers get the final value once.
 */
export function CountUp({ value, locale, kind = 'number', className, duration = 0.9 }: Props) {
  const node = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const current = useMotionValue(0);
  const format = (v: number) => (kind === 'share' ? formatShare(locale, v) : formatNumber(locale, Math.round(v)));
  const formatRef = useRef(format);
  formatRef.current = format;

  useMotionValueEvent(current, 'change', (v) => {
    if (node.current) node.current.textContent = formatRef.current(v);
  });

  // Keep the text right when only the locale changes mid-flight or at rest.
  useLayoutEffect(() => {
    if (node.current) node.current.textContent = formatRef.current(current.get());
  }, [locale, kind, current]);

  useEffect(() => {
    if (reduce) {
      current.set(value);
      return;
    }
    const controls = animate(current, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, reduce, duration, current]);

  return (
    <>
      <span ref={node} className={className} aria-hidden="true" />
      <VisuallyHidden>{format(value)}</VisuallyHidden>
    </>
  );
}
