import { Chart, useChart } from '@chakra-ui/charts';
import { Box, Card } from '@chakra-ui/react';
import { ChartColumnBig } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { kpis, type Locale } from '@shared/data';
import { formatNumber, t } from '@shared/strings';
import { SectionTitle } from '../../components/bits';
import { rise } from '../../motion';

// The data is 12 weekly totals ending this week; label each bar pair with its week's Monday.
const LAST_WEEK_START = new Date('2026-11-23T00:00:00+08:00').getTime();
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function TrendChart({ locale }: { locale: Locale }) {
  const reduced = useReducedMotion();

  const data = useMemo(() => {
    const day = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' });
    const n = kpis.issuedByWeek.length;
    return kpis.issuedByWeek.map((issued, i) => ({
      week: day.format(new Date(LAST_WEEK_START - (n - 1 - i) * WEEK)),
      issued,
      redeemed: kpis.redeemedByWeek[i] ?? 0,
    }));
  }, [locale]);

  // Chakra's chart hook resolves theme tokens to CSS variables, so the bars follow the season
  // (and tween with it) without re-rendering Recharts.
  const chart = useChart({
    data,
    series: [
      { name: 'issued', color: 'brand.solid', label: t(locale, 'issued') },
      { name: 'redeemed', color: 'accent.solid', label: t(locale, 'redeemedSeries') },
    ],
  });

  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });

  return (
    <Card.Root asChild variant="outline" minW="0">
      <motion.section variants={rise} aria-label={t(locale, 'issuedVsRedeemed')}>
        <Card.Body p={{ base: '4', md: '5' }} gap="4">
          <SectionTitle compact icon={ChartColumnBig} title={t(locale, 'issuedVsRedeemed')} />
          {/* the plot fills whatever height the row gives the card (it shares a row with the approvals queue) */}
          <Box flex="1" minW="0" minH={{ base: '260px', md: '320px' }} position="relative">
            <Chart.Root chart={chart} position="absolute" inset="0" aspectRatio="auto" fontWeight="bold">
              <BarChart responsive data={chart.data} barGap={3} barCategoryGap="22%" margin={{ top: 8, right: 4, bottom: 0, left: -8 }} accessibilityLayer>
                <CartesianGrid stroke={chart.color('border')} vertical={false} strokeDasharray="4 6" />
                <XAxis dataKey={chart.key('week')} axisLine={false} tickLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={12} stroke={chart.color('fg.muted')} />
                <YAxis axisLine={false} tickLine={false} tickMargin={4} width={52} tickFormatter={(v: number) => compact.format(v)} stroke={chart.color('fg.muted')} />
                <Tooltip
                  cursor={{ fill: chart.color('bg.muted'), radius: 8 }}
                  animationDuration={120}
                  content={<Chart.Tooltip formatter={(value: number) => formatNumber(locale, value)} />}
                />
                <Legend content={<Chart.Legend />} verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 8 }} />
                {chart.series.map((item, i) => (
                  <Bar
                    key={item.name}
                    dataKey={chart.key(item.name)}
                    fill={chart.color(item.color)}
                    fillOpacity={chart.getSeriesOpacity(item.name?.toString())}
                    radius={[7, 7, 2, 2]}
                    maxBarSize={22}
                    isAnimationActive={!reduced}
                    animationBegin={250 + i * 180}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                ))}
              </BarChart>
            </Chart.Root>
          </Box>
        </Card.Body>
      </motion.section>
    </Card.Root>
  );
}
