import { animate, useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';
import type { Locale } from '@shared/data';
import { formatNumber } from '@shared/strings';

type Props = {
  value: number;
  locale: Locale;
  /** Defaults to the shared number formatter on the rounded value. */
  format?: (value: number) => string;
  className?: string;
};

/**
 * Tweens between values by writing straight into the text node (no React render per frame).
 * Counts up from zero on mount, then from the previous value whenever `value` changes.
 */
export function AnimatedNumber({ value, locale, format, className }: Props) {
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const reduce = useReducedMotion();
  const formatRef = useRef(format);
  formatRef.current = format;

  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const write = (v: number) => {
      shown.current = v;
      element.textContent = formatRef.current ? formatRef.current(v) : formatNumber(locale, Math.round(v));
    };
    if (reduce || shown.current === value) {
      write(value);
      return;
    }
    write(shown.current);
    const distance = Math.abs(value - shown.current);
    const controls = animate(shown.current, value, {
      duration: Math.min(1.6, 0.7 + distance / 4000),
      ease: [0.16, 1, 0.3, 1],
      onUpdate: write,
    });
    return () => controls.stop();
  }, [value, locale, reduce]);

  return <span ref={node} className={`num ${className ?? ''}`} />;
}
