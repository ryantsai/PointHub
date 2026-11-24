import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import OutlinedInput from '@mui/material/OutlinedInput';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import ApiRounded from '@mui/icons-material/ApiRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ContactlessRounded from '@mui/icons-material/ContactlessRounded';
import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import QrCode2Rounded from '@mui/icons-material/QrCode2Rounded';
import RedeemRounded from '@mui/icons-material/RedeemRounded';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import UndoRounded from '@mui/icons-material/UndoRounded';
import VolunteerActivismRounded from '@mui/icons-material/VolunteerActivismRounded';
import { BarChart } from '@mui/x-charts/BarChart';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { kpis, pick } from '@shared/data';
import type { Locale, PendingCheckIn, Transaction } from '@shared/data';
import { formatDateTime, formatNumber, formatPercent, t } from '@shared/strings';
import type { LabState } from '@shared/urlState';
import { CountUp } from '../components/CountUp';
import { ShapeBadge } from '../components/Shapes';
import { signed, typeIcon, typeKey, typeTone } from '../format';
import { ease, rise, spring, stagger } from '../motion';
import type { LabData } from '../state/useLabData';
import { easing, radius } from '../theme/theme';

const sectionSx = { scrollMarginTop: 88 } as const;
const intl = (locale: Locale) => (locale === 'zh-Hant' ? 'zh-TW' : locale);

// ---------------------------------------------------------------------------------------------
// KPI row

type Tone = 'primary' | 'tertiary' | 'container' | 'plain';

const toneSx = {
  primary: { bgcolor: 'primary.main', color: 'primary.contrastText' },
  tertiary: { bgcolor: 'tonal.tertiaryContainer', color: 'tonal.onTertiaryContainer' },
  container: { bgcolor: 'tonal.primaryContainer', color: 'tonal.onPrimaryContainer' },
  plain: { bgcolor: 'tonal.surfaceContainerHigh', color: 'text.primary' },
} as const;

function Kpi({ tone, icon, label, children, footer }: { tone: Tone; icon: ReactNode; label: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Card
      sx={{
        ...toneSx[tone],
        height: '100%',
        minHeight: 156,
        p: 2.5,
        display: 'grid',
        gap: 1.5,
        alignContent: 'space-between',
        transition: `border-radius 400ms ${easing.emphasized}, transform 300ms ${easing.emphasized}`,
        '&:hover': { borderRadius: `${radius.xxl}px`, transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box aria-hidden sx={{ display: 'grid', fontSize: 20, opacity: 0.9 }}>
          {icon}
        </Box>
        <Typography variant="label" component="h3">
          {label}
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gap: 1 }}>{children}</Box>
      {footer}
    </Card>
  );
}

function Delta({ locale, value, onColor }: { locale: Locale; value: number; onColor: boolean }) {
  const up = value >= 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Chip
        size="small"
        variant="tonal"
        color={up ? 'success' : 'error'}
        icon={up ? <TrendingUpRounded /> : <TrendingDownRounded />}
        label={formatPercent(locale, value)}
        sx={onColor ? { bgcolor: '#ffffff', color: up ? '#0b5c2c' : '#93000f' } : undefined}
      />
      <Typography variant="caption">{t(locale, 'vsLastMonth')}</Typography>
    </Box>
  );
}

