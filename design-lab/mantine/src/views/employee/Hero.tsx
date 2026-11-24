import { useEffect, useRef } from 'react';
import { Progress } from '@mantine/core';
import { IconArrowDownLeft, IconArrowUpRight, IconTrophy } from '@tabler/icons-react';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { type Locale, me, pick } from '@shared/data';
import type { Season } from '@shared/seasons';
import { formatNumber, t } from '@shared/strings';
import { CountUp } from '../../components/CountUp';
import { Particles } from '../../components/Particles';
import { rise, spring } from '../../lib/motion';
import classes from './Employee.module.css';

type Props = { locale: Locale; season: Season; balance: number; earned: number; spent: number };

export function Hero({ locale, season, balance, earned, spent }: Props) {
  const remaining = Math.max(0, me.nextRewardAt - balance);
  const progress = Math.min(100, (balance / me.nextRewardAt) * 100);

  // A small squeeze on the number whenever the balance changes (not on first paint).
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    animate(scope.current, { scale: [1, 0.94, 1.03, 1] }, { duration: 0.55, ease: 'easeOut' });
  }, [balance, animate, scope]);

  return (
    <motion.section className={classes.hero} variants={rise} aria-labelledby="mx-balance-label">
      <div className={classes.heroGlow} aria-hidden="true" />
      <div className={classes.heroPattern} aria-hidden="true" />
      <Particles kind={season.particles} placement="hero" />

      <div className={classes.medallion} aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={season.key}
            className={classes.medallionEmoji}
            initial={{ scale: 0, rotate: -120, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 120, opacity: 0 }}
            transition={spring}
          >
            {season.emoji}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className={classes.heroContent}>
        <p className={classes.greeting}>{t(locale, 'greeting', { name: pick(me.displayName, locale) })}</p>
        <div className={classes.heroChips}>
          <span className={classes.heroChip}>{pick(me.department, locale)}</span>
          <span className={classes.heroChip}>
            <IconTrophy size={14} stroke={2} aria-hidden="true" />
            {t(locale, 'rank', { rank: me.rank })}
          </span>
        </div>

        <p id="mx-balance-label" className={classes.balanceLabel}>
          {t(locale, 'balance')}
        </p>
        <div ref={scope} className={classes.balance}>
          <CountUp value={balance} locale={locale} className={`${classes.balanceNumber} mx-num`} duration={1.3} />
          <span className={classes.balanceUnit}>{t(locale, 'pts')}</span>
        </div>

        <div className={classes.next}>
          <div className={classes.nextRow}>
            <span>{t(locale, 'nextReward', { count: formatNumber(locale, remaining) })}</span>
            <span className="mx-num" aria-hidden="true">
              {t(locale, 'capacity', { count: formatNumber(locale, balance), max: formatNumber(locale, me.nextRewardAt) })}
            </span>
          </div>
          <Progress
            value={progress}
            size={10}
            radius="xl"
            transitionDuration={900}
            aria-label={t(locale, 'nextReward', { count: formatNumber(locale, remaining) })}
            classNames={{ root: classes.nextTrack, section: classes.nextFill }}
          />
        </div>

        <dl className={classes.stats}>
          <div className={classes.stat}>
            <span className={classes.statIcon} aria-hidden="true">
              <IconArrowUpRight size={16} stroke={2.2} />
            </span>
            <dt>{t(locale, 'lifetimeEarned')}</dt>
            <dd className="mx-num">
              <CountUp value={earned} locale={locale} />
            </dd>
          </div>
          <div className={classes.stat}>
            <span className={classes.statIcon} aria-hidden="true">
              <IconArrowDownLeft size={16} stroke={2.2} />
            </span>
            <dt>{t(locale, 'lifetimeSpent')}</dt>
            <dd className="mx-num">
              <CountUp value={spent} locale={locale} />
            </dd>
          </div>
        </dl>
      </div>
    </motion.section>
  );
}
