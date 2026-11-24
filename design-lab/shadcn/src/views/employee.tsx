import { useEffect, useRef, useState, type Ref } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarCheckIcon,
  CheckIcon,
  ClockIcon,
  GiftIcon,
  LockIcon,
  MapPinIcon,
  SlidersHorizontalIcon,
  Undo2Icon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  leaderboard,
  me,
  pick,
  type EventItem,
  type Gift,
  type Locale,
  type Transaction,
  type TransactionType,
} from '@shared/data';
import { seasonByKey, type SeasonKey } from '@shared/seasons';
import { formatDateTime, formatNumber, t, type StringKey } from '@shared/strings';
import { Bento, Cell, CellFill, CellHeader } from '@/components/app/bento';
import { RollingNumber } from '@/components/app/rolling-number';
import { SeasonMark, SeasonParticles } from '@/components/app/season-mark';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatSigned, initial, pad2, typeKey } from '@/lib/format';
import { EASE, base, layoutSpring, line, page, quick } from '@/lib/motion';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type ViewProps = { locale: Locale; season: SeasonKey };

export function EmployeeView({ locale, season }: ViewProps) {
  return (
    <motion.div variants={page} initial="hidden" animate="show" className="mx-auto w-full max-w-[76rem] px-3 py-4 sm:px-6 sm:py-8">
      <Bento className="grid-cols-1 lg:grid-cols-12">
        <Hero locale={locale} season={season} />
        <CheckInCta locale={locale} />
        <EventsCell locale={locale} />
        <GiftsCell locale={locale} />
        <ActivityCell locale={locale} />
        <LeaderboardCell locale={locale} />
      </Bento>
    </motion.div>
  );
}

// ---- 00 hero ------------------------------------------------------------------------------------

