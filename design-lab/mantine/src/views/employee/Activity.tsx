import type { ReactNode } from 'react';
import { Anchor } from '@mantine/core';
import { IconAdjustmentsHorizontal, IconArrowBackUp, IconCalendarEvent, IconGift, IconPlugConnected } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { leaderboard, type Locale, me, pick, type Transaction, type TransactionType } from '@shared/data';
import { formatDateTime, formatNumber, t } from '@shared/strings';
import { signed } from '../../lib/format';
import { rise, softSpring } from '../../lib/motion';
import classes from './Employee.module.css';

export const typeIcon: Record<TransactionType, ReactNode> = {
  eventAward: <IconCalendarEvent size={18} stroke={1.8} />,
  redemption: <IconGift size={18} stroke={1.8} />,
  adjustment: <IconAdjustmentsHorizontal size={18} stroke={1.8} />,
  reversal: <IconArrowBackUp size={18} stroke={1.8} />,
  externalCredit: <IconPlugConnected size={18} stroke={1.8} />,
  externalDebit: <IconPlugConnected size={18} stroke={1.8} />,
};

export function SectionHead({ id, title, count, locale, seeAll = true }: { id: string; title: string; count?: number; locale: Locale; seeAll?: boolean }) {
  return (
    <div className={classes.sectionHead}>
      <h2 id={id} className={classes.sectionTitle}>
        {title}
        {count !== undefined && <span className={`${classes.sectionCount} mx-num`}>{count}</span>}
      </h2>
      {seeAll && (
        <Anchor component="button" type="button" size="sm" fw={700} className={classes.seeAll}>
          {t(locale, 'seeAll')}
        </Anchor>
      )}
    </div>
  );
}

export function ActivityCard({ locale, items }: { locale: Locale; items: Transaction[] }) {
  return (
    <motion.section className={classes.panel} variants={rise} aria-labelledby="mx-activity">
      <SectionHead id="mx-activity" title={t(locale, 'recentActivity')} locale={locale} />
      <ul className={classes.activity}>
        <AnimatePresence initial={false}>
          {items.slice(0, 7).map((tx) => (
            <motion.li
              key={tx.id}
              layout
              className={classes.activityRow}
              initial={{ opacity: 0, y: -18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={softSpring}
            >
              <span className={classes.activityIcon} data-sign={tx.amount >= 0 ? 'plus' : 'minus'} aria-hidden="true">
                {typeIcon[tx.type]}
              </span>
              <span className={classes.activityText}>
                <span className={classes.activityTitle}>{pick(tx.title, locale)}</span>
                <span className={classes.activityMeta}>
                  {t(locale, `type_${tx.type}`)} · {formatDateTime(locale, tx.createdAt)}
                  {tx.source ? ` · ${tx.source}` : ''}
                </span>
              </span>
              <span className={`${classes.amount} mx-num`} data-sign={tx.amount >= 0 ? 'plus' : 'minus'}>
                {signed(locale, tx.amount)}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
}

const medals = ['🥇', '🥈', '🥉'];

export function LeaderboardCard({ locale, balance }: { locale: Locale; balance: number }) {
  const top = leaderboard[0].points;
  return (
    <motion.section className={classes.panel} variants={rise} aria-labelledby="mx-leaderboard">
      <SectionHead id="mx-leaderboard" title={t(locale, 'leaderboard')} locale={locale} />
      <ol className={classes.board}>
        {leaderboard.map((row) => (
          <li key={row.rank} className={classes.boardRow}>
            <span className={classes.boardRank} aria-hidden={row.rank <= 3 || undefined}>
              {row.rank <= 3 ? medals[row.rank - 1] : row.rank}
            </span>
            <span className={classes.boardName}>{row.name}</span>
            <span className={classes.boardBar} aria-hidden="true">
              <motion.span
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: row.points / top }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.08 * row.rank, ease: [0.16, 1, 0.3, 1] }}
              />
            </span>
            <span className={`${classes.boardPoints} mx-num`}>{formatNumber(locale, row.points)}</span>
          </li>
        ))}
      </ol>
      <div className={classes.boardMe}>
        <span className={classes.boardMeName}>{pick(me.displayName, locale)}</span>
        <span>{t(locale, 'rank', { rank: me.rank })}</span>
        <span className={`${classes.boardPoints} mx-num`}>{formatNumber(locale, balance)}</span>
      </div>
    </motion.section>
  );
}
