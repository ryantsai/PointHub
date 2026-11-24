import { Avatar, Button, Card, Chip, Label, Meter, ProgressBar, toast } from '@heroui/react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  Check,
  Gift as GiftIcon,
  Hourglass,
  Lock,
  MapPin,
  QrCode,
  RotateCcw,
  ScanLine,
  SlidersHorizontal,
  Trophy,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentType } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { EventItem, Gift, Locale, Transaction, TransactionType } from '@shared/data';
import { leaderboard, me, pick } from '@shared/data';
import type { StringKey } from '@shared/strings';
import { formatDateTime, formatNumber, t } from '@shared/strings';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Burst } from '../components/Burst';
import { Emoji, MotionCard, SectionTitle } from '../components/ui';
import { initials, signed } from '../lib/format';
import { popSpring, rise, riseSmall, spring, stagger, staggerFast } from '../lib/motion';
import type { Store } from '../lib/store';

type ViewProps = { locale: Locale; store: Store };

export function EmployeeView({ locale, store }: ViewProps) {
  return (
    <motion.main
      animate="show"
      className="mx-auto grid max-w-[1240px] grid-cols-1 gap-5 px-3 pt-5 pb-20 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:pt-7"
      initial="hidden"
      variants={stagger}
    >
      <Hero locale={locale} store={store} />
      <CheckInCard locale={locale} />
      <Events locale={locale} store={store} />
      <Gifts locale={locale} store={store} />
      <Activity locale={locale} store={store} />
      <Leaderboard locale={locale} store={store} />
    </motion.main>
  );
}

/* ---- Balance hero --------------------------------------------------------------------------- */

function Hero({ locale, store }: ViewProps) {
  const name = pick(me.displayName, locale);
  const remaining = Math.max(0, me.nextRewardAt - store.balance);

  return (
    <MotionCard className="relative gap-7 overflow-hidden p-6 sm:p-8 lg:col-span-8" variants={rise}>
      <div aria-hidden className="hero__ribbon" />

      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
        <Avatar color="accent" size="lg" variant="soft">
          <Avatar.Fallback>{initials(name)}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-[11rem] flex-1">
          <h1 className="text-lg leading-snug font-semibold tracking-tight sm:text-xl">
            {t(locale, 'greeting', { name })}
          </h1>
          <p className="text-sm text-muted">
            {pick(me.department, locale)} · {me.employeeNo}
          </p>
        </div>
        <Chip className="gap-1.5" color="accent" size="lg" variant="soft">
          <Trophy aria-hidden className="size-3.5" />
          {t(locale, 'rank', { rank: me.rank })}
        </Chip>
      </div>

      <div className="relative">
        <p className="eyebrow">{t(locale, 'balance')}</p>
        <p className="mt-2 flex items-baseline gap-3">
          <AnimatedNumber className="hero-number" locale={locale} value={store.balance} />
          <span className="text-xl font-medium text-muted">{t(locale, 'pts')}</span>
        </p>
      </div>

      <ProgressBar className="relative" maxValue={me.nextRewardAt} value={Math.min(store.balance, me.nextRewardAt)}>
        <Label className="flex items-center gap-1.5">
          <GiftIcon aria-hidden className="size-4 shrink-0 text-accent-soft-foreground" />
          {t(locale, 'nextReward', { count: formatNumber(locale, remaining) })}
        </Label>
        <ProgressBar.Output className="text-muted" />
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>

      <dl className="relative grid grid-cols-2 gap-3">
        <div className="tile rounded-3xl px-4 py-3.5">
          <dt className="flex items-center gap-1.5 text-[13px] text-muted">
            <ArrowUpRight aria-hidden className="size-4 text-success-soft-foreground" />
            {t(locale, 'lifetimeEarned')}
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight">
            <AnimatedNumber locale={locale} value={me.lifetimeEarned} />
          </dd>
        </div>
        <div className="tile rounded-3xl px-4 py-3.5">
          <dt className="flex items-center gap-1.5 text-[13px] text-muted">
            <ArrowDownLeft aria-hidden className="size-4 text-accent-soft-foreground" />
            {t(locale, 'lifetimeSpent')}
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight">
            <AnimatedNumber locale={locale} value={store.lifetimeSpent} />
          </dd>
        </div>
      </dl>
    </MotionCard>
  );
}

