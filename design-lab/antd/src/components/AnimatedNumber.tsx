// Number tween that writes straight to the DOM (no React render per frame).
import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { useLab } from '../lab';
import { EASE } from '../motion';

type Props = { value: number; duration?: number; suffix?: string; className?: string };

export function AnimatedNumber({ value, duration = 0.9, suffix = '', className }: Props) {
  const { num, locale } = useLab();
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const paint = (v: number) => {
      shown.current = v;
      el.textContent = num(Math.round(v)) + suffix;
    };
    if (reduce || shown.current === value) {
      paint(value);
      return;
    }
    const controls = animate(shown.current, value, { duration, ease: EASE, onUpdate: paint });
    return () => controls.stop();
    // `locale` re-paints in the new number format; `num` is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, locale, reduce, duration, suffix]);

  return (
    <span className={className}>
      <span ref={node} aria-hidden="true" className="ph-num">
        {num(0) + suffix}
      </span>
      <span className="ph-sr">{num(value) + suffix}</span>
    </span>
  );
}