function Hero({ locale, season }: ViewProps) {
  const { balance, earned, spent } = useStore();
  const remaining = Math.max(0, me.nextRewardAt - balance);
  const progress = Math.min(100, (balance / me.nextRewardAt) * 100);
  const nextReward = t(locale, 'nextReward', { count: formatNumber(locale, remaining) });

  return (
    <Cell className="lg:col-span-8">
      <SeasonParticles kind={seasonByKey(season).particles} />
      <div className="relative flex flex-1 flex-col p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-muted-foreground">
              {pick(me.department, locale)} · {me.employeeNo}
            </p>
            <div className="mt-2 overflow-hidden">
              <motion.h1 variants={line} className="text-xl leading-snug font-medium tracking-tight sm:text-2xl">
                {t(locale, 'greeting', { name: pick(me.displayName, locale) })}
              </motion.h1>
            </div>
          </div>
          <SeasonMark season={season} className="shrink-0 sm:size-12" />
        </div>

        <div className="mt-10 sm:mt-14">
          <p className="text-sm text-muted-foreground">{t(locale, 'balance')}</p>
          <p className="mt-1 flex items-baseline gap-3">
            <RollingNumber
              text={formatNumber(locale, balance)}
              delay={0.2}
              duration={1.15}
              className="text-[clamp(4.5rem,21vw,9.5rem)] leading-[0.92] font-semibold tracking-[-0.055em]"
            />
            <span className="text-lg text-muted-foreground sm:text-2xl">{t(locale, 'pts')}</span>
          </p>
        </div>
      </div>

      <dl className="relative grid grid-cols-2 border-t border-border sm:grid-cols-[2fr_1fr_1fr]">
        <div className="col-span-2 border-b border-border px-5 py-4 sm:col-span-1 sm:border-r sm:border-b-0 sm:px-8">
          <Progress
            value={progress}
            aria-label={nextReward}
            className="gap-2.5 [&_[data-slot=progress-indicator]]:duration-700 [&_[data-slot=progress-indicator]]:ease-ink [&_[data-slot=progress-track]]:h-[3px]"
          >
            <div className="flex w-full items-baseline justify-between gap-3">
              <span className="text-[0.8125rem] leading-snug text-balance">{nextReward}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {t(locale, 'capacity', {
                  count: formatNumber(locale, balance),
                  max: formatNumber(locale, me.nextRewardAt),
                })}
              </span>
            </div>
          </Progress>
        </div>
        <Stat label={t(locale, 'lifetimeEarned')} value={formatNumber(locale, earned)} className="border-r border-border" />
        <Stat label={t(locale, 'lifetimeSpent')} value={formatNumber(locale, spent)} />
      </dl>
    </Cell>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('px-5 py-4 sm:px-6', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight">
        <RollingNumber text={value} delay={0.45} />
      </dd>
    </div>
  );
}

// ---- check-in call to action ---------------------------------------------------------------------

const QR_MODULES: [number, number][] = [
  [26, 4], [26, 12], [24, 24], [32, 26], [40, 24], [48, 28], [26, 34], [34, 36], [44, 36], [26, 46], [36, 46], [48, 44], [4, 26], [12, 28],
];

function CheckInCta({ locale }: { locale: Locale }) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const run = () => {
    if (phase !== 'idle') return;
    setPhase('scanning');
    timers.current.push(
      window.setTimeout(() => setPhase('done'), 700),
      window.setTimeout(() => setPhase('idle'), 3200),
    );
  };
  const done = phase === 'done';

  return (
    <Cell className="lg:col-span-4">
      <Button
        onClick={run}
        className="group/cta relative h-full min-h-60 w-full flex-col items-stretch justify-between gap-10 rounded-none border-0 p-5 text-left whitespace-normal transition-[background-color] duration-200 hover:bg-[color-mix(in_oklch,var(--primary),black_9%)] focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-inset active:translate-y-0 sm:p-8 dark:hover:bg-[color-mix(in_oklch,var(--primary),white_12%)]"
      >
        <span className="flex items-start justify-between">
          {/* QR glyph → scan line → drawn check */}
          <span aria-hidden className="relative block size-16">
            <motion.svg
              viewBox="0 0 56 56"
              className="size-full"
              fill="currentColor"
              animate={{ opacity: done ? 0.22 : 1, scale: done ? 0.92 : 1 }}
              transition={base}
            >
              {[[4, 4], [36, 4], [4, 36]].map(([x, y]) => (
                <g key={`${x}-${y}`}>
                  <rect x={x + 1} y={y + 1} width={14} height={14} rx={2} fill="none" stroke="currentColor" strokeWidth={2} />
                  <rect x={x + 5} y={y + 5} width={6} height={6} rx={1} />
                </g>
              ))}
              {QR_MODULES.map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width={4} height={4} rx={0.75} />
              ))}
            </motion.svg>
            {phase === 'scanning' && <span className="ink-scan absolute inset-x-[-4px] top-0.5 block h-0.5 rounded-full bg-primary-foreground" />}
            <AnimatePresence>
              {done && (
                <motion.span key="check" className="absolute inset-0" exit={{ opacity: 0, transition: quick }}>
                  {[0, 1].map((i) => (
                    <motion.span
                      key={i}
                      className="absolute inset-1 rounded-full border border-primary-foreground"
                      initial={{ scale: 0.6, opacity: 0.7 }}
                      animate={{ scale: 2.4 + i * 0.9, opacity: 0 }}
                      transition={{ duration: 0.9, ease: EASE, delay: i * 0.12 }}
                    />
                  ))}
                  <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="absolute inset-0 size-full">
                    <motion.circle
                      cx={28}
                      cy={28}
                      r={22}
                      strokeWidth={2}
                      initial={{ pathLength: 0, rotate: -90 }}
                      animate={{ pathLength: 1, rotate: -90 }}
                      transition={{ duration: 0.5, ease: EASE }}
                    />
                    <motion.path
                      d="M18 29 L25 36 L39 21"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35, ease: EASE, delay: 0.22 }}
                    />
                  </svg>
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-full border border-primary-foreground/40 transition-transform duration-300 ease-ink group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5 group-active/cta:scale-90"
          >
            <ArrowUpRightIcon className="size-4" />
          </span>
        </span>

        <span className="block">
          <span aria-live="polite" className="block overflow-hidden pb-1">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={done ? 'done' : 'idle'}
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                exit={{ y: '-110%' }}
                transition={{ duration: 0.42, ease: EASE }}
                className="block text-[2rem] leading-[1.15] font-semibold tracking-tight sm:text-[2.5rem]"
              >
                {t(locale, done ? 'checkedIn' : 'checkIn')}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="mt-2 block max-w-[28ch] text-sm leading-snug font-normal">{t(locale, 'scanToCheckIn')}</span>
        </span>
      </Button>
    </Cell>
  );
}

// ---- 01 events ----------------------------------------------------------------------------------

