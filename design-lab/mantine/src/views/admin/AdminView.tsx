import type { ReactNode } from 'react';
import { Button, NavLink } from '@mantine/core';
import { IconChecklist, IconGift, IconKey, IconLayoutDashboard, IconPlusMinus, IconReceipt2, IconUsers } from '@tabler/icons-react';
import { motion } from 'motion/react';
import type { Gift, Locale } from '@shared/data';
import type { Season } from '@shared/seasons';
import { type StringKey, t } from '@shared/strings';
import { rise, stagger } from '../../lib/motion';
import type { AdminStore } from '../../state/stores';
import { Approvals } from './Approvals';
import { GiftStock } from './GiftStock';
import { KpiRow } from './Kpis';
import { Ledger } from './Ledger';
import { WeeklyChart } from './WeeklyChart';
import classes from './Admin.module.css';

const nav: { key: StringKey; icon: ReactNode }[] = [
  { key: 'dashboard', icon: <IconLayoutDashboard size={19} stroke={1.8} /> },
  { key: 'approvals', icon: <IconChecklist size={19} stroke={1.8} /> },
  { key: 'ledger', icon: <IconReceipt2 size={19} stroke={1.8} /> },
  { key: 'giftsAdmin', icon: <IconGift size={19} stroke={1.8} /> },
  { key: 'employees', icon: <IconUsers size={19} stroke={1.8} /> },
  { key: 'apiKeys', icon: <IconKey size={19} stroke={1.8} /> },
];

type Props = { locale: Locale; season: Season; store: AdminStore; gifts: Gift[] };

export function AdminView({ locale, season, store, gifts }: Props) {
  return (
    <motion.div className={classes.admin} variants={stagger(0.04, 0.08)} initial="hidden" animate="show" exit="exit">
      <motion.nav className={classes.nav} variants={rise} aria-label={t(locale, 'viewAdmin')}>
        <ul className={classes.navList}>
          {nav.map((item) => {
            const active = item.key === 'dashboard';
            return (
              <li key={item.key}>
                <NavLink
                  component="button"
                  type="button"
                  classNames={{ root: classes.navLink, label: classes.navLabel, section: classes.navSection }}
                  label={t(locale, item.key)}
                  leftSection={item.icon}
                  active={active}
                  aria-current={active ? 'page' : undefined}
                  rightSection={
                    item.key === 'approvals' && store.pending.length > 0 ? (
                      <span className={`${classes.navCount} mx-num`}>{store.pending.length}</span>
                    ) : undefined
                  }
                />
              </li>
            );
          })}
        </ul>
        <div className={classes.navSeason} aria-hidden="true">
          <span className={classes.navSeasonEmoji}>{season.emoji}</span>
          <span>{t(locale, season.nameKey)}</span>
        </div>
      </motion.nav>

      <main className={classes.content}>
        <motion.header className={classes.pageHead} variants={rise}>
          <h1 className={classes.pageTitle}>{t(locale, 'dashboard')}</h1>
          <Button variant="default" leftSection={<IconPlusMinus size={17} stroke={1.9} />}>
            {t(locale, 'adjustPoints')}
          </Button>
        </motion.header>

        <KpiRow locale={locale} store={store} />

        <div className={classes.split}>
          <WeeklyChart locale={locale} />
          <Approvals locale={locale} store={store} />
        </div>

        <Ledger locale={locale} store={store} />
        <GiftStock locale={locale} gifts={gifts} />
      </main>
    </motion.div>
  );
}
