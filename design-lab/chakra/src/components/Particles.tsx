import { Box } from '@chakra-ui/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Season } from '@shared/seasons';
import { seeded } from '../motion';

const glyphs: Record<Exclude<Season['particles'], 'none'>, string[]> = {
  lanterns: ['🏮'],
  leaves: ['🍂', '🍁'],
  snow: ['❄', '❅', '•'],
};

const COUNT = 11;

/**
 * Ambient seasonal decoration for the hero. Pure CSS keyframes on transform/opacity (see `phFall` /
 * `phRise` in the theme), 11 glyphs, paused through `html[data-tab=hidden]` while the tab is hidden,
 * and cross-faded when the season changes.
 */
export function Particles({ kind }: { kind: Season['particles'] }) {
  const reduced = useReducedMotion();
  const active = kind !== 'none' && !reduced;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={kind}
          data-ambient=""
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 'inherit' }}
        >
          {Array.from({ length: COUNT }, (_, i) => {
            const rising = kind === 'lanterns';
            const set = glyphs[kind];
            const duration = (rising ? 15 : kind === 'snow' ? 10 : 12) + seeded(i, 2) * 8;
            const size = kind === 'snow' ? 10 + seeded(i, 4) * 12 : 14 + seeded(i, 4) * 12;
            return (
              <Box
                key={i}
                as="span"
                position="absolute"
                left={`${4 + seeded(i, 1) * 90}%`}
                top={rising ? 'auto' : '-32px'}
                bottom={rising ? '-36px' : 'auto'}
                fontSize={`${size}px`}
                lineHeight="1"
                color="white"
                willChange="transform, opacity"
                textShadow={kind === 'lanterns' ? '0 0 12px rgba(255, 196, 64, 0.95)' : undefined}
                animation={`${rising ? 'phRise' : 'phFall'} ${duration}s linear infinite`}
                css={{
                  animationDelay: `-${seeded(i, 6) * duration}s`,
                  '--ph-dx': `${(seeded(i, 8) - 0.5) * 90}px`,
                  '--ph-dy': rising ? '-720px' : '720px',
                  '--ph-rot': kind === 'leaves' ? `${200 + seeded(i, 3) * 320}deg` : '40deg',
                  '--ph-o': kind === 'snow' ? 0.5 + seeded(i, 5) * 0.4 : 0.35 + seeded(i, 5) * 0.4,
                }}
              >
                {set[i % set.length]}
              </Box>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
