import { Box, Center } from '@chakra-ui/react';
import { Check, Hourglass, X } from 'lucide-react';
import { motion } from 'motion/react';
import { springs } from '../lib/motion';
import { Burst } from './ui/Burst';

type Tone = 'success' | 'pending' | 'error';

const TONES = {
  success: { palette: 'green', Icon: Check },
  pending: { palette: 'accent', Icon: Hourglass },
  error: { palette: 'red', Icon: X },
} as const;

/**
 * Big status badge with a pop-in: expanding rings while pending, confetti on success, a shake on error.
 * Used for check-in results, kiosk taps and redemptions. Re-mount it (change `key`) to replay the animation.
 */
export function StatusBurst({ tone, size = 96 }: { tone: Tone; size?: number }) {
  const { palette, Icon } = TONES[tone];
  return (
    <Box position="relative" w={`${size}px`} h={`${size}px`} mx="auto" colorPalette={palette}>
      {tone !== 'error' &&
        [0, 1].map((ring) => (
          <Box key={ring} asChild position="absolute" inset="0" borderRadius="full" borderWidth="3px" borderColor="colorPalette.solid">
            <motion.span
              aria-hidden="true"
              initial={{ scale: 0.8, opacity: 0.7 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 1.4, delay: ring * 0.35, ease: 'easeOut', repeat: tone === 'pending' ? Infinity : 0 }}
            />
          </Box>
        ))}
      <motion.div
        style={{ position: 'relative', width: '100%', height: '100%' }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={tone === 'error' ? { scale: 1, opacity: 1, x: [0, -8, 8, -5, 5, 0] } : { scale: 1, opacity: 1 }}
        transition={springs.bouncy}
      >
        <Center
          boxSize="full"
          borderRadius="full"
          bg="colorPalette.solid"
          color="colorPalette.contrast"
          boxShadow="0 5px 0 0 {colors.colorPalette.depth}"
        >
          {tone === 'pending' ? (
            <motion.span
              style={{ display: 'inline-flex' }}
              animate={{ rotate: [0, 0, 180, 180] }}
              transition={{ duration: 2.4, times: [0, 0.6, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
            >
              <Icon size={size * 0.5} strokeWidth={2.6} aria-hidden />
            </motion.span>
          ) : (
            <Icon size={size * 0.55} strokeWidth={3} aria-hidden />
          )}
        </Center>
      </motion.div>
      {tone === 'success' && <Burst trigger={1} count={22} radius={size * 1.3} />}
    </Box>
  );
}