function EventsCell({ locale }: { locale: Locale }) {
  const { events, checkIn } = useStore();
  const groups: { key: StringKey; live: boolean; items: EventItem[] }[] = [
    { key: 'openNow', live: true, items: events.filter((e) => e.status === 'open') },
    { key: 'upcoming', live: false, items: events.filter((e) => e.status === 'upcoming') },
  ];

  return (
    <Cell className="lg:col-span-7 lg:col-start-1 lg:row-start-2" aria-labelledby="events-title">
      <CellHeader index="01" title={t(locale, 'events')} id="events-title">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{pad2(events.length)}</span>
      </CellHeader>
      <div className="-mb-px">
      {groups.map((group) => (
        <div key={group.key} className="border-b border-border">
          <p className="eyebrow flex items-center gap-2 px-5 pt-4 pb-1 text-muted-foreground sm:px-6">
            {group.live ? (
              <span className="relative flex size-1.5">
                <span className="ink-ping absolute inset-0 rounded-full bg-primary" />
                <span className="relative size-1.5 rounded-full bg-primary" />
              </span>
            ) : (
              <span className="size-1.5 rounded-full border border-muted-foreground" />
            )}
            {t(locale, group.key)}
          </p>
          <ul className="divide-y divide-border">
            {group.items.map((event) => (
              <EventRow key={event.id} event={event} locale={locale} onCheckIn={() => checkIn(event.id)} />
            ))}
          </ul>
        </div>
      ))}
      </div>
      <CellFill />
    </Cell>
  );
}

