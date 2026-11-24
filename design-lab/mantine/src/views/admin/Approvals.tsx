import { ActionIcon, Avatar, Badge, Button, Tooltip } from '@mantine/core';
import { IconCheck, IconChecks, IconId, IconQrcode, IconX } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { type Locale, pick } from '@shared/data';
import { formatNumber, t } from '@shared/strings';
import { Burst } from '../../components/Burst';
import { formatTime, initials } from '../../lib/format';
import { rise, softSpring, spring } from '../../lib/motion';
import type { AdminStore } from '../../state/stores';
import classes from './Admin.module.css';

export function Approvals({ locale, store }: { locale: Locale; store: AdminStore }) {
  const { pending } = store;
  return (
    <motion.section className={`${classes.card} ${classes.approvals}`} variants={rise} aria-labelledby="mx-approvals">
      <header className={classes.cardHead}>
        <h2 id="mx-approvals" className={classes.cardTitle}>
          {t(locale, 'pendingApprovals')}
          <span className={`${classes.countPill} mx-num`} data-empty={pending.length === 0 || undefined}>
            {pending.length}
          </span>
        </h2>
        <Button
          size="compact-sm"
          variant="light"
          leftSection={<IconChecks size={16} stroke={2} />}
          disabled={pending.length === 0}
          onClick={() => store.approveAll(locale)}
        >
          {t(locale, 'approveAll')}
        </Button>
      </header>

      <div className={classes.queueWrap}>
        <ul className={classes.queue}>
          <AnimatePresence mode="popLayout" initial={false}>
            {pending.map((item) => {
              const name = pick(item.employeeName, locale);
              return (
                <motion.li
                  key={item.id}
                  layout
                  className={classes.queueRow}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 72, scale: 0.94, transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } }}
                  transition={softSpring}
                >
                  <Avatar size={40} radius="xl" color="brand" variant="light" aria-hidden="true">
                    {initials(name)}
                  </Avatar>
                  <div className={classes.queueText}>
                    <p className={classes.queueName}>
                      {name}
                      <span className={`${classes.queueNo} mx-num`}>
                        {item.employeeNo} · {formatTime(locale, item.checkedInAt)}
                      </span>
                    </p>
                    <p className={classes.queueSub}>
                      {pick(item.department, locale)} · {pick(item.eventTitle, locale)}
                    </p>
                    <div className={classes.queueTags}>
                      <Badge size="sm" variant="light" className={classes.rosterBadge} data-roster={item.onRoster ? 'on' : 'walkin'}>
                        {t(locale, item.onRoster ? 'onRoster' : 'walkIn')}
                      </Badge>
                      <span className={classes.queueMethod}>
                        {item.method === 'card' ? (
                          <IconId size={14} stroke={1.8} aria-hidden="true" />
                        ) : (
                          <IconQrcode size={14} stroke={1.8} aria-hidden="true" />
                        )}
                        {t(locale, item.method === 'card' ? 'byCard' : 'byLink')}
                      </span>
                    </div>
                  </div>
                  <div className={classes.queueSide}>
                    <span className={`${classes.queuePoints} mx-num`}>
                      +{formatNumber(locale, item.points)}
                      <small>{t(locale, 'pts')}</small>
                    </span>
                    <div className={classes.queueActions}>
                      <Tooltip label={t(locale, 'reject')}>
                        <ActionIcon variant="default" size={32} aria-label={`${t(locale, 'reject')}: ${name}`} onClick={() => store.reject(item.id)}>
                          <IconX size={16} stroke={2.2} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={t(locale, 'approve')}>
                        <ActionIcon variant="filled" size={32} aria-label={`${t(locale, 'approve')}: ${name}`} onClick={() => store.approve(item.id, locale)}>
                          <IconCheck size={17} stroke={2.6} />
                        </ActionIcon>
                      </Tooltip>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <AnimatePresence>
          {pending.length === 0 && (
            <motion.div
              className={classes.empty}
              role="status"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ ...spring, delay: 0.22 }}
            >
              <span className={classes.emptyIcon}>
                <svg viewBox="0 0 48 48" width="40" height="40" fill="none" aria-hidden="true">
                  <motion.path
                    d="M13 25.500 21 33l15-17"
                    stroke="currentColor"
                    strokeWidth="4.500"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.45, ease: 'easeOut' }}
                  />
                </svg>
                <Burst count={20} spread={120} />
              </span>
              <p className={classes.emptyText}>{t(locale, 'allCaughtUp')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
