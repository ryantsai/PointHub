import { useEffect, useRef, useState } from 'react';
import { Button } from '@mantine/core';
import { IconQrcode } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Locale } from '@shared/data';
import { t } from '@shared/strings';
import { Burst } from '../../components/Burst';
import { rise } from '../../lib/motion';
import classes from './Employee.module.css';

/** The headline call to action. There is no scanner in the lab, so it plays the success moment: a stamp lands, confetti flies. */
export function CheckInCard({ locale }: { locale: Locale }) {
  const [stamp, setStamp] = useState(0); // 0 = idle, otherwise a key for the current celebration
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const play = () => {
    setStamp((n) => n + 1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStamp(0), 2600);
  };

  return (
    <motion.section className={classes.checkin} variants={rise} aria-label={t(locale, 'checkIn')}>
      <div className={classes.scanner} aria-hidden="true">
        <span className={classes.scanRing} />
        <span className={classes.scanRing} data-late />
        <span className={classes.scanFrame}>
          <IconQrcode size={44} stroke={1.5} />
          <span className={classes.scanLine} />
        </span>
      </div>
      <p className={classes.checkinHint}>{t(locale, 'scanToCheckIn')}</p>
      <Button className={classes.checkinButton} size="lg" fullWidth leftSection={<IconQrcode size={22} stroke={1.9} />} onClick={play}>
        {t(locale, 'checkIn')}
      </Button>

      <AnimatePresence>
        {stamp > 0 && (
          <motion.div
            key={stamp}
            className={classes.checkinDone}
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.span
              className={classes.stamp}
              initial={{ scale: 2.4, rotate: -28, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22, delay: 0.05 }}
            >
              <svg viewBox="0 0 48 48" width="52" height="52" fill="none" aria-hidden="true">
                <motion.path
                  d="M13 25.500 21 33l15-17"
                  stroke="currentColor"
                  strokeWidth="4.500"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.38, delay: 0.26, ease: 'easeOut' }}
                />
              </svg>
              <Burst count={22} spread={130} />
            </motion.span>
            <motion.span
              className={classes.checkinDoneText}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              {t(locale, 'checkedIn')}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
