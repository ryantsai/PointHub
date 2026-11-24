// The generic check-in moment: a viewfinder "scans", then morphs into a scalloped success badge
// with a burst of shapes. Purely presentational here (no camera, no backend).
import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import Zoom from '@mui/material/Zoom';
import QrCode2Rounded from '@mui/icons-material/QrCode2Rounded';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Locale } from '@shared/data';
import { t } from '@shared/strings';
import { ease, spring } from '../motion';
import { useBurst } from './Burst';
import { lobedPath } from './Shapes';

type Phase = 'scanning' | 'success';

export function CheckInDialog({ open, onClose, locale }: { open: boolean; onClose: () => void; locale: Locale }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('scanning');
  const badge = useRef<HTMLDivElement>(null);
  const [burstLayer, fireBurst] = useBurst();

  useEffect(() => {
    if (!open) return undefined;
    setPhase('scanning');
    const toSuccess = window.setTimeout(() => setPhase('success'), reduce ? 500 : 1300);
    const toClose = window.setTimeout(onClose, reduce ? 2200 : 3300);
    return () => {
      window.clearTimeout(toSuccess);
      window.clearTimeout(toClose);
    };
  }, [open, onClose, reduce]);

  useEffect(() => {
    if (!open || phase !== 'success') return undefined;
    const timer = window.setTimeout(() => fireBurst(badge.current), 120);
    return () => window.clearTimeout(timer);
  }, [fireBurst, open, phase]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="checkin-title"
      aria-describedby="checkin-hint"
      slots={{ transition: Zoom }}
      slotProps={{ paper: { sx: { width: 'min(360px, calc(100vw - 32px))', m: 2, overflow: 'hidden' } } }}
    >
      <Box onClick={phase === 'success' ? onClose : undefined} sx={{ p: 4, pt: 5, display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 3 }}>
        <Box sx={{ width: 184, height: 184, display: 'grid', placeItems: 'center' }}>
          <AnimatePresence mode="wait" initial={false}>
            {phase === 'scanning' ? (
              <motion.div
                key="scan"
                style={{ position: 'relative', width: 168, height: 168, display: 'grid', placeItems: 'center' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6, borderRadius: 84, transition: { duration: 0.2, ease: ease.accelerate } }}
              >
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '40px', bgcolor: 'tonal.primaryContainer' }} />
                <QrCode2Rounded sx={{ position: 'relative', fontSize: 104, color: 'tonal.onPrimaryContainer' }} />
                <Box
                  component={motion.span}
                  animate={reduce ? { opacity: [0.4, 1, 0.4] } : { y: [-58, 58, -58] }}
                  transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity }}
                  sx={{ position: 'absolute', left: 16, right: 16, height: 6, borderRadius: '999px', bgcolor: 'primary.main', boxShadow: 3 }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="done"
                ref={badge}
                style={{ position: 'relative', width: 168, height: 168, display: 'grid', placeItems: 'center' }}
                initial={{ scale: 0.3, rotate: -70, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={spring.bouncy}
              >
                <Box component="svg" viewBox="0 0 100 100" aria-hidden sx={{ position: 'absolute', inset: 0, color: 'primary.main' }}>
                  <path d={lobedPath(10, 0.055)} fill="currentColor" />
                </Box>
                <Box component="svg" viewBox="0 0 48 48" aria-hidden sx={{ position: 'relative', width: 84, height: 84, color: 'primary.contrastText' }}>
                  <motion.path
                    d="M12 25.5 L20.5 34 L36.5 15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, delay: 0.18, ease: ease.emphasized }}
                  />
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
        <Box sx={{ display: 'grid', gap: 1, minHeight: 84, alignContent: 'start' }}>
          <Typography id="checkin-title" variant="h3" component="h2" aria-live="polite">
            {phase === 'success' ? t(locale, 'checkedIn') : t(locale, 'checkIn')}
          </Typography>
          <Typography id="checkin-hint" variant="body2" color="text.secondary" sx={{ maxWidth: 260, opacity: phase === 'success' ? 0 : 1, transition: 'opacity 200ms' }}>
            {t(locale, 'scanToCheckIn')}
          </Typography>
        </Box>
      </Box>
      {burstLayer}
    </Dialog>
  );
}
