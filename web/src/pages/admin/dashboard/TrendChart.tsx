import { Chart, useChart } from '@chakra-ui/charts';
import { Box, Text } from '@chakra-ui/react';
import { ChartColumnBig } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import type { AdminStatsWeek } from '../../../api/types';
import { EmptyState } from '../../../components/states';
import { SectionTitle } from '../../../components/ui/bits';
import { Panel } from '../../../components/ui/Panel';
import { useFormat, useLocale } from '../../../i18n/hooks';

/** `YYYY-MM-DD` is a calendar day in the site time zone: build it as a local date, not as UTC midnight. */
function parseDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1);
}

/**
 * Issued vs redeemed points, one pair of bars per week (each labelled with its Monday). Chakra's chart hook
 * turns theme tokens into CSS variables, so the bars, grid and labels follow the active theme and colour
 * scheme, and tween with them, without re-rendering Recharts.
 */
export function TrendChart({ weeks }: { weeks: AdminStatsWeek[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const format = useFormat();
  const reduced = useReducedMotion();

  const data = useMemo(() => {
    const day = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' });
    return weeks.map((week) => ({ week: day.format(parseDay(week.weekStart)), issued: week.issued, redeemed: week.redeemed }));
  }, [weeks, locale]);

  const chart = useChart({
    data,
    series: [
      { name: 'issued', color: 'brand.solid', label: t('admin.dashboard.issued') },
      { name: 'redeemed', color: 'accent.solid', label: t('admin.dashboard.redeemed') },
    ],
  });

  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });

  return (
    <Panel h="full">
      <SectionTitle compact icon={ChartColumnBig} title={t('admin.dashboard.chartTitle')}>
        <Text fontSize="sm" fontWeight="semibold" color="fg.muted">
          {t('admin.dashboard.chartSubtitle')}
        </Text>
      </SectionTitle>
      {weeks.length === 0 ? (
        <EmptyState message={t('admin.dashboard.noHistory')} />
      ) : (
        // The plot fills whatever height the row gives the card (it shares a row with the approvals queue).
        <Box flex="1" minW="0" minH={{ base: '260px', md: '320px' }} position="relative">
          <Chart.Root chart={chart} position="absolute" inset="0" aspectRatio="auto" fontWeight="bold">
            <BarChart responsive data={chart.data} barGap={3} barCategoryGap="22%" margin={{ top: 8, right: 4, bottom: 0, left: -8 }} accessibilityLayer>
              <CartesianGrid stroke={chart.color('border')} vertical={false} strokeDasharray="4 6" />
              <XAxis dataKey={chart.key('week')} axisLine={false} tickLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={12} stroke={chart.color('fg.muted')} />
              <YAxis axisLine={false} tickLine={false} tickMargin={4} width={52} tickFormatter={(value: number) => compact.format(value)} stroke={chart.color('fg.muted')} />
              <Tooltip cursor={{ fill: chart.color('bg.muted'), radius: 8 }} animationDuration={120} content={<Chart.Tooltip formatter={(value) => format.number(Number(value))} />} />
              <Legend content={<Chart.Legend />} verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 8 }} />
              {chart.series.map((item, index) => (
                <Bar
                  key={item.name}
                  dataKey={chart.key(item.name)}
                  fill={chart.color(item.color)}
                  fillOpacity={chart.getSeriesOpacity(item.name?.toString())}
                  radius={[7, 7, 2, 2]}
                  maxBarSize={22}
                  isAnimationActive={!reduced}
                  animationBegin={250 + index * 180}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              ))}
            </BarChart>
          </Chart.Root>
        </Box>
      )}
    </Panel>
  );
}
