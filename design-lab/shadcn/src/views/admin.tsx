import { useEffect, useMemo, useState, type ReactNode, type Ref } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ArrowDownLeftIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarCheckIcon,
  CheckCheckIcon,
  CheckIcon,
  CoinsIcon,
  GiftIcon,
  IdCardIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  PlugIcon,
  PlusIcon,
  QrCodeIcon,
  ScrollTextIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  Undo2Icon,
  UsersIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import { kpis, me, pick, type Gift, type Locale, type Transaction, type TransactionType } from '@shared/data';
import { formatDateTime, formatNumber, formatPercent, t } from '@shared/strings';
import { Bento, Cell, CellFill, CellHeader } from '@/components/app/bento';
import { RollingNumber } from '@/components/app/rolling-number';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatSigned, initial, typeKey } from '@/lib/format';
import { EASE, base, item, layoutSpring, line, page, quick } from '@/lib/motion';
import { useStore, type QueueItem } from '@/lib/store';
import { cn } from '@/lib/utils';

const TODAY = '2026-11-25T14:05:00+08:00';
const LOW_STOCK = 10;

export function AdminView({ locale }: { locale: Locale }) {
  return (
    <motion.div variants={page} initial="hidden" animate="show" className="mx-auto flex w-full max-w-[90rem] flex-col lg:flex-row">
      <AdminNav locale={locale} />
      <div className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6">
        <motion.header variants={item} className="flex items-end justify-between gap-4 px-1 pb-5">
          <div className="min-w-0">
            <p className="eyebrow text-muted-foreground">{formatDateTime(locale, TODAY)}</p>
            <div className="mt-1 overflow-hidden">
              <motion.h1 variants={line} className="text-2xl leading-tight font-semibold tracking-tight sm:text-[1.75rem]">
                {t(locale, 'dashboard')}
              </motion.h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight font-medium">{pick(me.displayName, locale)}</p>
              <p className="text-xs text-muted-foreground">{t(locale, 'viewAdmin')}</p>
            </div>
            <Avatar>
              <AvatarFallback className="bg-foreground text-background">{initial(pick(me.displayName, locale))}</AvatarFallback>
            </Avatar>
          </div>
        </motion.header>

        <KpiStrip locale={locale} />

        <Bento className="mt-3 grid-cols-1 sm:mt-4 xl:grid-cols-12">
          <ChartCell locale={locale} />
          <ApprovalsCell locale={locale} />
          <LedgerCell locale={locale} />
          <StockCell locale={locale} />
        </Bento>
      </div>
    </motion.div>
  );
}

// ---- navigation ---------------------------------------------------------------------------------

type NavKey = 'dashboard' | 'approvals' | 'ledger' | 'giftsAdmin' | 'employees' | 'apiKeys';
const NAV: { key: NavKey; icon: LucideIcon; target?: string; inert?: boolean }[] = [
  { key: 'dashboard', icon: LayoutDashboardIcon, target: 'top' },
  { key: 'approvals', icon: CheckCheckIcon, target: 'sec-approvals' },
  { key: 'ledger', icon: ScrollTextIcon, target: 'sec-ledger' },
  { key: 'giftsAdmin', icon: GiftIcon, target: 'sec-stock' },
  { key: 'employees', icon: UsersIcon, inert: true },
  { key: 'apiKeys', icon: KeyRoundIcon, inert: true },
];

