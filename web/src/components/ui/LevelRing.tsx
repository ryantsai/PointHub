import { AbsoluteCenter, Box, ProgressCircle } from '@chakra-ui/react';
import { useEffect, useState, type ReactNode } from 'react';

interface LevelRingProps {
  /** 0–100. */
  percent: number;
  /** Outer diameter in px. */
  size?: number;
  thickness?: number;
  /** Centre content (the balance). */
  children: ReactNode;
  /** Sits on top of the ring at 12 o'clock (the goal). */
  top?: ReactNode;
  /** Hangs from the bottom of the ring (the level badge). */
  bottom?: ReactNode;
  label: string;
}

/**
 * The Arcade progress ring: accent-coloured arc in a dark well, made to sit on the hero gradient.
 * The arc starts empty and sweeps to `percent` on mount, like the number inside counts up.
 */
export function LevelRing({ percent, size = 208, thickness = 16, children, top, bottom, label }: LevelRingProps) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, percent))));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  return (
    <Box position="relative" borderRadius="full" bg="rgba(0, 0, 0, 0.4)" p="2" flexShrink={0}>
      <ProgressCircle.Root value={shown} colorPalette="accent" display="block" aria-label={label}>
        <ProgressCircle.Circle css={{ '--size': `${size}px`, '--thickness': `${thickness}px` }} display="block">
          <ProgressCircle.Track stroke="rgba(255, 255, 255, 0.16)" />
          <ProgressCircle.Range strokeLinecap="round" css={{ transitionDuration: '1.1s', transitionTimingFunction: 'cubic-bezier(0.25, 1.25, 0.45, 1)' }} />
        </ProgressCircle.Circle>
        <AbsoluteCenter flexDirection="column" textAlign="center">
          {children}
        </AbsoluteCenter>
      </ProgressCircle.Root>
      {top && (
        <Box position="absolute" top="-12px" left="50%" transform="translateX(-50%)">
          {top}
        </Box>
      )}
      {bottom && (
        <Box position="absolute" bottom="-10px" left="50%" transform="translateX(-50%)">
          {bottom}
        </Box>
      )}
    </Box>
  );
}
