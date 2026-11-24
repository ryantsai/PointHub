import { useState } from 'react';
import { Badge, Button, Progress } from '@mantine/core';
import { IconCircleCheckFilled, IconClock, IconHourglassHigh, IconMapPin, IconQrcode, IconUsers } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { type EventItem, type Locale, pick } from '@shared/data';
import { formatDateTime, formatNumber, t } from '@shared/strings';
import { Burst } from '../../components/Burst';
import { formatTime } from '../../lib/format';
import { rise, spring } from '../../lib/motion';
import classes from './Employee.module.css';

type Props = { event: EventItem; locale: Locale; onCheckIn: (id: number) => void };

export function EventCard({ event, locale, onCheckIn }: Props) {
  const open = event.status === 'open';
  const [burst, setBurst] = useState(0);
  const fill = event.capacity ? Math.min(100, (event.attendees / event.capacity) * 100) : null;

  const checkIn = () => {
    setBurst((n) => n + 1);
    onCheckIn(event.id);
  };

  return (
    <motion.article className={classes.event} variants={rise} layout="position" data-open={open || undefined}>
      <div className={classes.eventHead}>
        <span className={classes.eventArt} aria-hidden="true">
          {event.emoji}
        </span>
        <div className={classes.eventHeadText}>
          <Badge size="sm" variant={open ? 'filled' : 'default'} leftSection={open ? <span className={classes.liveDot} aria-hidden="true" /> : undefined}>
            {t(locale, open ? 'openNow' : 'upcoming')}
          </Badge>
          <h3 className={classes.eventTitle}>{pick(event.title, locale)}</h3>
        </div>
        <span className={`${classes.pointsChip} mx-num`}>
          +{formatNumber(locale, event.points)}
          <small>{t(locale, 'pts')}</small>
        </span>
      </div>

      <ul className={classes.meta}>
        <li>
          <IconClock size={16} stroke={1.8} aria-hidden="true" />
          <span>
            {formatDateTime(locale, event.startsAt)} – {formatTime(locale, event.endsAt)}
          </span>
        </li>
        <li>
          <IconMapPin size={16} stroke={1.8} aria-hidden="true" />
          <span>{pick(event.location, locale)}</span>
        </li>
      </ul>

      <div className={classes.eventFoot}>
        <div className={classes.capacity}>
          <span className={classes.capacityText}>
            <IconUsers size={16} stroke={1.8} aria-hidden="true" />
            <span className="mx-num">
              {event.capacity
                ? t(locale, 'capacity', { count: formatNumber(locale, event.attendees), max: formatNumber(locale, event.capacity) })
                : t(locale, 'attendees', { count: formatNumber(locale, event.attendees) })}
            </span>
          </span>
          {fill !== null && <Progress value={fill} size={5} radius="xl" transitionDuration={600} aria-hidden="true" />}
        </div>

        <div className={classes.eventAction}>
          <AnimatePresence mode="popLayout" initial={false}>
            {open && event.myCheckIn === 'none' && (
              <motion.div key="go" exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.16 }}>
                <Button size="sm" leftSection={<IconQrcode size={17} stroke={1.9} />} onClick={checkIn}>
                  {t(locale, 'checkIn')}
                </Button>
              </motion.div>
            )}
            {event.myCheckIn === 'pending' && (
              <motion.span
                key="pending"
                className={classes.statePill}
                data-state="pending"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={spring}
              >
                <IconHourglassHigh size={15} stroke={2} aria-hidden="true" />
                {t(locale, 'waitingApproval')}
              </motion.span>
            )}
            {event.myCheckIn === 'approved' && (
              <motion.span
                key="approved"
                className={classes.statePill}
                data-state="approved"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={spring}
              >
                <IconCircleCheckFilled size={16} aria-hidden="true" />
                {t(locale, 'checkedIn')}
              </motion.span>
            )}
          </AnimatePresence>
          {burst > 0 && <Burst key={burst} count={14} spread={80} />}
        </div>
      </div>
    </motion.article>
  );
}