function AdminNav({ locale }: { locale: Locale }) {
  const { pending } = useStore();
  const reduced = useReducedMotion();
  const [active, setActive] = useState<NavKey>('dashboard');

  const go = (key: NavKey, target?: string) => {
    setActive(key);
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
    if (target === 'top') window.scrollTo({ top: 0, behavior });
    else if (target) document.getElementById(target)?.scrollIntoView({ behavior, block: 'start' });
  };

  return (
    <nav
      aria-label={t(locale, 'viewAdmin')}
      className="sticky top-(--bar-h) z-30 border-b border-border bg-background/85 backdrop-blur-md lg:h-[calc(100dvh-var(--bar-h))] lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0 lg:bg-transparent lg:backdrop-blur-none"
    >
      <ul className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2 sm:px-6 lg:flex-col lg:overflow-visible lg:px-3 lg:py-6">
        {NAV.map((entry) => {
          const isActive = entry.key === active;
          return (
            <motion.li key={entry.key} variants={item} className="shrink-0">
              <Button
                variant="ghost"
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={entry.inert || undefined}
                onClick={() => !entry.inert && go(entry.key, entry.target)}
                className={cn(
                  'group/nav relative h-9 w-full justify-start gap-2.5 px-3 text-muted-foreground hover:bg-transparent hover:text-foreground',
                  isActive && 'text-foreground',
                  entry.inert && 'cursor-default opacity-60 hover:text-muted-foreground active:translate-y-0',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    transition={layoutSpring}
                    className="absolute inset-0 rounded-lg border border-border bg-card"
                  >
                    <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-primary lg:block" />
                  </motion.span>
                )}
                <entry.icon className="relative transition-transform duration-200 ease-ink group-hover/nav:-translate-y-px" />
                <span className="relative">{t(locale, entry.key)}</span>
                {entry.key === 'approvals' && pending.length > 0 && (
                  <span className="relative ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-semibold text-primary-foreground tabular-nums lg:ml-auto">
                    {pending.length}
                  </span>
                )}
              </Button>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}

// ---- KPI strip ----------------------------------------------------------------------------------

function KpiStrip({ locale }: { locale: Locale }) {
  const { issued, redeemed, outstanding, pending } = useStore();
  const participation = kpis.activeParticipants / kpis.totalEmployees;

  return (
    <Bento className="grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      <Kpi label={t(locale, 'issuedThisMonth')} value={formatNumber(locale, issued)} icon={ArrowUpRightIcon} delay={0.1}>
        <Delta locale={locale} value={kpis.pointsIssuedDelta} />
      </Kpi>
      <Kpi label={t(locale, 'redeemedThisMonth')} value={formatNumber(locale, redeemed)} icon={GiftIcon} delay={0.16}>
        <Delta locale={locale} value={kpis.pointsRedeemedDelta} />
      </Kpi>
      <Kpi
        label={t(locale, 'participation')}
        value={formatPercent(locale, participation).replace(/^\+/, '')}
        icon={UsersIcon}
        delay={0.22}
      >
        <span className="flex w-full items-center gap-2.5">
          <span className="tabular-nums">
            {t(locale, 'capacity', {
              count: formatNumber(locale, kpis.activeParticipants),
              max: formatNumber(locale, kpis.totalEmployees),
            })}
          </span>
          <span aria-hidden className="block h-0.5 min-w-8 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.span
              className="block h-full origin-left bg-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: participation }}
              transition={{ duration: 1, ease: EASE, delay: 0.45 }}
            />
          </span>
        </span>
      </Kpi>
      <Kpi
        label={t(locale, 'outstanding')}
        value={formatNumber(locale, outstanding)}
        icon={CoinsIcon}
        delay={0.28}
        className="md:col-span-2 xl:col-span-1"
      >
        {t(locale, 'points')}
      </Kpi>
      <Kpi
        label={t(locale, 'pendingApprovals')}
        value={formatNumber(locale, pending.length)}
        icon={CheckCheckIcon}
        delay={0.34}
        className="col-span-2 md:col-span-1"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={pending.length > 0 ? 'open' : 'clear'}
            className="inline-flex items-center gap-2"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={quick}
          >
            {pending.length > 0 ? (
              <>
                <span className="relative flex size-1.5">
                  <span className="ink-ping absolute inset-0 rounded-full bg-primary" />
                  <span className="relative size-1.5 rounded-full bg-primary" />
                </span>
                {t(locale, 'approvals')}
              </>
            ) : (
              <>
                <CheckIcon aria-hidden className="size-3.5 text-primary" />
                {t(locale, 'allCaughtUp')}
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </Kpi>
    </Bento>
  );
}

type KpiProps = { label: string; value: string; icon: LucideIcon; delay: number; className?: string; children: ReactNode };

function Kpi({ label, value, icon: Icon, delay, className, children }: KpiProps) {
  return (
    <Cell className={cn('group/kpi transition-colors duration-200 hover:bg-muted/40', className)} contentClassName="gap-4 p-5">
      <p className="flex min-h-[2.75em] items-start justify-between gap-2 text-xs leading-snug text-muted-foreground">
        {label}
        <Icon aria-hidden className="size-3.5 shrink-0 transition-transform duration-300 ease-ink group-hover/kpi:-translate-y-0.5" />
      </p>
      <p className="text-[1.75rem] leading-none font-semibold tracking-[-0.035em] sm:text-[2rem]">
        <RollingNumber text={value} delay={delay} />
      </p>
      <div className="mt-auto flex min-h-5 items-center text-xs text-muted-foreground">{children}</div>
    </Cell>
  );
}

function Delta({ locale, value }: { locale: Locale; value: number }) {
  const Icon = value >= 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span className="inline-flex items-center gap-0.5 font-medium text-foreground tabular-nums">
        <Icon aria-hidden className={cn('size-3.5', value >= 0 && 'text-primary')} />
        {formatPercent(locale, value)}
      </span>
      {t(locale, 'vsLastMonth')}
    </span>
  );
}

// ---- 01 chart -----------------------------------------------------------------------------------

function ChartCell({ locale }: { locale: Locale }) {
  const reduced = useReducedMotion();
  // Recharts replays its entrance whenever the container is resized; only let it run once.
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setIntro(false), 1900);
    return () => window.clearTimeout(id);
  }, []);
  const data = useMemo(
    () => kpis.issuedByWeek.map((issued, i) => ({ week: i + 1, issued, redeemed: kpis.redeemedByWeek[i] ?? 0 })),
    [],
  );
  // shadcn's chart reads series colours from this config and exposes them as --color-<key>;
  // pointing them at --chart-1 / --chart-2 is all it takes for the chart to follow the season.
  const config = {
    issued: { label: t(locale, 'issued'), color: 'var(--chart-1)' },
    redeemed: { label: t(locale, 'redeemedSeries'), color: 'var(--chart-2)' },
  } satisfies ChartConfig;
  const last = data[data.length - 1];

  return (
    <Cell className="xl:col-span-7 xl:h-[27rem]" aria-labelledby="chart-title">
      <CellHeader index="01" title={t(locale, 'issuedVsRedeemed')} id="chart-title">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-4 rounded-full bg-chart-1" />
            {t(locale, 'issued')}
            <span className="font-semibold text-foreground tabular-nums">{formatNumber(locale, last?.issued ?? 0)}</span>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="w-4 border-t-2 border-dashed border-chart-2" />
            {t(locale, 'redeemedSeries')}
            <span className="font-semibold text-foreground tabular-nums">{formatNumber(locale, last?.redeemed ?? 0)}</span>
          </li>
        </ul>
      </CellHeader>
      <div className="min-h-0 flex-1 px-2 pt-5 pb-3 sm:px-4">
        <ChartContainer config={config} className="aspect-auto h-72 w-full xl:h-full">
          <AreaChart accessibilityLayer data={data} margin={{ top: 6, right: 14, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ink-issued" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-issued)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-issued)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={10} interval={0} />
            <YAxis
              width={52}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tickCount={4}
              tickFormatter={(value: number) => formatNumber(locale, value)}
            />
            <ChartTooltip cursor={{ strokeDasharray: '2 3' }} content={<ChartTooltipContent indicator="line" hideLabel />} />
            <Area
              dataKey="issued"
              type="monotone"
              stroke="var(--color-issued)"
              strokeWidth={2}
              fill="url(#ink-issued)"
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
              isAnimationActive={intro && !reduced}
              animationBegin={250}
              animationDuration={1100}
              animationEasing="ease-out"
            />
            <Area
              dataKey="redeemed"
              type="monotone"
              stroke="var(--color-redeemed)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              fill="none"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={intro && !reduced}
              animationBegin={450}
              animationDuration={1100}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </Cell>
  );
}

// ---- 02 approvals -------------------------------------------------------------------------------

type Leaving = Record<number, { dir: 1 | -1; delay: number }>;

function ApprovalsCell({ locale }: { locale: Locale }) {
  const { pending, approve, reject } = useStore();
  // How each row should leave (approve → right, reject → left, approve-all → cascade). It is passed
  // through AnimatePresence's `custom`, the only channel that still reaches a row after removal.
  const [leaving, setLeaving] = useState<Leaving>({});

  const approveOne = (id: number) => {
    setLeaving({ [id]: { dir: 1, delay: 0 } });
    approve([id]);
  };
  const rejectOne = (id: number) => {
    setLeaving({ [id]: { dir: -1, delay: 0 } });
    reject(id);
  };
  const approveAll = () => {
    setLeaving(Object.fromEntries(pending.map((p, i) => [p.id, { dir: 1, delay: i * 0.055 }])));
    approve(pending.map((p) => p.id));
  };

  return (
    <Cell id="sec-approvals" className="scroll-mt-[calc(var(--bar-h)+4.5rem)] xl:col-span-5 xl:h-[27rem]" aria-labelledby="approvals-title">
      <CellHeader index="02" title={t(locale, 'pendingApprovals')} id="approvals-title">
        <Button variant="outline" size="sm" disabled={pending.length === 0} onClick={approveAll}>
          <CheckCheckIcon data-icon="inline-start" />
          {t(locale, 'approveAll')}
        </Button>
      </CellHeader>
      <motion.div layoutScroll className="relative min-h-52 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        {pending.length > 0 && <CellFill className="absolute inset-0" />}
        <ul className="relative -mb-px">
          <AnimatePresence mode="popLayout" initial={false} custom={leaving}>
            {pending.map((p) => (
              <ApprovalRow key={p.id} item={p} locale={locale} leaving={leaving} onApprove={() => approveOne(p.id)} onReject={() => rejectOne(p.id)} />
            ))}
          </AnimatePresence>
        </ul>
        <AnimatePresence>
          {pending.length === 0 && (
            <motion.div
              key="empty"
              className="absolute inset-0 grid place-items-center p-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.55 } }}
              exit={{ opacity: 0, transition: quick }}
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <svg viewBox="0 0 56 56" aria-hidden fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="size-14 text-primary">
                  <motion.circle
                    cx={28}
                    cy={28}
                    r={24}
                    strokeWidth={1.25}
                    initial={{ pathLength: 0, rotate: -90 }}
                    animate={{ pathLength: 1, rotate: -90 }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.6 }}
                  />
                  <motion.path
                    d="M18 29 L25 36 L39 21"
                    strokeWidth={2}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: EASE, delay: 1 }}
                  />
                </svg>
                <p role="status" className="text-base font-medium tracking-tight">
                  {t(locale, 'allCaughtUp')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Cell>
  );
}

type ApprovalRowProps = {
  item: QueueItem;
  locale: Locale;
  leaving: Leaving;
  onApprove: () => void;
  onReject: () => void;
  ref?: Ref<HTMLLIElement>;
};

function ApprovalRow({ item: p, locale, leaving, onApprove, onReject, ref }: ApprovalRowProps) {
  const variants: Variants = {
    initial: { opacity: 0, y: 12 },
    enter: { opacity: 1, y: 0, x: 0 },
    exit: (map: Leaving) => {
      const how = map[p.id] ?? { dir: 1, delay: 0 };
      return { opacity: 0, x: how.dir * 48, transition: { duration: 0.28, ease: [0.4, 0, 1, 1], delay: how.delay } };
    },
  };
  const MethodIcon = p.method === 'card' ? IdCardIcon : QrCodeIcon;
  const name = pick(p.employeeName, locale);

  return (
    <motion.li
      ref={ref}
      layout
      custom={leaving}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{ layout: layoutSpring, default: base }}
      className="group/row grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border bg-card px-5 py-3 transition-colors duration-200 hover:bg-muted/50 sm:px-6"
    >
      <Avatar>
        <AvatarFallback>{initial(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="shrink-0 font-mono text-[0.6875rem] text-muted-foreground">{p.employeeNo}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {pick(p.eventTitle, locale)} ·{' '}
          <span className="font-medium text-foreground tabular-nums">
            {formatSigned(locale, p.points)} {t(locale, 'pts')}
          </span>
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn('rounded-md', !p.onRoster && 'border-primary/50')}>
            {!p.onRoster && <span aria-hidden className="size-1.5 rounded-full bg-primary" />}
            {t(locale, p.onRoster ? 'onRoster' : 'walkIn')}
          </Badge>
          <Badge variant="secondary" className="rounded-md text-muted-foreground">
            <MethodIcon aria-hidden />
            {t(locale, p.method === 'card' ? 'byCard' : 'byLink')}
          </Badge>
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon-sm" aria-label={`${t(locale, 'reject')}: ${name}`} onClick={onReject} />}>
            <XIcon />
          </TooltipTrigger>
          <TooltipContent>{t(locale, 'reject')}</TooltipContent>
        </Tooltip>
        <Button size="sm" aria-label={`${t(locale, 'approve')}: ${name}`} onClick={onApprove}>
          <CheckIcon data-icon="inline-start" />
          {t(locale, 'approve')}
        </Button>
      </div>
    </motion.li>
  );
}

// ---- 03 ledger ----------------------------------------------------------------------------------

const TYPE_ICON: Record<TransactionType, LucideIcon> = {
  eventAward: CalendarCheckIcon,
  redemption: GiftIcon,
  adjustment: SlidersHorizontalIcon,
  reversal: Undo2Icon,
  externalCredit: ArrowDownLeftIcon,
  externalDebit: ArrowUpRightIcon,
};

// shadcn's TableRow is a plain function component that forwards its props to <tr>, so motion can wrap it.
const MotionRow = motion.create(TableRow);

function LedgerCell({ locale }: { locale: Locale }) {
  const { ledger, fresh, revert } = useStore();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const rows = needle
    ? ledger.filter((row) => row.employeeName.toLowerCase().includes(needle) || row.employeeNo.toLowerCase().includes(needle))
    : ledger;

  const head = 'eyebrow h-9 text-muted-foreground';
  return (
    <Cell id="sec-ledger" className="scroll-mt-[calc(var(--bar-h)+4.5rem)] xl:col-span-12" aria-labelledby="ledger-title">
      <CellHeader index="03" title={t(locale, 'ledger')} id="ledger-title">
        <div className="relative min-w-0 flex-1 sm:flex-none">
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(locale, 'search')}
            aria-label={t(locale, 'search')}
            className="w-full pl-8 sm:w-60"
          />
        </div>
        <Button variant="outline">
          <PlusIcon data-icon="inline-start" />
          {t(locale, 'adjustPoints')}
        </Button>
      </CellHeader>
      <Table className="text-[0.8125rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(head, 'pl-5 sm:pl-6')}>{t(locale, 'colEmployee')}</TableHead>
            <TableHead className={head}>{t(locale, 'colType')}</TableHead>
            <TableHead className={head}>{t(locale, 'colDescription')}</TableHead>
            <TableHead className={cn(head, 'text-right')}>{t(locale, 'colAmount')}</TableHead>
            <TableHead className={cn(head, 'pl-6')}>{t(locale, 'colDate')}</TableHead>
            <TableHead className="h-9 pr-5 sm:pr-6">
              <span className="sr-only">{t(locale, 'revert')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <LedgerRow key={row.id} row={row} locale={locale} isFresh={fresh.includes(row.id)} onRevert={() => revert(row.id)} />
            ))}
          </AnimatePresence>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                <SearchIcon aria-hidden className="mr-2 inline size-4 align-[-3px]" />
                <span className="font-mono">{query}</span>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Cell>
  );
}

function LedgerRow({ row, locale, isFresh, onRevert }: { row: Transaction; locale: Locale; isFresh: boolean; onRevert: () => void }) {
  const Icon = TYPE_ICON[row.type];
  const canRevert = !row.reverted && row.type !== 'reversal';
  return (
    <MotionRow
      layout="position"
      initial={isFresh ? { opacity: 0, y: -20 } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ layout: layoutSpring, default: { duration: 0.45, ease: EASE } }}
      className={cn('group/row', isFresh && 'ink-fresh', row.reverted && 'text-muted-foreground')}
    >
      <TableCell className="py-2.5 pl-5 sm:pl-6">
        <span className={cn('block font-medium', !row.reverted && 'text-foreground')}>{row.employeeName}</span>
        <span className="block font-mono text-[0.6875rem] text-muted-foreground">{row.employeeNo}</span>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="rounded-md font-normal">
          <Icon aria-hidden className="text-muted-foreground" />
          {t(locale, typeKey(row.type))}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="block">{pick(row.title, locale)}</span>
        {row.source && (
          <span className="mt-0.5 flex items-center gap-1 font-mono text-[0.6875rem] text-muted-foreground">
            <PlugIcon aria-hidden className="size-3" />
            {row.source}
          </span>
        )}
      </TableCell>
      <TableCell
        className={cn(
          'text-right text-sm font-semibold tabular-nums',
          row.amount < 0 && 'font-medium text-muted-foreground',
          row.reverted && 'line-through decoration-1',
        )}
      >
        {formatSigned(locale, row.amount)}
      </TableCell>
      <TableCell className="pl-6 text-muted-foreground tabular-nums">{formatDateTime(locale, row.createdAt)}</TableCell>
      <TableCell className="w-px pr-5 text-right sm:pr-6">
        <AnimatePresence mode="wait" initial={false}>
          {row.reverted ? (
            <motion.span key="reverted" className="inline-block" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={base}>
              <Badge variant="secondary" className="rounded-md">
                {t(locale, 'reverted')}
              </Badge>
            </motion.span>
          ) : canRevert ? (
            <motion.span key="revert" className="inline-block" exit={{ opacity: 0, scale: 0.9, transition: quick }}>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${t(locale, 'revert')}: ${row.employeeName} ${formatSigned(locale, row.amount)}`}
                onClick={onRevert}
                className="text-muted-foreground group-hover/row:text-foreground"
              >
                <Undo2Icon data-icon="inline-start" className="transition-transform duration-300 ease-ink group-hover/button:-rotate-45" />
                {t(locale, 'revert')}
              </Button>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </TableCell>
    </MotionRow>
  );
}

// ---- 04 gift stock ------------------------------------------------------------------------------

function StockCell({ locale }: { locale: Locale }) {
  const { gifts } = useStore();
  const max = Math.max(...gifts.map((g) => g.stock), 1);
  return (
    <Cell id="sec-stock" className="scroll-mt-[calc(var(--bar-h)+4.5rem)] xl:col-span-12" aria-labelledby="stock-title">
      <CellHeader index="04" title={t(locale, 'giftsAdmin')} id="stock-title">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {t(locale, 'capacity', { count: gifts.filter((g) => g.stock > 0).length, max: gifts.length })}
        </span>
      </CellHeader>
      <ul className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 xl:grid-cols-6">
        {gifts.map((gift, i) => (
          <StockTile key={gift.id} gift={gift} locale={locale} max={max} index={i} />
        ))}
      </ul>
    </Cell>
  );
}

function StockTile({ gift, locale, max, index }: { gift: Gift; locale: Locale; max: number; index: number }) {
  const out = gift.stock <= 0;
  const low = !out && gift.stock <= LOW_STOCK;
  const fill = Math.log1p(gift.stock) / Math.log1p(max);
  return (
    <li className={cn('relative flex min-w-0 flex-col gap-3 bg-card p-4 transition-colors duration-200 hover:bg-muted/40 sm:p-5', low && 'bg-[color-mix(in_srgb,var(--primary)_5%,var(--card))] hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))]')}>
      {low && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" />}
      <div className="flex items-start justify-between gap-2">
        <span aria-hidden className={cn('text-2xl leading-none', out && 'opacity-50 grayscale')}>
          {gift.emoji}
        </span>
        {out ? (
          <Badge className="rounded-md bg-foreground text-background">{t(locale, 'outOfStock')}</Badge>
        ) : low ? (
          <Badge variant="outline" className="rounded-md border-primary/50 bg-card">
            <span className="relative flex size-1.5">
              <span className="ink-ping absolute inset-0 rounded-full bg-primary" />
              <span className="relative size-1.5 rounded-full bg-primary" />
            </span>
            {t(locale, 'inStock', { count: formatNumber(locale, gift.stock) })}
          </Badge>
        ) : null}
      </div>
      <p className="truncate text-sm font-medium">{pick(gift.name, locale)}</p>
      <dl className="mt-auto flex items-start justify-between gap-2">
        <div>
          <dt className="eyebrow text-muted-foreground">{t(locale, 'colStock')}</dt>
          <dd className={cn('mt-1 flex h-7 items-end text-2xl leading-none font-semibold tracking-tight', low && 'text-primary', out && 'text-muted-foreground')}>
            <RollingNumber text={formatNumber(locale, gift.stock)} delay={0.5 + index * 0.04} duration={0.7} />
          </dd>
        </div>
        <div className="text-right">
          <dt className="eyebrow text-muted-foreground">{t(locale, 'colCost')}</dt>
          <dd className="mt-1 flex h-7 items-end justify-end gap-1 text-sm leading-none tabular-nums">
            {formatNumber(locale, gift.pointCost)}
            <span className="text-xs leading-none text-muted-foreground">{t(locale, 'pts')}</span>
          </dd>
        </div>
      </dl>
      <span aria-hidden className="block h-0.5 overflow-hidden rounded-full bg-muted">
        <motion.span
          className={cn('block h-full origin-left', low ? 'bg-primary' : 'bg-foreground/60')}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: fill }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.4 + index * 0.05 }}
        />
      </span>
    </li>
  );
}
