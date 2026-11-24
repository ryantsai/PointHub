import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { Locale } from '@shared/data';
import type { Season } from '@shared/seasons';
import { t } from '@shared/strings';
import { softSpring, stagger } from '../../lib/motion';
import type { EmployeeStore } from '../../state/stores';
import { ActivityCard, LeaderboardCard, SectionHead } from './Activity';
import { CheckInCard } from './CheckInCard';
import { EventCard } from './EventCard';
import { GiftCard } from './GiftCard';
import { Hero } from './Hero';
import classes from './Employee.module.css';

type Props = { locale: Locale; season: Season; store: EmployeeStore };

// A section rises as one block, then deals its cards out one by one.
const group = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { ...softSpring, delayChildren: 0.08, staggerChildren: 0.06 } },
};

export function EmployeeView({ locale, season, store }: Props) {
  const events = useMemo(() => {
    const order = { open: 0, upcoming: 1, closed: 2 } as const;
    return store.events.filter((e) => e.status !== 'closed').sort((a, b) => order[a.status] - order[b.status] || a.startsAt.localeCompare(b.startsAt));
  }, [store.events]);

  return (
    <motion.main className={classes.page} variants={stagger(0.05, 0.09)} initial="hidden" animate="show" exit="exit">
      <Hero locale={locale} season={season} balance={store.balance} earned={store.earned} spent={store.spent} />
      <CheckInCard locale={locale} />

      <div className={classes.mainColumn}>
        <motion.section variants={group} aria-labelledby="mx-events">
          <SectionHead id="mx-events" title={t(locale, 'events')} count={events.length} locale={locale} />
          <div className={classes.eventGrid}>
            {events.map((event) => (
              <EventCard key={event.id} event={event} locale={locale} onCheckIn={store.checkIn} />
            ))}
          </div>
        </motion.section>

        <motion.section variants={group} aria-labelledby="mx-gifts">
          <SectionHead id="mx-gifts" title={t(locale, 'gifts')} count={store.gifts.length} locale={locale} />
          <div className={classes.giftGrid}>
            {store.gifts.map((gift) => (
              <GiftCard key={gift.id} gift={gift} locale={locale} balance={store.balance} onRedeem={store.redeem} />
            ))}
          </div>
        </motion.section>
      </div>

      <div className={classes.rail}>
        <ActivityCard locale={locale} items={store.activity} />
        <LeaderboardCard locale={locale} balance={store.balance} />
      </div>
    </motion.main>
  );
}