/* ---- Check-in call to action ---------------------------------------------------------------- */

function CheckInCard({ locale }: { locale: Locale }) {
  const [done, setDone] = useState(false);
  const [fire, setFire] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const checkIn = () => {
    if (done) return;
    setDone(true);
    setFire((n) => n + 1);
    timer.current = window.setTimeout(() => setDone(false), 2800);
  };

  return (
    <MotionCard
      className="relative items-center justify-between gap-6 overflow-hidden p-6 text-center sm:p-8 lg:col-span-4"
      variants={rise}
    >
      <div className="relative mt-2 grid size-28 place-items-center">
        {!done && (
          <>
            <span aria-hidden className="pulse-ring" />
            <span aria-hidden className="pulse-ring" />
          </>
        )}
        <Burst fire={fire} radius={130} />
        <motion.div
          animate={{ scale: done ? 1.12 : 1 }}
          className="grid size-20 place-items-center rounded-full bg-accent text-accent-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_18px_32px_-14px_var(--accent)]"
          transition={popSpring}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={done ? 'done' : 'scan'}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              initial={{ scale: 0.4, rotate: -40, opacity: 0 }}
              transition={popSpring}
            >
              {done ? <Check className="size-9" strokeWidth={2.6} /> : <QrCode className="size-9" strokeWidth={1.8} />}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </div>

      <p className="max-w-[26ch] text-[15px] leading-relaxed text-balance text-muted">{t(locale, 'scanToCheckIn')}</p>

      <Button fullWidth size="lg" onPress={checkIn}>
        {done ? <Check aria-hidden /> : <ScanLine aria-hidden />}
        {t(locale, done ? 'checkedIn' : 'checkIn')}
      </Button>
      <span className="sr-only" role="status">
        {done ? t(locale, 'checkedIn') : ''}
      </span>
    </MotionCard>
  );
}

/* ---- Events --------------------------------------------------------------------------------- */

const eventOrder = (event: EventItem) => (event.status !== 'open' ? 2 : event.myCheckIn === 'none' ? 0 : 1);

