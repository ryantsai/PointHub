import { useMemo } from 'react';
import { AreaChart } from '@mantine/charts';
import { motion, useReducedMotion } from 'motion/react';
import { kpis, type Locale } from '@shared/data';
import { formatNumber, t } from '@shared/strings';
import { formatCompact, formatDay } from '../../lib/format';
import { rise } from '../../lib/motion';
import classes from './Admin.module.css';

// The series end in the week of the lab's "today" (see the dates in shared/data.ts).
const LAST_WEEK = new Date('2026-11-23T00:00:00+08:00');

export function WeeklyChart({ locale }: { locale: Locale }) {
  const reduce = useReducedMotion();
  const data = useMemo(
    () =>
      kpis.issuedByWeek.map((issued, i) => {
        const day = new Date(LAST_WEEK);
        day.setDate(day.getDate() - (kpis.issuedByWeek.length - 1 - i) * 7);
        return { week: formatDay(locale, day), issued, redeemed: kpis.redeemedByWeek[i] };
      }),
    [locale],
  );
  const totalIssued = kpis.issuedByWeek.reduce((a, b) => a + b, 0);
  const totalRedeemed = kpis.redeemedByWeek.reduce((a, b) => a + b, 0);

  return (
    <motion.section className={`${classes.card} ${classes.chartCard}`} variants={rise} aria-labelledby="mx-chart">
      <header className={classes.cardHead}>
        <h2 id="mx-chart" className={classes.cardTitle}>
          {t(locale, 'issuedVsRedeemed')}
        </h2>
        <ul className={classes.legend}>
          <li>
            <span className={classes.swatch} data-series="issued" aria-hidden="true" />
            {t(locale, 'issued')}
            <b className="mx-num">{formatNumber(locale, totalIssued)}</b>
          </li>
          <li>
            <span className={classes.swatch} data-series="redeemed" aria-hidden="true" />
            {t(locale, 'redeemedSeries')}
            <b className="mx-num">{formatNumber(locale, totalRedeemed)}</b>
          </li>
        </ul>
      </header>
      <div className={classes.chartBox}>
        <AreaChart
          className={classes.chart}
          h="100%"
          data={data}
          dataKey="week"
          series={[
            { name: 'issued', label: t(locale, 'issued'), color: 'var(--mx-primary-strong)' },
            { name: 'redeemed', label: t(locale, 'redeemedSeries'), color: 'var(--mx-accent-strong)', strokeDasharray: '7 5' },
          ]}
          curveType="monotone"
          withGradient
          fillOpacity={0.32}
          strokeWidth={2.5}
          withDots={false}
          gridAxis="y"
          tickLine="none"
          strokeDasharray="3 6"
          gridColor="var(--mx-border)"
          textColor="var(--mx-dim)"
          valueFormatter={(value) => formatNumber(locale, value)}
          yAxisProps={{ tickFormatter: (value: number) => formatCompact(locale, value), width: 46 }}
          xAxisProps={{ interval: 'preserveStartEnd', minTickGap: 18, tickMargin: 10 }}
          areaProps={{ isAnimationActive: !reduce, animationDuration: 1400, animationBegin: 350, animationEasing: 'ease-out' }}
          tooltipAnimationDuration={160}
        />
      </div>
    </motion.section>
  );
}