function EventRow({ event, locale, onCheckIn }: { event: EventItem; locale: Locale; onCheckIn: () => void }) {
  const [flash, setFlash] = useState(0);
  const state = event.status === 'open' ? event.myCheckIn : 'upcoming';

  return (
    <li className="group/row relative flex gap-4 px-5 py-4 transition-colors duration-200 hover:bg-muted/50 sm:px-6">
      {flash > 0 && (
        <motion.span
          key={flash}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-primary/12"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      )}
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-background text-xl transition-transform duration-300 ease-ink group-hover/row:-translate-y-0.5"
      >
        {event.emoji}
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="leading-snug font-medium">{pick(event.title, locale)}</h3>
          <p className="shrink-0 font-semibold tabular-nums">
            {formatSigned(locale, event.points)} <span className="text-xs font-normal text-muted-foreground">{t(locale, 'pts')}</span>
          </p>
        </div>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.8125rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon aria-hidden className="size-3.5" />
            {formatDateTime(locale, event.startsAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon aria-hidden className="size-3.5" />
            {pick(event.location, locale)}
          </span>
        </p>
        <div className="mt-3 flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Capacity event={event} locale={locale} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={quick}
              className="ml-auto"
            >
              {state === 'none' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setFlash((n) => n + 1);
                    onCheckIn();
                  }}
                >
                  {t(locale, 'checkIn')}
                  <ArrowRightIcon data-icon="inline-end" className="transition-transform duration-200 group-hover/button:translate-x-0.5" />
                </Button>
              )}
              {state === 'pending' && (
                <Badge variant="outline" className="h-7 gap-2 rounded-lg px-2.5">
                  <span className="relative flex size-1.5">
                    <span className="ink-ping absolute inset-0 rounded-full bg-primary" />
                    <span className="relative size-1.5 rounded-full bg-primary" />
                  </span>
                  {t(locale, 'waitingApproval')}
                </Badge>
              )}
              {state === 'approved' && (
                <Badge variant="outline" className="h-7 gap-1.5 rounded-lg border-primary/40 bg-primary/8 px-2.5">
                  <CheckIcon className="text-primary" />
                  {t(locale, 'checkedIn')}
                </Badge>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </li>
  );
}

function Capacity({ event, locale }: { event: EventItem; locale: Locale }) {
  const label =
    event.capacity === null
      ? t(locale, 'attendees', { count: formatNumber(locale, event.attendees) })
      : t(locale, 'capacity', {
          count: formatNumber(locale, event.attendees),
          max: formatNumber(locale, event.capacity),
        });
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
      <UsersIcon aria-hidden className="size-3.5" />
      {label}
      {event.capacity !== null && (
        <span aria-hidden className="block h-0.5 w-14 overflow-hidden rounded-full bg-muted">
          <motion.span
            className="block h-full origin-left bg-foreground/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.min(1, event.attendees / event.capacity) }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
          />
        </span>
      )}
    </span>
  );
}

// ---- 02 gifts -----------------------------------------------------------------------------------

const TAG_KEY: Record<NonNullable<Gift['tag']>, StringKey> = { new: 'tagNew', popular: 'tagPopular', limited: 'tagLimited' };

function GiftsCell({ locale }: { locale: Locale }) {
  const { gifts, balance, redeem } = useStore();
  return (
    <Cell className="lg:col-span-9 lg:col-start-1 lg:row-start-3" aria-labelledby="gifts-title">
      <CellHeader index="02" title={t(locale, 'gifts')} id="gifts-title">
        <span className="text-xs text-muted-foreground">{t(locale, 'balance')}</span>
        <span className="text-sm font-semibold">
          <RollingNumber text={formatNumber(locale, balance)} duration={0.7} />
        </span>
        <span className="text-xs text-muted-foreground">{t(locale, 'pts')}</span>
      </CellHeader>
      <ul className="grid flex-1 grid-cols-2 gap-px bg-border md:grid-cols-3">
        {gifts.map((gift) => (
          <GiftCard key={gift.id} gift={gift} balance={balance} locale={locale} onRedeem={() => redeem(gift.id)} />
        ))}
      </ul>
    </Cell>
  );
}

function GiftCard({ gift, balance, locale, onRedeem }: { gift: Gift; balance: number; locale: Locale; onRedeem: () => void }) {
  const [celebrate, setCelebrate] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const out = gift.stock <= 0;
  const short = Math.max(0, gift.pointCost - balance);
  const state = showDone ? 'done' : out ? 'out' : short > 0 ? 'short' : 'ok';

  const handleRedeem = () => {
    onRedeem();
    setCelebrate((n) => n + 1);
    setShowDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShowDone(false), 1800);
  };

  return (
    <li className="group/gift relative flex min-w-0 flex-col bg-card p-4 transition-colors duration-200 hover:bg-muted/40 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="relative grid size-14 place-items-center">
          <motion.span
            key={`emoji-${celebrate}`}
            aria-hidden
            className={cn(
              'block text-[2.5rem] leading-none transition-[filter,opacity] duration-300',
              out && !showDone && 'opacity-50 grayscale',
            )}
            animate={celebrate ? { scale: [1, 1.24, 1], rotate: [0, -8, 0] } : undefined}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <span className="block transition-transform duration-300 ease-ink group-hover/gift:-translate-y-1 group-hover/gift:scale-105">
              {gift.emoji}
            </span>
          </motion.span>
          {celebrate > 0 && <Burst key={`burst-${celebrate}`} />}
        </span>
        {gift.tag && (
          <Badge variant="outline" className="rounded-md text-[0.6875rem]">
            {t(locale, TAG_KEY[gift.tag])}
          </Badge>
        )}
      </div>

      <h3 className="mt-4 leading-snug font-medium">{pick(gift.name, locale)}</h3>
      <p className="mt-1 line-clamp-2 min-h-[2.6em] text-[0.8125rem] leading-[1.3] text-muted-foreground">
        {pick(gift.description, locale)}
      </p>

      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 pt-4">
        <p className="tabular-nums">
          <span className="text-xl font-semibold tracking-tight">{formatNumber(locale, gift.pointCost)}</span>{' '}
          <span className="text-xs text-muted-foreground">{t(locale, 'pts')}</span>
        </p>
        {!out && (
          <p className="overflow-hidden text-xs text-muted-foreground tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={gift.stock}
                className="block"
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={base}
              >
                {t(locale, 'inStock', { count: formatNumber(locale, gift.stock) })}
              </motion.span>
            </AnimatePresence>
          </p>
        )}
      </div>

      <div className="mt-3 h-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state}
            className="h-full"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={quick}
          >
            {state === 'ok' && (
              <Button className="w-full" onClick={handleRedeem}>
                {t(locale, 'redeem')}
              </Button>
            )}
            {state === 'done' && (
              <p
                role="status"
                className="flex h-full items-center justify-center gap-1.5 rounded-lg bg-foreground text-sm font-medium text-background"
              >
                <svg viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                  <motion.path d="M3 8.5 L6.5 12 L13 4.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: EASE, delay: 0.08 }} />
                </svg>
                {t(locale, 'redeemed')}
              </p>
            )}
            {state === 'short' && (
              <div className="flex h-full flex-col justify-center gap-1.5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LockIcon aria-hidden className="size-3 shrink-0" />
                  <span className="truncate">{t(locale, 'notEnough', { count: formatNumber(locale, short) })}</span>
                </p>
                <span aria-hidden className="block h-0.5 overflow-hidden rounded-full bg-muted">
                  <motion.span
                    className="block h-full origin-left bg-foreground/55"
                    initial={false}
                    animate={{ scaleX: Math.min(1, balance / gift.pointCost) }}
                    transition={{ duration: 0.7, ease: EASE }}
                  />
                </span>
              </div>
            )}
            {state === 'out' && (
              <p className="flex h-full items-center justify-center rounded-lg border border-dashed border-input text-[0.8125rem] text-muted-foreground">
                {t(locale, 'outOfStock')}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </li>
  );
}

/** Ten hairline rays: the redeem "moment". Quick, radial, no bounce. */
function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="absolute top-1/2 left-1/2 block size-0" style={{ rotate: `${i * 36}deg` }}>
          <motion.span
            className="-mt-px block h-0.5 w-3 origin-left rounded-full bg-primary"
            initial={{ x: 18, scaleX: 0.2, opacity: 0 }}
            animate={{ x: [18, 36, 42], scaleX: [0.2, 1, 0.1], opacity: [0, 1, 0] }}
            transition={{ duration: 0.65, ease: EASE, delay: (i % 2) * 0.05 }}
          />
        </span>
      ))}
    </span>
  );
}