function Events({ locale, store }: ViewProps) {
  const [justCheckedIn, setJustCheckedIn] = useState<number | null>(null);
  const sorted = [...store.events]
    .filter((event) => event.status !== 'closed')
    .sort((a, b) => eventOrder(a) - eventOrder(b) || a.startsAt.localeCompare(b.startsAt));

  return (
    <motion.section className="flex flex-col gap-3 lg:col-span-5" variants={stagger}>
      <motion.div variants={riseSmall}>
        <SectionTitle>{t(locale, 'events')}</SectionTitle>
      </motion.div>
      {sorted.map((event) => {
        const open = event.status === 'open';
        return (
          <MotionCard key={event.id} className="gap-3.5 p-4 sm:p-5" layout="position" transition={spring} variants={rise}>
            <div className="flex items-start gap-3.5">
              <div className="tile grid size-12 shrink-0 place-items-center rounded-2xl text-2xl">
                <Emoji>{event.emoji}</Emoji>
              </div>
              <div className="min-w-0 flex-1">
                <Chip className="gap-1.5" color={open ? 'success' : 'default'} size="sm" variant="soft">
                  {open && <span aria-hidden className="live-dot ms-1" />}
                  {t(locale, open ? 'openNow' : 'upcoming')}
                </Chip>
                <h3 className="mt-1.5 text-[15px] leading-snug font-semibold">{pick(event.title, locale)}</h3>
              </div>
              <p className="shrink-0 text-end leading-none">
                <span className="num text-2xl font-semibold tracking-tight text-accent-soft-foreground">
                  +{formatNumber(locale, event.points)}
                </span>
                <span className="mt-1 block text-xs text-muted">{t(locale, 'pts')}</span>
              </p>
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted">
              <li className="flex items-center gap-1.5">
                <CalendarDays aria-hidden className="size-3.5 shrink-0" />
                {formatDateTime(locale, event.startsAt)}
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin aria-hidden className="size-3.5 shrink-0" />
                {pick(event.location, locale)}
              </li>
              <li className="num flex items-center gap-1.5">
                <Users aria-hidden className="size-3.5 shrink-0" />
                {event.capacity
                  ? t(locale, 'capacity', {
                      count: formatNumber(locale, event.attendees),
                      max: formatNumber(locale, event.capacity),
                    })
                  : t(locale, 'attendees', { count: formatNumber(locale, event.attendees) })}
              </li>
            </ul>

            {event.capacity != null && open && (
              <Meter
                aria-label={t(locale, 'attendees', { count: event.attendees })}
                maxValue={event.capacity}
                size="sm"
                value={event.attendees}
              >
                <Meter.Track>
                  <Meter.Fill />
                </Meter.Track>
              </Meter>
            )}

            {open && (
              <div className="relative h-10">
                <AnimatePresence initial={false} mode="popLayout">
                  {event.myCheckIn === 'none' ? (
                    <motion.div key="action" exit={{ opacity: 0, scale: 0.92 }} transition={spring}>
                      <Button
                        fullWidth
                        onPress={() => {
                          setJustCheckedIn(event.id);
                          store.checkIn(event.id);
                        }}
                      >
                        <ScanLine aria-hidden />
                        {t(locale, 'checkIn')}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="state"
                      animate={{ opacity: 1, scale: 1 }}
                      className={`tile relative flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium ${
                        event.myCheckIn === 'approved' ? 'text-success-soft-foreground' : 'text-warning-soft-foreground'
                      }`}
                      initial={{ opacity: 0, scale: 0.85 }}
                      role="status"
                      transition={popSpring}
                    >
                      <Burst fire={justCheckedIn === event.id ? event.id : 0} radius={84} />
                      {event.myCheckIn === 'approved' ? (
                        <Check aria-hidden className="size-4" />
                      ) : (
                        <Hourglass aria-hidden className="size-4" />
                      )}
                      {t(locale, event.myCheckIn === 'approved' ? 'checkedIn' : 'waitingApproval')}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </MotionCard>
        );
      })}
    </motion.section>
  );
}

/* ---- Gifts ---------------------------------------------------------------------------------- */

const tagKey: Record<NonNullable<Gift['tag']>, StringKey> = { new: 'tagNew', popular: 'tagPopular', limited: 'tagLimited' };
const tagColour = { new: 'accent', popular: 'success', limited: 'warning' } as const;

function Gifts({ locale, store }: ViewProps) {
  return (
    <motion.section className="flex flex-col gap-3 lg:col-span-7" variants={stagger}>
      <motion.div variants={riseSmall}>
        <SectionTitle
          aside={
            <span className="tile num flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium">
              <AnimatedNumber locale={locale} value={store.balance} />
              <span className="text-muted">{t(locale, 'pts')}</span>
            </span>
          }
        >
          {t(locale, 'gifts')}
        </SectionTitle>
      </motion.div>
      <motion.div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3" variants={staggerFast}>
        {store.gifts.map((gift) => (
          <GiftCard key={gift.id} balance={store.balance} gift={gift} locale={locale} onRedeem={store.redeem} />
        ))}
      </motion.div>
    </motion.section>
  );
}

function GiftCard({
  gift,
  balance,
  locale,
  onRedeem,
}: {
  gift: Gift;
  balance: number;
  locale: Locale;
  onRedeem: (id: number) => boolean;
}) {
  const [celebrate, setCelebrate] = useState(0);
  const [justRedeemed, setJustRedeemed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const name = pick(gift.name, locale);
  const soldOut = gift.stock <= 0;
  const missing = gift.pointCost - balance;
  const affordable = !soldOut && missing <= 0;
  const lowStock = !soldOut && gift.stock <= 5;

  const redeem = () => {
    if (justRedeemed || !onRedeem(gift.id)) return;
    setCelebrate((n) => n + 1);
    setJustRedeemed(true);
    toast.success(t(locale, 'redeemed'), {
      description: `${name} · ${signed(locale, -gift.pointCost)} ${t(locale, 'pts')}`,
      timeout: 3200,
    });
    timer.current = window.setTimeout(() => setJustRedeemed(false), 1900);
  };

  return (
    <MotionCard
      className="gap-3 p-3.5 sm:p-4"
      transition={spring}
      variants={rise}
      whileHover={soldOut ? undefined : { y: -5, transition: spring }}
    >
      <div className="tile relative grid h-24 place-items-center rounded-3xl sm:h-28">
        {gift.tag && (
          <Chip className="absolute start-2 top-2" color={tagColour[gift.tag]} size="sm" variant="soft">
            {t(locale, tagKey[gift.tag])}
          </Chip>
        )}
        <Burst fire={celebrate} radius={88} />
        <motion.span
          key={celebrate}
          animate={celebrate ? { y: [0, -26, 0], rotate: [0, -14, 10, 0], scale: [1, 1.35, 1] } : undefined}
          className={`text-5xl ${soldOut ? 'opacity-45 grayscale' : ''}`}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Emoji>{gift.emoji}</Emoji>
        </motion.span>
      </div>

      <div className="flex min-h-[4.6rem] flex-col gap-1">
        <h3 className="text-[15px] leading-snug font-semibold">{name}</h3>
        <p className="line-clamp-2 text-[13px] leading-snug text-muted">{pick(gift.description, locale)}</p>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="leading-none">
          <span className="num text-xl font-semibold tracking-tight">{formatNumber(locale, gift.pointCost)}</span>
          <span className="ms-1 text-xs text-muted">{t(locale, 'pts')}</span>
        </p>
        {!soldOut && (
          <p
            className={`num text-xs font-medium ${lowStock ? 'text-warning-soft-foreground' : 'text-muted'}`}
          >
            {t(locale, 'inStock', { count: formatNumber(locale, gift.stock) })}
          </p>
        )}
      </div>

      {soldOut ? (
        <p className="tile grid h-10 place-items-center rounded-full px-3 text-[13px] font-medium text-muted md:h-9">
          {t(locale, 'outOfStock')}
        </p>
      ) : affordable || justRedeemed ? (
        <Button fullWidth onPress={redeem}>
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={justRedeemed ? 'done' : 'go'}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-1.5"
              exit={{ y: -10, opacity: 0 }}
              initial={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {justRedeemed && <Check aria-hidden />}
              {t(locale, justRedeemed ? 'redeemed' : 'redeem')}
            </motion.span>
          </AnimatePresence>
        </Button>
      ) : (
        <div className="flex h-10 flex-col justify-center gap-1.5 md:h-9">
          <ProgressBar
            aria-label={t(locale, 'notEnough', { count: formatNumber(locale, missing) })}
            color="default"
            maxValue={gift.pointCost}
            size="sm"
            value={balance}
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          <p className="num flex items-center gap-1 text-xs font-medium text-muted">
            <Lock aria-hidden className="size-3 shrink-0" />
            {t(locale, 'notEnough', { count: formatNumber(locale, missing) })}
          </p>
        </div>
      )}
    </MotionCard>
  );
}

/* ---- Recent activity ------------------------------------------------------------------------ */

const typeIcon: Record<TransactionType, ComponentType<{ className?: string }>> = {
  eventAward: CalendarCheck,
  redemption: GiftIcon,
  adjustment: SlidersHorizontal,
  reversal: RotateCcw,
  externalCredit: ArrowUpRight,
  externalDebit: ArrowDownLeft,
};

function Activity({ locale, store }: ViewProps) {
  return (
    <MotionCard className="gap-2 p-5 sm:p-6 lg:col-span-7" variants={rise}>
      <Card.Header className="flex-row items-center justify-between gap-3">
        <Card.Title className="text-lg font-semibold tracking-tight">{t(locale, 'recentActivity')}</Card.Title>
        <Button size="sm" variant="ghost">
          {t(locale, 'seeAll')}
        </Button>
      </Card.Header>
      <ul className="-mx-2 flex flex-col">
        <AnimatePresence initial={false}>
          {store.activity.slice(0, 7).map((txn) => (
            <ActivityRow key={txn.id} locale={locale} txn={txn} />
          ))}
        </AnimatePresence>
      </ul>
    </MotionCard>
  );
}

function ActivityRow({ txn, locale }: { txn: Transaction; locale: Locale }) {
  const Icon = typeIcon[txn.type];
  const gain = txn.amount > 0;
  return (
    <motion.li
      layout
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex items-center gap-3 rounded-2xl px-2 py-2.5"
      exit={{ opacity: 0, scale: 0.96 }}
      initial={{ opacity: 0, y: -22, scale: 0.94 }}
      transition={spring}
    >
      <span
        className={`tile grid size-10 shrink-0 place-items-center rounded-full ${
          gain ? 'text-success-soft-foreground' : 'text-accent-soft-foreground'
        }`}
      >
        <Icon aria-hidden className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{pick(txn.title, locale)}</p>
        <p className="truncate text-xs text-muted">
          {t(locale, `type_${txn.type}`)} · {formatDateTime(locale, txn.createdAt)}
          {txn.source ? ` · ${txn.source}` : ''}
        </p>
      </div>
      <p className={`num shrink-0 text-[15px] font-semibold ${gain ? 'text-success-soft-foreground' : ''}`}>
        {signed(locale, txn.amount)}
      </p>
    </motion.li>
  );
}

/* ---- Leaderboard teaser --------------------------------------------------------------------- */

function Leaderboard({ locale, store }: ViewProps) {
  const top = leaderboard[0].points;
  return (
    <MotionCard className="gap-3 p-5 sm:p-6 lg:col-span-5" variants={rise}>
      <Card.Header className="flex-row items-center justify-between gap-3">
        <Card.Title className="text-lg font-semibold tracking-tight">{t(locale, 'leaderboard')}</Card.Title>
        <Button size="sm" variant="ghost">
          {t(locale, 'seeAll')}
        </Button>
      </Card.Header>
      <motion.ol className="flex flex-col gap-1" variants={staggerFast}>
        {leaderboard.map((entry) => (
          <motion.li key={entry.rank} className="flex items-center gap-3 py-1.5" variants={riseSmall}>
            <span
              className={`num grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                entry.rank === 1 ? 'bg-accent text-accent-foreground' : 'tile text-muted'
              }`}
            >
              {entry.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">{entry.name}</p>
                <p className="num text-[13px] font-medium text-muted">{formatNumber(locale, entry.points)}</p>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-default">
                <motion.div
                  className="h-full origin-left rounded-full bg-accent rtl:origin-right"
                  style={{ width: `${(entry.points / top) * 100}%` }}
                  transition={{ ...spring, delay: 0.25 }}
                  variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }}
                />
              </div>
            </div>
          </motion.li>
        ))}
      </motion.ol>
      <div className="tile mt-1 flex items-center gap-3 rounded-3xl px-3 py-2.5">
        <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-foreground">
          {me.rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{pick(me.displayName, locale)}</p>
          <p className="truncate text-xs text-muted">{t(locale, 'rank', { rank: me.rank })}</p>
        </div>
        <p className="num text-sm font-semibold">
          <AnimatedNumber locale={locale} value={store.balance} />
        </p>
      </div>
    </MotionCard>
  );
}
