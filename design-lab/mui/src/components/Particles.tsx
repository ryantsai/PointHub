// Ambient seasonal particles for the hero: lanterns rise, leaves drift, snow falls.
// Pure CSS keyframes on transform/opacity, a modest count, and paused whenever the tab is hidden,
// the hero is off screen or the user prefers reduced motion.
import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';
import type { Season } from '@shared/seasons';

const rand = (seed: number) => {
  const x = Math.sin(seed * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
};

const fall = keyframes({ from: { transform: 'translate3d(0, -12%, 0)' }, to: { transform: 'translate3d(var(--drift), 108%, 0)' } });
const rise = keyframes({ from: { transform: 'translate3d(0, 108%, 0)' }, to: { transform: 'translate3d(var(--drift), -16%, 0)' } });
const sway = keyframes({ from: { transform: 'translateX(-7px) rotate(-7deg)' }, to: { transform: 'translateX(7px) rotate(7deg)' } });
const tumble = keyframes({ from: { transform: 'rotate(0deg) scaleX(1)' }, '50%': { transform: 'rotate(180deg) scaleX(0.55)' }, to: { transform: 'rotate(360deg) scaleX(1)' } });

const config = {
  snow: { count: 14, travel: fall, inner: sway, min: 9, spread: 9 },
  leaves: { count: 8, travel: fall, inner: tumble, min: 11, spread: 8 },
  lanterns: { count: 6, travel: rise, inner: sway, min: 15, spread: 9 },
} as const;

export function Particles({ kind, color }: { kind: Season['particles']; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || kind === 'none') return undefined;
    let onScreen = true;
    const update = () => setRunning(onScreen && document.visibilityState === 'visible');
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    });
    observer.observe(node);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [kind]);

  if (kind === 'none') return null;
  const { count, travel, inner, min, spread } = config[kind];

  return (
    <Box
      ref={ref}
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        '& *': { animationPlayState: running ? 'running' : 'paused' },
        '@media (prefers-reduced-motion: reduce)': { display: 'none' },
      }}
    >
      {Array.from({ length: count }, (_, i) => {
        const duration = min + rand(i + 1) * spread;
        const size = kind === 'snow' ? 5 + rand(i + 9) * 7 : kind === 'leaves' ? 12 + rand(i + 9) * 8 : 13 + rand(i + 9) * 7;
        return (
          <Box
            key={i}
            style={{ left: `${4 + ((i * 97) % 92)}%`, ['--drift' as string]: `${Math.round((rand(i + 4) - 0.5) * 90)}px`, animationDuration: `${duration}s`, animationDelay: `${-rand(i + 2) * duration}s` }}
            sx={{ position: 'absolute', top: 0, height: '100%', width: 0, animation: `${travel} linear infinite`, willChange: 'transform' }}
          >
            <Box
              style={{ width: size, height: kind === 'lanterns' ? size * 1.25 : size, opacity: 0.35 + rand(i + 6) * 0.4, animationDuration: `${2.4 + rand(i + 3) * 2.6}s` }}
              sx={{
                color,
                backgroundColor: 'currentColor',
                animation: `${inner} ease-in-out infinite ${kind === 'leaves' ? 'normal' : 'alternate'}`,
                borderRadius: kind === 'snow' ? '50%' : kind === 'leaves' ? '2px 80% 2px 80%' : '42% 42% 36% 36%',
                boxShadow: kind === 'lanterns' ? '0 0 14px 2px currentColor' : 'none',
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
