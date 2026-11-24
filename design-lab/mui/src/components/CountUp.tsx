import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ease } from '../motion';

type Props = { value: number; format: (value: number) => string; duration?: number; from?: number };

/** A number that tweens from `from` on mount and from its previous value on every change. */
export function CountUp({ value, format, duration = 1.1, from = 0 }: Props) {
  const reduce = useReducedMotion();
  const current = useMotionValue(reduce ? value : from);
  const text = useTransform(current, (v) => format(Math.round(v)));

  useEffect(() => {
    if (reduce) {
      current.set(value);
      return undefined;
    }
    const controls = animate(current, value, { duration, ease: ease.emphasized });
    return () => controls.stop();
  }, [current, duration, reduce, value]);

  return (
    <>
      <motion.span aria-hidden>{text}</motion.span>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>{format(value)}</span>
    </>
  );
}
