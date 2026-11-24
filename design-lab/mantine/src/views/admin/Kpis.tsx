import type { ReactNode } from 'react';
import { Avatar, RingProgress } from '@mantine/core';
import { Sparkline } from '@mantine/charts';
import { IconArrowDownRight, IconArrowUpRight, IconChecklist, IconCoins, IconGift, IconSparkles, IconUsersGroup } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { kpis, type Locale, pick } from '@shared/data';
import { formatNumber, formatPercent, t } from '@shared/strings';
import { CountUp } from '../../components/CountUp';
import { initials } from '../../lib/format';
import { rise, spring } from '../../lib/motion';
import type { AdminStore } from '../../state/stores';
import classes from './Admin.module.css';

function Delta({ locale, value }: { locale: Locale; value: number }) {
  const up = value >= 0;
  return (
    <span className={classes.delta} data-dir={up ? 'up' : 'down'}>
      {up ? <IconArrowUpRight size={14} stroke={2.4} aria-hidden="true" /> : <IconArrowDownRight size={14} stroke={2.4} aria-hidden="true" />}
      <span className="mx-num">{formatPercent(locale, value)}</span>
      <span className={classes.deltaNote}>{t(locale, 'vsLastMonth')}</span>
    </span>
  );
}

type KpiProps = { icon: ReactNode; label: string; children: ReactNode; visual?: ReactNode; foot: ReactNode; featured?: boolean };

function Kpi({ icon, label, children, visual, foot, featured }: KpiProps) {
  return (
    <motion.article className={classes.kpi} variants={rise} data-featured={featured || undefined} whileHover={{ y: -3 }} transition={spring}>
      <div className={classes.kpiTop}>
        <span className={classes.kpiIcon} aria-hidden="true">
          {icon}
        </span>
        <h3 className={classes.kpiLabel}>{label}</h3>
      </div>
      <div className={classes.kpiMain}>
        <p className={`${classes.kpiValue} mx-num`}>{children}</p>
        {visual}
      </div>
      <div className={classes.kpiFoot}>{foot}</div>
    </motion.article>
  );
}

export function KpiRow({ locale, store }: { locale: Locale; store: AdminStore }) {
  const share = kpis.activeParticipants / kpis.totalEmployees;
  // Running net of issued − redeemed: the shape of the outstanding liability over the 12 weeks.
  let running = 0;
  const net = kpis.issuedByWeek.map((v, i) => (running += v - kpis.redeemedByWeek[i]));
  const spark = { isAnimationActive: true, animationDuration: 1100, animationBegin: 250 } as const;

  return (
    <div className={classes.kpis}>
      <Kpi
        icon={<IconSparkles size={18} stroke={1.9} />}
        label={t(locale, 'issuedThisMonth')}
        foot={<Delta locale={locale} value={kpis.pointsIssuedDelta} />}
        visual={
          <Sparkline
            className={classes.kpiSpark}
            data={kpis.issuedByWeek}
            h={36}
            color="var(--mx-primary-strong)"
            curveType="monotone"
            fillOpacity={0.35}
            strokeWidth={2}
            areaProps={spark}
            aria-hidden="true"
          />
        }
      >
        <CountUp value={store.issued} locale={locale} duration={1.2} />
      </Kpi>

      <Kpi
        icon={<IconGift size={18} stroke={1.9} />}
        label={t(locale, 'redeemedThisMonth')}
        foot={<Delta locale={locale} value={kpis.pointsRedeemedDelta} />}
        visual={
          <Sparkline
            className={classes.kpiSpark}
            data={kpis.redeemedByWeek}
            h={36}
            color="var(--mx-accent-strong)"
            curveType="monotone"
            fillOpacity={0.35}
            strokeWidth={2}
            areaProps={spark}
            aria-hidden="true"
          />
        }
      >
        <CountUp value={store.redeemed} locale={locale} duration={1.2} />
      </Kpi>

      <Kpi
        icon={<IconUsersGroup size={18} stroke={1.9} />}
        label={t(locale, 'participation')}
        foot={
          <span className={`${classes.kpiNote} mx-num`}>
            {t(locale, 'capacity', { count: formatNumber(locale, kpis.activeParticipants), max: formatNumber(locale, kpis.totalEmployees) })}
          </span>
        }
        visual={
          <RingProgress
            className={classes.kpiRing}
            size={52}
            thickness={7}
            roundCaps
            rootColor="var(--mx-surface-2)"
            sections={[{ value: share * 100, color: 'var(--mx-primary-strong)' }]}
            aria-hidden="true"
          />
        }
      >
        <CountUp value={share} locale={locale} kind="share" duration={1.2} />
      </Kpi>

      <Kpi
        icon={<IconCoins size={18} stroke={1.9} />}
        label={t(locale, 'outstanding')}
        foot={<span className={classes.kpiNote}>{t(locale, 'points')}</span>}
        visual={
          <Sparkline
            className={classes.kpiSpark}
            data={net}
            h={36}
            color="var(--mx-dim)"
            curveType="monotone"
            fillOpacity={0.25}
            strokeWidth={2}
            areaProps={spark}
            aria-hidden="true"
          />
        }
      >
        <CountUp value={store.outstanding} locale={locale} duration={1.2} />
      </Kpi>

      <Kpi
        featured={store.pending.length > 0}
        icon={<IconChecklist size={18} stroke={1.9} />}
        label={t(locale, 'pendingApprovals')}
        foot={
          <Avatar.Group spacing={10} className={classes.kpiAvatars} aria-hidden="true">
            <AnimatePresence mode="popLayout" initial={false}>
              {store.pending.slice(0, 6).map((p) => (
                <motion.span key={p.id} layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }} transition={spring}>
                  <Avatar size={28} radius="xl" color="brand" variant="filled">
                    {initials(pick(p.employeeName, locale))}
                  </Avatar>
                </motion.span>
              ))}
            </AnimatePresence>
          </Avatar.Group>
        }
      >
        <CountUp value={store.pending.length} locale={locale} duration={0.5} />
      </Kpi>
    </div>
  );
}
