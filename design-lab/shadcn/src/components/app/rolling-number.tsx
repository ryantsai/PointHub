import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { EASE } from '@/lib/motion';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

type Props = {
  /** Already formatted text, e.g. "1,280" or "74%". Digits roll, everything else is static. */
  text: string;
  className?: string;
  /** Seconds before the first roll starts (for orchestrated entrances). */
  delay?: number;
  duration?: number;
};

/**
 * Odometer-style number: every digit sits in its own column and rolls to its new value, so a
 * balance change reads as a count rather than a swap. Columns are keyed from the right, which keeps
 * the units column stable when the number gains or loses a digit. Transform-only.
 */
export function RollingNumber({ text, className, delay = 0, duration = 0.9 }: Props) {
  const chars = Array.from(text);
  // The entrance delay only applies to the first roll; later changes respond immediately.
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  const lead = first.current ? delay : 0;
  const gap = first.current ? 0.045 : 0.025;
  return (
    <span className={cn('inline-flex whitespace-nowrap tabular-nums', className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        <AnimatePresence initial={false} mode="popLayout">
          {chars.map((char, index) => {
            const fromRight = chars.length - 1 - index;
            const isDigit = char >= '0' && char <= '9';
            return isDigit ? (
              <Digit key={`d${fromRight}`} digit={Number(char)} delay={lead + index * gap} duration={duration} />
            ) : (
              <motion.span
                key={`s${fromRight}`}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-block"
              >
                {char}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </span>
    </span>
  );
}

function Digit({ digit, delay, duration }: { digit: number; delay: number; duration: number }) {
  return (
    <motion.span
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative inline-block [clip-path:inset(0)]"
    >
      {/* Invisible digit keeps the column's width and baseline. */}
      <span className="invisible">0</span>
      <motion.span
        className="absolute top-0 left-0 block h-[1000%] w-full"
        initial={{ y: '0%' }}
        animate={{ y: `${-digit * 10}%` }}
        transition={{ duration, ease: EASE, delay }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[10%] text-center">
            {d}
          </span>
        ))}
      </motion.span>
    </motion.span>
  );
}