function KpiRow({ locale, data }: { locale: Locale; data: LabData }) {
  const number = useCallback((v: number) => formatNumber(locale, v), [locale]);
  const percent = useCallback((v: number) => `${v}%`, []);
  const share = Math.round((kpis.activeParticipants / kpis.totalEmployees) * 100);
  const [ring, setRing] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setRing(share), 350);
    return () => window.clearTimeout(timer);
  }, [share]);

  const cells: { size: object; node: ReactNode }[] = [
    {
      size: { xs: 12, sm: 6, lg: 3 },
      node: (
        <Kpi tone="primary" icon={<VolunteerActivismRounded fontSize="inherit" />} label={t(locale, 'issuedThisMonth')} footer={<Delta locale={locale} value={kpis.pointsIssuedDelta} onColor />}>
          <Typography variant="h1" component="p" sx={{ fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
            <CountUp value={data.issued} format={number} />
          </Typography>
        </Kpi>
      ),
    },
    {
      size: { xs: 12, sm: 6, lg: 3 },
      node: (
        <Kpi tone="tertiary" icon={<RedeemRounded fontSize="inherit" />} label={t(locale, 'redeemedThisMonth')} footer={<Delta locale={locale} value={kpis.pointsRedeemedDelta} onColor={false} />}>
          <Typography variant="h1" component="p" sx={{ fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
            <CountUp value={data.redeemed} format={number} />
          </Typography>
        </Kpi>
      ),
    },
    {
      size: { xs: 6, sm: 4, lg: 2 },
      node: (
        <Kpi tone="plain" icon={<GroupsRounded fontSize="inherit" />} label={t(locale, 'participation')}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ position: 'relative', display: 'grid' }} aria-hidden>
              <CircularProgress variant="determinate" value={100} size={52} thickness={6} sx={{ color: 'tonal.outlineVariant', gridArea: '1 / 1' }} />
              <CircularProgress
                variant="determinate"
                value={ring}
                size={52}
                thickness={6}
                sx={{ gridArea: '1 / 1', '& .MuiCircularProgress-circle': { strokeLinecap: 'round', transition: `stroke-dashoffset 1100ms ${easing.emphasized}` } }}
              />
            </Box>
            <Box sx={{ position: 'relative' }}>
              <Typography variant="h4" component="p">
                <CountUp value={share} format={percent} />
              </Typography>
              <Typography variant="caption" component="p" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {t(locale, 'capacity', { count: formatNumber(locale, kpis.activeParticipants), max: formatNumber(locale, kpis.totalEmployees) })}
              </Typography>
            </Box>
          </Box>
        </Kpi>
      ),
    },
    {
      size: { xs: 6, sm: 4, lg: 2 },
      node: (
        <Kpi tone="plain" icon={<AccountBalanceWalletRounded fontSize="inherit" />} label={t(locale, 'outstanding')}>
          <Typography variant="h4" component="p" sx={{ position: 'relative' }}>
            <CountUp value={data.outstanding} format={number} />
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
            {t(locale, 'points')}
          </Typography>
        </Kpi>
      ),
    },
    {
      size: { xs: 12, sm: 4, lg: 2 },
      node: (
        <Kpi tone="container" icon={<FactCheckRounded fontSize="inherit" />} label={t(locale, 'pendingApprovals')}>
          <Typography variant="h1" component="p" sx={{ fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
            <CountUp value={data.pending.length} format={number} duration={0.5} />
          </Typography>
        </Kpi>
      ),
    },
  ];

  return (
    <Grid container spacing={2}>
      {cells.map((cell, index) => (
        <Grid key={index} size={cell.size}>
          <motion.div variants={rise} style={{ height: '100%' }}>
            {cell.node}
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );
}

// ---------------------------------------------------------------------------------------------
// Chart

function LegendItem({ color, label, total, locale, round }: { color: string; label: string; total: number; locale: Locale; round?: boolean }) {
  const number = useCallback((v: number) => formatNumber(locale, v), [locale]);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'tonal.surfaceContainerHigh', borderRadius: '999px', pl: 1.25, pr: 1.75, py: 0.75 }}>
      <Box aria-hidden sx={{ width: round ? 12 : 20, height: 12, borderRadius: '999px', bgcolor: color }} />
      <Typography variant="label" component="span" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="subtitle2" component="span" sx={{ fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
        <CountUp value={total} format={number} />
      </Typography>
    </Box>
  );
}

function IssuedVsRedeemed({ locale }: { locale: Locale }) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const issuedColor = theme.vars.palette.primary.main;
  const redeemedColor = theme.vars.palette.tonal.chartAlt;
  const weeks = useMemo(() => {
    const format = new Intl.DateTimeFormat(intl(locale), { month: 'numeric', day: 'numeric' });
    const lastMonday = new Date('2026-11-23T00:00:00+08:00').getTime();
    return kpis.issuedByWeek.map((_, i, all) => format.format(new Date(lastMonday - (all.length - 1 - i) * 7 * 86400000)));
  }, [locale]);
  const compact = useMemo(() => new Intl.NumberFormat(intl(locale), { notation: 'compact' }), [locale]);
  const value = (v: number | null) => formatNumber(locale, v ?? 0);
  const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

  return (
    <Card component="section" aria-labelledby="chart-title" sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'tonal.surfaceContainerLow' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography id="chart-title" variant="h3" component="h2">
          {t(locale, 'issuedVsRedeemed')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <LegendItem color={issuedColor} label={t(locale, 'issued')} total={sum(kpis.issuedByWeek)} locale={locale} />
          <LegendItem color={redeemedColor} label={t(locale, 'redeemedSeries')} total={sum(kpis.redeemedByWeek)} locale={locale} round />
        </Box>
      </Box>
      <Box sx={{ position: 'relative', height: { xs: 260, sm: 320 } }}>
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <BarChart
            skipAnimation={Boolean(reduce)}
            series={[
              { id: 'issued', data: kpis.issuedByWeek, label: t(locale, 'issued'), color: issuedColor, valueFormatter: value },
              { id: 'redeemed', data: kpis.redeemedByWeek, label: t(locale, 'redeemedSeries'), color: redeemedColor, valueFormatter: value },
            ]}
            xAxis={[{ scaleType: 'band', data: weeks, categoryGapRatio: 0.34, barGapRatio: 0.12, disableLine: true, disableTicks: true }]}
            yAxis={[{ disableLine: true, disableTicks: true, width: 44, valueFormatter: (v: number) => compact.format(v) }]}
            grid={{ horizontal: true }}
            borderRadius={7}
            hideLegend
            margin={{ top: 12, right: 8, bottom: 4, left: 0 }}
            sx={{
              '& .MuiChartsGrid-line': { stroke: theme.vars.palette.tonal.outlineVariant, strokeDasharray: '2 6' },
              '& .MuiChartsAxis-tickLabel': { fill: theme.vars.palette.text.secondary, fontWeight: 600 },
            }}
          />
        </Box>
      </Box>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Pending approvals

type Decision = 'approve' | 'reject';

function ApprovalRow({ row, locale, decision, onDecide }: { row: PendingCheckIn; locale: Locale; decision?: Decision; onDecide: (row: PendingCheckIn, decision: Decision) => void }) {
  const name = pick(row.employeeName, locale);
  return (
    <Box
      component={motion.li}
      layout
      custom={decision}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: decision === 'reject' ? -72 : 72, scale: 0.94, transition: { duration: 0.26, ease: ease.accelerate } }}
      transition={spring.layout}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.25,
        pr: 1,
        borderRadius: `${radius.lg}px`,
        bgcolor: decision === 'approve' ? 'tonal.positiveContainer' : decision === 'reject' ? 'tonal.negativeContainer' : 'tonal.surfaceContainerLowest',
        transition: `background-color 200ms ${easing.emphasized}`,
        '&:hover': decision ? {} : { bgcolor: 'tonal.surfaceContainerHighest' },
      }}
    >
      <Avatar variant="rounded" aria-hidden sx={{ width: 44, height: 44 }}>
        {name.trim().charAt(0)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gap: 0.5 }}>
        <Typography variant="subtitle2" component="p">
          {name}{' '}
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
            {row.employeeNo} · {pick(row.department, locale)}
          </Typography>
        </Typography>
        <Typography variant="body2" component="p" sx={{ color: 'text.secondary' }}>
          {pick(row.eventTitle, locale)} ·{' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
            {signed(locale, row.points)} {t(locale, 'pts')}
          </Box>
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
          <Chip size="small" variant={row.onRoster ? 'outlined' : 'tonal'} color={row.onRoster ? 'default' : 'secondary'} label={t(locale, row.onRoster ? 'onRoster' : 'walkIn')} />
          <Chip
            size="small"
            variant="outlined"
            icon={row.method === 'card' ? <ContactlessRounded /> : <QrCode2Rounded />}
            label={t(locale, row.method === 'card' ? 'byCard' : 'byLink')}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatDateTime(locale, row.checkedInAt)}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        <Tooltip title={t(locale, 'approve')}>
          <IconButton
            aria-label={`${t(locale, 'approve')}: ${name}`}
            disabled={Boolean(decision)}
            onClick={() => onDecide(row, 'approve')}
            sx={{ width: 44, height: 44, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.main', boxShadow: 2 }, '&.Mui-disabled': { bgcolor: 'primary.main', color: 'primary.contrastText', opacity: 0.7 } }}
          >
            <CheckRounded />
          </IconButton>
        </Tooltip>
        <Tooltip title={t(locale, 'reject')}>
          <IconButton
            aria-label={`${t(locale, 'reject')}: ${name}`}
            disabled={Boolean(decision)}
            onClick={() => onDecide(row, 'reject')}
            sx={{ width: 44, height: 44, border: '1px solid', borderColor: 'tonal.outline' }}
          >
            <CloseRounded />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

function Approvals({ locale, data }: { locale: Locale; data: LabData }) {
  const reduce = useReducedMotion();
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  // Two beats: the row takes the colour of the decision, then leaves in its direction.
  const decide = useCallback(
    (row: PendingCheckIn, decision: Decision, delay = 0) => {
      const commit = () => (decision === 'approve' ? data.approve(row, locale) : data.reject(row));
      if (reduce) {
        commit();
        return;
      }
      timers.current.push(
        window.setTimeout(() => setDecisions((prev) => ({ ...prev, [row.id]: decision })), delay),
        window.setTimeout(commit, delay + 260),
      );
    },
    [data, locale, reduce],
  );

  const approveAll = () => {
    const rows = data.pending.filter((row) => !decisions[row.id]);
    if (reduce) data.approveAll(rows, locale);
    else rows.forEach((row, index) => decide(row, 'approve', index * 90));
  };

  const count = data.pending.length;

  return (
    <Card component="section" id="approvals" aria-labelledby="approvals-title" sx={{ ...sectionSx, height: '100%', p: { xs: 2, sm: 2.5 }, bgcolor: 'tonal.surfaceContainer', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', pl: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Typography id="approvals-title" variant="h3" component="h2">
            {t(locale, 'pendingApprovals')}
          </Typography>
          <AnimatePresence mode="popLayout" initial={false}>
            <Box
              component={motion.span}
              key={count}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={spring.bouncy}
              sx={{ typography: 'subtitle2', minWidth: 28, height: 28, px: 1, display: 'grid', placeItems: 'center', borderRadius: '999px', bgcolor: 'primary.main', color: 'primary.contrastText' }}
            >
              {count}
            </Box>
          </AnimatePresence>
        </Box>
        <Button variant="tonal" color="primary" startIcon={<DoneAllRounded />} disabled={count === 0} onClick={approveAll}>
          {t(locale, 'approveAll')}
        </Button>
      </Box>

      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1, alignContent: 'start', flex: 1, position: 'relative', minHeight: 220 }}>
        <AnimatePresence mode="popLayout">
          {data.pending.map((row) => (
            <ApprovalRow key={row.id} row={row} locale={locale} decision={decisions[row.id]} onDecide={decide} />
          ))}
          {count === 0 && (
            <Box
              component={motion.li}
              key="empty"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring.bouncy, delay: 0.2 }}
              sx={{ display: 'grid', justifyItems: 'center', alignContent: 'center', gap: 2, py: 5, minHeight: 220 }}
            >
              <ShapeBadge size={112} lobes={10} depth={0.055} bg="var(--ph-palette-tonal-primaryContainer)" fg="var(--ph-palette-tonal-onPrimaryContainer)" spin>
                <DoneAllRounded sx={{ fontSize: 48 }} />
              </ShapeBadge>
              <Typography variant="h3" component="p">
                {t(locale, 'allCaughtUp')}
              </Typography>
            </Box>
          )}
        </AnimatePresence>
      </Box>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Ledger

const MotionRow = motion.create(TableRow);

function LedgerRow({ tx, locale, fresh, wide, onRevert }: { tx: Transaction; locale: Locale; fresh: boolean; wide: boolean; onRevert: (tx: Transaction) => void }) {
  const positive = tx.amount > 0;
  const canRevert = !tx.reverted && tx.type !== 'reversal';
  const revertLabel = `${t(locale, 'revert')}: ${tx.employeeName}, ${pick(tx.title, locale)}`;
  return (
    <MotionRow
      hover
      layout="position"
      initial={{ opacity: 0, y: -22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={spring.layout}
      sx={{
        '@keyframes ph-row-flash': { from: { backgroundColor: 'var(--ph-palette-tonal-primaryContainer)' }, to: { backgroundColor: 'transparent' } },
        animation: fresh ? `ph-row-flash 1800ms ${easing.emphasized} 1` : 'none',
      }}
    >
      <TableCell sx={{ pl: 2 }}>
        <Typography variant="subtitle2" component="p" noWrap>
          {tx.employeeName}
        </Typography>
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
          {tx.employeeNo}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip size="small" variant="tonal" color={typeTone[tx.type]} icon={typeIcon[tx.type]} label={t(locale, typeKey(tx.type))} />
      </TableCell>
      <TableCell sx={{ minWidth: 170, width: '36%' }}>
        <Box sx={{ display: 'grid', gap: 0.5, justifyItems: 'start' }}>
          <span>{pick(tx.title, locale)}</span>
          {tx.source && <Chip size="small" variant="outlined" icon={<ApiRounded />} label={tx.source} />}
          {!wide && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatDateTime(locale, tx.createdAt)}
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell align="right">
        <Box sx={{ display: 'grid', gap: 0.5, justifyItems: 'end' }}>
          <Typography
            variant="subtitle1"
            component="span"
            sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: tx.reverted ? 'text.secondary' : positive ? 'success.main' : 'text.primary', textDecoration: tx.reverted ? 'line-through' : 'none' }}
          >
            {signed(locale, tx.amount)}
          </Typography>
          <AnimatePresence initial={false}>
            {tx.reverted && (
              <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy} style={{ display: 'inline-flex' }}>
                <Chip size="small" variant="tonal" color="error" label={t(locale, 'reverted')} />
              </motion.span>
            )}
          </AnimatePresence>
        </Box>
      </TableCell>
      {wide && <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{formatDateTime(locale, tx.createdAt)}</TableCell>}
      <TableCell align="right" sx={{ pr: 1.5, width: 1 }}>
        {canRevert &&
          (wide ? (
            <Button size="small" variant="tonal" startIcon={<UndoRounded />} aria-label={revertLabel} onClick={() => onRevert(tx)}>
              {t(locale, 'revert')}
            </Button>
          ) : (
            <Tooltip title={t(locale, 'revert')}>
              <IconButton aria-label={revertLabel} onClick={() => onRevert(tx)} sx={{ bgcolor: 'tonal.secondaryContainer', color: 'tonal.onSecondaryContainer' }}>
                <UndoRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          ))}
      </TableCell>
    </MotionRow>
  );
}

function Ledger({ locale, data, wide }: { locale: Locale; data: LabData; wide: boolean }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const rows = needle ? data.ledger.filter((tx) => tx.employeeName.toLowerCase().includes(needle) || tx.employeeNo.toLowerCase().includes(needle)) : data.ledger;

  return (
    <Card component="section" id="ledger" aria-labelledby="ledger-title" sx={{ ...sectionSx, p: { xs: 2, sm: 2.5 }, bgcolor: 'tonal.surfaceContainerLow', display: 'grid', gap: 2, alignContent: 'start' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', pl: 0.5 }}>
        <Typography id="ledger-title" variant="h3" component="h2">
          {t(locale, 'ledger')}
        </Typography>
        <OutlinedInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(locale, 'search')}
          inputProps={{ 'aria-label': t(locale, 'search') }}
          startAdornment={
            <InputAdornment position="start">
              <SearchRounded sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          }
          sx={{ width: { xs: '100%', sm: 280 } }}
        />
      </Box>
      <TableContainer sx={{ minHeight: { lg: 420 } }}>
        <Table aria-labelledby="ledger-title" sx={{ minWidth: 540 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t(locale, 'colEmployee')}</TableCell>
              <TableCell>{t(locale, 'colType')}</TableCell>
              <TableCell>{t(locale, 'colDescription')}</TableCell>
              <TableCell align="right">{t(locale, 'colAmount')}</TableCell>
              {wide && <TableCell>{t(locale, 'colDate')}</TableCell>}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence initial={false}>
              {rows.map((tx) => (
                <LedgerRow key={tx.id} tx={tx} locale={locale} fresh={data.fresh.has(tx.id)} wide={wide} onRevert={data.revert} />
              ))}
            </AnimatePresence>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={wide ? 6 : 5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <SearchOffRounded aria-hidden sx={{ fontSize: 40, display: 'block', mx: 'auto', mb: 1 }} />
                  {query}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Gift stock

const LOW_STOCK = 10;

function Stock({ locale, data }: { locale: Locale; data: LabData }) {
  return (
    <Card component="section" id="stock" aria-labelledby="stock-title" sx={{ ...sectionSx, p: { xs: 2, sm: 2.5 }, bgcolor: 'tonal.surfaceContainer', display: 'grid', gap: 1.5, alignContent: 'start' }}>
      <Typography id="stock-title" variant="h3" component="h2" sx={{ pl: 0.5, minHeight: 40, display: 'flex', alignItems: 'center' }}>
        {t(locale, 'giftsAdmin')}
      </Typography>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {data.gifts.map((gift) => {
          const out = gift.stock === 0;
          const low = !out && gift.stock <= LOW_STOCK;
          return (
            <Box
              component="li"
              key={gift.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.25,
                borderRadius: `${radius.lg}px`,
                bgcolor: out || low ? 'tonal.negativeContainer' : 'tonal.surfaceContainerLowest',
                color: out || low ? 'tonal.onNegativeContainer' : 'text.primary',
                transition: `background-color 300ms ${easing.emphasized}`,
              }}
            >
              <Box aria-hidden sx={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 24, borderRadius: `${radius.sm}px`, bgcolor: 'tonal.surfaceContainerHigh', filter: out ? 'grayscale(1)' : 'none' }}>
                {gift.emoji}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gap: 0.5 }}>
                <Typography variant="subtitle2" component="p">
                  {pick(gift.name, locale)}
                </Typography>
                <Typography variant="caption" component="p" sx={{ opacity: 0.86 }}>
                  {t(locale, 'colCost')} · {formatNumber(locale, gift.pointCost)} {t(locale, 'pts')}
                </Typography>
                <LinearProgress variant="determinate" color={out || low ? 'error' : 'primary'} value={Math.min(100, (gift.stock / 40) * 100)} aria-hidden sx={{ height: 6 }} />
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0, minWidth: 56, position: 'relative' }}>
                {out ? (
                  <Chip size="small" label={t(locale, 'outOfStock')} sx={{ bgcolor: 'error.main', color: 'error.contrastText' }} />
                ) : (
                  <>
                    <Typography variant="h5" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      <CountUp value={gift.stock} from={gift.stock} duration={0.5} format={(v) => formatNumber(locale, v)} />
                    </Typography>
                    <Typography variant="caption" component="p" sx={{ opacity: 0.86 }}>
                      {t(locale, 'colStock')}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------

export function AdminView({ state, data, wide }: { state: LabState; data: LabData; wide: boolean }) {
  const { locale } = state;
  return (
    <Box
      component={motion.div}
      variants={stagger}
      initial="hidden"
      animate="show"
      exit="exit"
      sx={{ maxWidth: 1480, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, pt: { xs: 0.5, sm: 1 }, display: 'grid', gap: { xs: 2, sm: 3 } }}
    >
      <Box component={motion.div} variants={rise} id="dashboard" sx={{ ...sectionSx, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h1">{t(locale, 'dashboard')}</Typography>
        <Button variant="tonal" size="large" startIcon={<TuneRounded />}>
          {t(locale, 'adjustPoints')}
        </Button>
      </Box>

      <KpiRow locale={locale} data={data} />

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid size={{ xs: 12, lg: 7 }} sx={{ display: 'grid', gap: { xs: 2, sm: 3 }, alignContent: 'start', minWidth: 0 }}>
          <motion.div variants={rise}>
            <IssuedVsRedeemed locale={locale} />
          </motion.div>
          <motion.div variants={rise}>
            <Stock locale={locale} data={data} />
          </motion.div>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <motion.div variants={rise} style={{ height: '100%' }}>
            <Approvals locale={locale} data={data} />
          </motion.div>
        </Grid>
        <Grid size={12}>
          <motion.div variants={rise}>
            <Ledger locale={locale} data={data} wide={wide} />
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
}