// ---- 03 recent activity -------------------------------------------------------------------------

const TYPE_ICON: Record<TransactionType, LucideIcon> = {
  eventAward: CalendarCheckIcon,
  redemption: GiftIcon,
  adjustment: SlidersHorizontalIcon,
  reversal: Undo2Icon,
  externalCredit: ArrowDownLeftIcon,
  externalDebit: ArrowUpRightIcon,
};

function ActivityCell({ locale }: { locale: Locale }) {
  const { activity } = useStore();
  return (
    <Cell className="lg:col-span-5 lg:col-start-8 lg:row-start-2" aria-labelledby="activity-title">
      <CellHeader index="03" title={t(locale, 'recentActivity')} id="activity-title">
        <Button variant="ghost" size="sm" className="-mr-2 text-muted-foreground">
          {t(locale, 'seeAll')}
          <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
      </CellHeader>
      <ul className="relative -mb-px">
        <AnimatePresence initial={false} mode="popLayout">
          {activity.slice(0, 8).map((tx) => (
            <ActivityRow key={tx.id} tx={tx} locale={locale} />
          ))}
        </AnimatePresence>
      </ul>
      <CellFill />
    </Cell>
  );
}

function ActivityRow({ tx, locale, ref }: { tx: Transaction; locale: Locale; ref?: Ref<HTMLLIElement> }) {
  const Icon = TYPE_ICON[tx.type];
  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ layout: layoutSpring, default: base }}
      className="flex items-center gap-3 border-b border-border px-5 py-3 transition-colors duration-200 hover:bg-muted/50 sm:px-6"
    >
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{pick(tx.title, locale)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {t(locale, typeKey(tx.type))} · <span className="tabular-nums">{formatDateTime(locale, tx.createdAt)}</span>
        </p>
      </div>
      <p
        className={cn(
          'shrink-0 font-semibold tabular-nums',
          tx.amount < 0 && 'text-muted-foreground',
          tx.reverted && 'line-through decoration-1',
        )}
      >
        {formatSigned(locale, tx.amount)}
      </p>
    </motion.li>
  );
}

// ---- 04 leaderboard -----------------------------------------------------------------------------

function LeaderboardCell({ locale }: { locale: Locale }) {
  const { balance } = useStore();
  const top = leaderboard[0]?.points ?? 1;
  return (
    <Cell className="lg:col-span-3 lg:col-start-10 lg:row-start-3" aria-labelledby="leaderboard-title">
      <CellHeader index="04" title={t(locale, 'leaderboard')} id="leaderboard-title" />
      <ol className="-mb-px">
        {leaderboard.map((row, i) => (
          <li key={row.rank} className="border-b border-border px-5 py-3 sm:px-6">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{pad2(row.rank)}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
              <span className="text-sm font-semibold tabular-nums">{formatNumber(locale, row.points)}</span>
            </div>
            <span aria-hidden className="mt-2 block h-px bg-border">
              <motion.span
                className={cn('block h-px origin-left', i === 0 ? 'bg-primary' : 'bg-foreground/70')}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: row.points / top }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.5 + i * 0.07 }}
              />
            </span>
          </li>
        ))}
      </ol>
      <CellFill />
      <div className="flex items-center gap-3 border-t border-border px-5 py-4 sm:px-6">
        <Avatar>
          <AvatarFallback className="bg-foreground text-background">{initial(pick(me.displayName, locale))}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{t(locale, 'rank', { rank: me.rank })}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatNumber(locale, balance)} {t(locale, 'pts')}
          </p>
        </div>
      </div>
    </Cell>
  );
}
