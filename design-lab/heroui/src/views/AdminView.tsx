import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Meter,
  ScrollShadow,
  SearchField,
  Table,
  Tooltip,
} from '@heroui/react';
import {
  Check,
  CheckCheck,
  ClipboardCheck,
  Coins,
  CreditCard,
  Gift as GiftIcon,
  KeyRound,
  LayoutDashboard,
  PartyPopper,
  QrCode,
  ScrollText,
  SearchX,
  Send,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Undo2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { HTMLMotionProps } from 'motion/react';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentType, ReactNode, Ref } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Locale, PendingCheckIn, Transaction, TransactionType } from '@shared/data';
import { kpis, pick } from '@shared/data';
import type { StringKey } from '@shared/strings';
import { formatDateTime, formatNumber, formatPercent, t } from '@shared/strings';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Burst } from '../components/Burst';
import { TrendChart } from '../components/TrendChart';
import { Emoji, MotionCard } from '../components/ui';
import { initials, share, signed } from '../lib/format';
import { popSpring, rise, riseSmall, spring, stagger, staggerFast } from '../lib/motion';
import type { Store } from '../lib/store';

type ViewProps = { locale: Locale; store: Store };
type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

const nav: { key: StringKey; icon: IconType }[] = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'approvals', icon: ClipboardCheck },
  { key: 'ledger', icon: ScrollText },
  { key: 'giftsAdmin', icon: GiftIcon },
  { key: 'employees', icon: Users },
  { key: 'apiKeys', icon: KeyRound },
];

export function AdminView({ locale, store }: ViewProps) {
  return (
    <motion.div
      animate="show"
      className="mx-auto flex max-w-[1400px] gap-6 px-3 pt-5 pb-20 sm:px-6 lg:pt-7"
      initial="hidden"
      variants={stagger}
    >
      <Sidebar locale={locale} pendingCount={store.pending.length} />

      <main className="flex min-w-0 flex-1 flex-col gap-5 lg:gap-6">
        <motion.div className="lg:hidden" variants={riseSmall}>
          <ScrollShadow hideScrollBar className="-mx-3 px-3 sm:-mx-6 sm:px-6" orientation="horizontal">
            <nav aria-label={t(locale, 'viewAdmin')} className="flex w-max gap-1.5">
              <NavItems locale={locale} pendingCount={store.pending.length} />
            </nav>
          </ScrollShadow>
        </motion.div>

        <motion.header className="flex flex-wrap items-center justify-between gap-3 px-1" variants={riseSmall}>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{t(locale, 'dashboard')}</h1>
          <Button variant="secondary">
            <SlidersHorizontal aria-hidden />
            {t(locale, 'adjustPoints')}
          </Button>
        </motion.header>

        <Kpis locale={locale} store={store} />

        <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
          <ChartCard locale={locale} />
          <Approvals locale={locale} store={store} />
        </div>

        <Ledger locale={locale} store={store} />
        <Stock locale={locale} store={store} />
      </main>
    </motion.div>
  );
}

/* ---- Navigation (only Dashboard has content; the rest are inert) ---------------------------- */

function NavItems({ locale, pendingCount, stretch }: { locale: Locale; pendingCount: number; stretch?: boolean }) {
  return nav.map(({ key, icon: Icon }) => {
    const current = key === 'dashboard';
    return (
      <Button
        key={key}
        aria-current={current ? 'page' : undefined}
        className={stretch ? 'justify-start gap-3 px-3' : 'gap-2'}
        fullWidth={stretch}
        variant={current ? 'secondary' : 'ghost'}
      >
        <Icon aria-hidden />
        <span className={stretch ? 'min-w-0 flex-1 truncate text-start' : ''}>{t(locale, key)}</span>
        {key === 'approvals' && pendingCount > 0 && (
          <Chip className="num" color="accent" size="sm" variant="soft">
            {formatNumber(locale, pendingCount)}
          </Chip>
        )}
      </Button>
    );
  });
}

function Sidebar({ locale, pendingCount }: { locale: Locale; pendingCount: number }) {
  return (
    <MotionCard className="sticky top-[5.5rem] hidden h-fit w-60 shrink-0 gap-1 p-3 lg:flex" variants={rise}>
      <p className="eyebrow px-3 pt-2 pb-1.5">{t(locale, 'viewAdmin')}</p>
      <nav aria-label={t(locale, 'viewAdmin')} className="flex flex-col gap-1">
        <NavItems stretch locale={locale} pendingCount={pendingCount} />
      </nav>
    </MotionCard>
  );
}

/* ---- KPI row -------------------------------------------------------------------------------- */

function Kpi({
  label,
  icon: Icon,
  value,
  footer,
  className = '',
}: {
  label: string;
  icon: IconType;
  value: ReactNode;
  footer: ReactNode;
  className?: string;
}) {
  return (
    <MotionCard
      className={`gap-3 p-4 sm:p-5 ${className}`}
      transition={spring}
      variants={rise}
      whileHover={{ y: -4, transition: spring }}
    >
      <span className="tile grid size-9 shrink-0 place-items-center rounded-full text-accent-soft-foreground">
        <Icon aria-hidden className="size-[18px]" />
      </span>
      <p className="flex min-h-[2.7em] items-end text-[13px] leading-snug font-medium text-muted">{label}</p>
      <p className="text-[28px] leading-none font-semibold tracking-tight">{value}</p>
      <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">{footer}</div>
    </MotionCard>
  );
}

function Delta({ locale, value }: { locale: Locale; value: number }) {
  const up = value >= 0;
  return (
    <>
      <Chip className="num gap-1" color={up ? 'success' : 'danger'} size="sm" variant="soft">
        {up ? <TrendingUp aria-hidden className="size-3" /> : <TrendingDown aria-hidden className="size-3" />}
        {formatPercent(locale, value)}
      </Chip>
      {t(locale, 'vsLastMonth')}
    </>
  );
}

function Kpis({ locale, store }: ViewProps) {
  const participation = kpis.activeParticipants / kpis.totalEmployees;
  const pendingCount = store.pending.length;
  // tablet: a 3 + 2 arrangement on a 6-column grid, so the second row has no hole
  const third = 'md:col-span-2 xl:col-span-1';
  const half = 'md:col-span-3 xl:col-span-1';

  return (
    <motion.div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-6 xl:grid-cols-5" variants={staggerFast}>
      <Kpi
        className={third}
        footer={<Delta locale={locale} value={kpis.pointsIssuedDelta} />}
        icon={Send}
        label={t(locale, 'issuedThisMonth')}
        value={<AnimatedNumber locale={locale} value={store.issued} />}
      />
      <Kpi
        className={third}
        footer={<Delta locale={locale} value={kpis.pointsRedeemedDelta} />}
        icon={GiftIcon}
        label={t(locale, 'redeemedThisMonth')}
        value={<AnimatedNumber locale={locale} value={store.redeemed} />}
      />
      <Kpi
        className={third}
        footer={
          <>
            <Meter
              aria-label={t(locale, 'participation')}
              className="w-full"
              maxValue={kpis.totalEmployees}
              size="sm"
              value={kpis.activeParticipants}
            >
              <Meter.Track>
                <Meter.Fill />
              </Meter.Track>
            </Meter>
            <span className="num">
              {t(locale, 'capacity', {
                count: formatNumber(locale, kpis.activeParticipants),
                max: formatNumber(locale, kpis.totalEmployees),
              })}
            </span>
          </>
        }
        icon={Users}
        label={t(locale, 'participation')}
        value={
          <AnimatedNumber format={(v) => share(locale, v / 100)} locale={locale} value={Math.round(participation * 100)} />
        }
      />
      <Kpi
        className={half}
        footer={t(locale, 'points')}
        icon={Wallet}
        label={t(locale, 'outstanding')}
        value={<AnimatedNumber locale={locale} value={store.outstanding} />}
      />
      <Kpi
          className={`col-span-2 ${half}`}
          footer={
            pendingCount > 0 ? (
              <Chip className="gap-1.5" color="warning" size="sm" variant="soft">
                <span aria-hidden className="live-dot ms-1" />
                {t(locale, 'waitingApproval')}
              </Chip>
            ) : (
              <Chip className="gap-1" color="success" size="sm" variant="soft">
                <Check aria-hidden className="size-3" />
                {t(locale, 'allCaughtUp')}
              </Chip>
            )
          }
          icon={ClipboardCheck}
          label={t(locale, 'pendingApprovals')}
          value={<AnimatedNumber locale={locale} value={pendingCount} />}
        />
    </motion.div>
  );
}

/* ---- Chart ---------------------------------------------------------------------------------- */

function ChartCard({ locale }: { locale: Locale }) {
  const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
  return (
    <MotionCard className="gap-5 p-5 sm:p-6 xl:col-span-6 2xl:col-span-7" variants={rise}>
      <Card.Header className="gap-4">
        <Card.Title className="text-lg font-semibold tracking-tight">{t(locale, 'issuedVsRedeemed')}</Card.Title>
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="flex items-center gap-2 text-[13px] text-muted">
              <span aria-hidden className="h-[3px] w-4 rounded-full bg-accent" />
              {t(locale, 'issued')}
            </dt>
            <dd className="mt-0.5 text-xl font-semibold tracking-tight">
              <AnimatedNumber locale={locale} value={total(kpis.issuedByWeek)} />
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-[13px] text-muted">
              <span aria-hidden className="w-4 border-t-[3px] border-dotted border-aurora" />
              {t(locale, 'redeemedSeries')}
            </dt>
            <dd className="mt-0.5 text-xl font-semibold tracking-tight">
              <AnimatedNumber locale={locale} value={total(kpis.redeemedByWeek)} />
            </dd>
          </div>
        </dl>
      </Card.Header>
      <TrendChart issued={kpis.issuedByWeek} locale={locale} redeemed={kpis.redeemedByWeek} />
    </MotionCard>
  );
}

/* ---- Pending approvals ---------------------------------------------------------------------- */

function Approvals({ locale, store }: ViewProps) {
  // +1: approved, slides out to the right; -1: rejected, slides out to the left
  const [direction, setDirection] = useState(1);
  const count = store.pending.length;

  return (
    <MotionCard className="gap-4 p-5 sm:p-6 xl:col-span-6 2xl:col-span-5" variants={rise}>
      <Card.Header className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Card.Title className="text-lg font-semibold tracking-tight">{t(locale, 'pendingApprovals')}</Card.Title>
          <Chip className="num" color="accent" variant="soft">
            <AnimatedNumber locale={locale} value={count} />
          </Chip>
        </div>
        <Button
          isDisabled={count === 0}
          size="sm"
          variant="secondary"
          onPress={() => {
            setDirection(1);
            store.approve(
              store.pending.map((p) => p.id),
              locale,
            );
          }}
        >
          <CheckCheck aria-hidden />
          {t(locale, 'approveAll')}
        </Button>
      </Card.Header>

      <ScrollShadow className="-mx-2 h-[26.5rem] px-2">
        <ul className="relative flex min-h-full flex-col gap-2 py-0.5">
          <AnimatePresence custom={direction} initial={false} mode="popLayout">
            {store.pending.map((item) => (
              <ApprovalRow
                key={item.id}
                item={item}
                locale={locale}
                onApprove={() => {
                  setDirection(1);
                  store.approve([item.id], locale);
                }}
                onReject={() => {
                  setDirection(-1);
                  store.reject(item.id);
                }}
              />
            ))}
            {count === 0 && (
              <motion.li
                key="empty"
                animate={{ opacity: 1, scale: 1 }}
                className="grid flex-1 place-items-center"
                initial={{ opacity: 0, scale: 0.8 }}
                transition={{ ...popSpring, delay: 0.2 }}
              >
                <EmptyState className="flex flex-col items-center gap-4 py-10 text-center">
                  <span className="relative grid size-20 place-items-center rounded-full bg-accent-soft text-accent-soft-foreground">
                    <Burst fire={1} radius={110} />
                    <PartyPopper aria-hidden className="size-9" strokeWidth={1.6} />
                  </span>
                  <span className="text-base font-semibold text-foreground">{t(locale, 'allCaughtUp')}</span>
                </EmptyState>
              </motion.li>
            )}
          </AnimatePresence>
        </ul>
      </ScrollShadow>
    </MotionCard>
  );
}

function ApprovalRow({
  item,
  locale,
  onApprove,
  onReject,
  ref,
}: {
  item: PendingCheckIn;
  locale: Locale;
  onApprove: () => void;
  onReject: () => void;
  ref?: Ref<HTMLLIElement>;
}) {
  const name = pick(item.employeeName, locale);
  const MethodIcon = item.method === 'card' ? CreditCard : QrCode;
  return (
    <motion.li
      ref={ref}
      layout
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className="tile flex items-center gap-3 rounded-3xl p-3"
      exit="exit"
      initial={{ opacity: 0, y: 12 }}
      transition={spring}
      variants={{
        exit: (direction: number) => ({
          opacity: 0,
          x: direction * 96,
          scale: 0.94,
          transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
        }),
      }}
    >
      <Avatar className="shrink-0" color={item.onRoster ? 'accent' : 'warning'} variant="soft">
        <Avatar.Fallback>{initials(name)}</Avatar.Fallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {name}
            <span className="font-normal text-muted"> · {pick(item.department, locale)}</span>
          </p>
          <p className="num shrink-0 text-sm font-semibold text-accent-soft-foreground">
            +{formatNumber(locale, item.points)} <span className="text-xs font-medium">{t(locale, 'pts')}</span>
          </p>
        </div>
        <p className="num truncate text-[13px] text-muted">
          {pick(item.eventTitle, locale)} · {formatDateTime(locale, item.checkedInAt)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Chip color={item.onRoster ? 'success' : 'warning'} size="sm" variant="soft">
            {t(locale, item.onRoster ? 'onRoster' : 'walkIn')}
          </Chip>
          <Chip className="gap-1" size="sm" variant="secondary">
            <MethodIcon aria-hidden className="ms-0.5 size-3" />
            {t(locale, item.method === 'card' ? 'byCard' : 'byLink')}
          </Chip>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
        <Tooltip>
          <Button isIconOnly aria-label={`${t(locale, 'reject')}: ${name}`} size="sm" variant="danger-soft" onPress={onReject}>
            <X aria-hidden />
          </Button>
          <Tooltip.Content>{t(locale, 'reject')}</Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Button isIconOnly aria-label={`${t(locale, 'approve')}: ${name}`} size="sm" onPress={onApprove}>
            <Check aria-hidden />
          </Button>
          <Tooltip.Content>{t(locale, 'approve')}</Tooltip.Content>
        </Tooltip>
      </div>
    </motion.li>
  );
}

/* ---- Ledger --------------------------------------------------------------------------------- */

const typeColour: Record<TransactionType, 'default' | 'accent' | 'success' | 'warning' | 'danger'> = {
  eventAward: 'accent',
  redemption: 'default',
  adjustment: 'warning',
  reversal: 'danger',
  externalCredit: 'success',
  externalDebit: 'default',
};

function Ledger({ locale, store }: ViewProps) {
  const [query, setQuery] = useState('');
  // rows that were already on screen when the dashboard opened do not replay their entrance
  const seen = useRef(new Set(store.ledger.map((row) => row.id)));
  const needle = query.trim().toLowerCase();
  const rows = needle
    ? store.ledger.filter(
        (row) => row.employeeName.toLowerCase().includes(needle) || row.employeeNo.toLowerCase().includes(needle),
      )
    : store.ledger;

  return (
    <MotionCard className="gap-4 p-5 sm:p-6" variants={rise}>
      <Card.Header className="flex-row flex-wrap items-center justify-between gap-3">
        <Card.Title className="text-lg font-semibold tracking-tight">{t(locale, 'ledger')}</Card.Title>
        <SearchField
          aria-label={t(locale, 'search')}
          className="w-full sm:w-72"
          value={query}
          variant="secondary"
          onChange={setQuery}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t(locale, 'search')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Card.Header>

      <Table variant="secondary">
        <Table.ScrollContainer>
          <Table.Content aria-label={t(locale, 'ledger')} className="min-w-[780px]">
            <Table.Header>
              <Table.Column isRowHeader className="whitespace-nowrap">{t(locale, 'colEmployee')}</Table.Column>
              <Table.Column className="whitespace-nowrap">{t(locale, 'colType')}</Table.Column>
              <Table.Column className="whitespace-nowrap">{t(locale, 'colDescription')}</Table.Column>
              <Table.Column className="text-end whitespace-nowrap">{t(locale, 'colAmount')}</Table.Column>
              <Table.Column className="whitespace-nowrap">{t(locale, 'colDate')}</Table.Column>
              <Table.Column className="text-end whitespace-nowrap">{t(locale, 'revert')}</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <EmptyState className="grid place-items-center py-12">
                  <SearchX aria-label={t(locale, 'search')} className="size-8 text-muted" role="img" strokeWidth={1.6} />
                </EmptyState>
              )}
            >
              {rows.map((row) => (
                <LedgerRow
                  key={row.id}
                  animateIn={!seen.current.has(row.id)}
                  fresh={store.freshIds.has(row.id)}
                  locale={locale}
                  row={row}
                  onRevert={() => store.revert(row.id)}
                />
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </MotionCard>
  );
}

function LedgerRow({
  row,
  locale,
  fresh,
  animateIn,
  onRevert,
}: {
  row: Transaction;
  locale: Locale;
  fresh: boolean;
  animateIn: boolean;
  onRevert: () => void;
}) {
  const gain = row.amount > 0;
  // Pressing Revert swaps the button for a chip. Hand focus to the cell so it is not dropped on
  // <body> (which would also leave React Aria's grid believing it still owns focus).
  const actionCell = useRef<HTMLTableCellElement>(null);
  const reverting = useRef(false);
  useEffect(() => {
    if (row.reverted && reverting.current) {
      reverting.current = false;
      actionCell.current?.focus({ preventScroll: true });
    }
  }, [row.reverted]);

  return (
    <Table.Row
      id={row.id}
      // React Aria's `render` prop lets Motion own the <tr>, so rows slide when one is inserted above
      render={(props) => (
        <motion.tr
          {...(props as HTMLMotionProps<'tr'>)}
          animate={{ opacity: 1, y: 0 }}
          data-fresh={fresh}
          initial={animateIn ? { opacity: 0, y: -28 } : false}
          layout="position"
          transition={spring}
        />
      )}
    >
      <Table.Cell>
        <div className="flex items-center gap-3">
          <Avatar size="sm" variant="soft">
            <Avatar.Fallback>{initials(row.employeeName)}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium whitespace-nowrap">{row.employeeName}</p>
            <p className="num text-xs text-muted">{row.employeeNo}</p>
          </div>
        </div>
      </Table.Cell>
      <Table.Cell>
        <Chip className="whitespace-nowrap" color={typeColour[row.type]} size="sm" variant="soft">
          {t(locale, `type_${row.type}`)}
        </Chip>
      </Table.Cell>
      <Table.Cell className="min-w-48">
        <p className={row.reverted ? 'text-muted' : ''}>{pick(row.title, locale)}</p>
        {row.source && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <KeyRound aria-hidden className="size-3 shrink-0" />
            {row.source}
          </p>
        )}
      </Table.Cell>
      <Table.Cell className="text-end">
        <span
          className={`num font-semibold whitespace-nowrap ${
            row.reverted ? 'text-muted line-through' : gain ? 'text-success-soft-foreground' : ''
          }`}
        >
          {signed(locale, row.amount)}
        </span>
      </Table.Cell>
      <Table.Cell className="num whitespace-nowrap text-muted">{formatDateTime(locale, row.createdAt)}</Table.Cell>
      <Table.Cell ref={actionCell} className="text-end">
        {row.reverted ? (
          <Chip size="sm" variant="secondary">
            {t(locale, 'reverted')}
          </Chip>
        ) : row.type !== 'reversal' ? (
          <Button
            aria-label={`${t(locale, 'revert')}: ${row.employeeName}, ${pick(row.title, locale)}`}
            size="sm"
            variant="tertiary"
            onPress={() => {
              reverting.current = true;
              onRevert();
            }}
          >
            <Undo2 aria-hidden />
            {t(locale, 'revert')}
          </Button>
        ) : null}
      </Table.Cell>
    </Table.Row>
  );
}

/* ---- Gift stock ----------------------------------------------------------------------------- */

const LOW_STOCK = 10;

function Stock({ locale, store }: ViewProps) {
  return (
    <MotionCard className="gap-4 p-5 sm:p-6" variants={rise}>
      <Card.Header>
        <Card.Title className="text-lg font-semibold tracking-tight">{t(locale, 'giftsAdmin')}</Card.Title>
      </Card.Header>
      <motion.ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 2xl:grid-cols-3" variants={staggerFast}>
        {store.gifts.map((gift) => {
          const out = gift.stock <= 0;
          const low = !out && gift.stock <= LOW_STOCK;
          return (
            <motion.li
              key={gift.id}
              className={`flex items-center gap-3 rounded-3xl border p-3 ${
                out
                  ? 'border-danger/40 bg-danger-soft'
                  : low
                    ? 'border-warning/50 bg-warning-soft'
                    : 'tile'
              }`}
              variants={riseSmall}
            >
              <span className="tile grid size-11 shrink-0 place-items-center rounded-2xl text-2xl">
                <Emoji className={out ? 'opacity-50 grayscale' : ''}>{gift.emoji}</Emoji>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{pick(gift.name, locale)}</p>
                <p className="num flex items-center gap-1 text-xs text-muted">
                  <Coins aria-hidden className="size-3 shrink-0" />
                  {t(locale, 'colCost')} · {formatNumber(locale, gift.pointCost)} {t(locale, 'pts')}
                </p>
              </div>
              <div className="shrink-0 text-end">
                <p className="text-xs text-muted">{t(locale, 'colStock')}</p>
                {out ? (
                  <p className="text-sm font-semibold text-danger-soft-foreground">{t(locale, 'outOfStock')}</p>
                ) : (
                  <p
                    className={`flex items-center justify-end gap-1 text-lg leading-tight font-semibold ${
                      low ? 'text-warning-soft-foreground' : ''
                    }`}
                  >
                    {low && <TriangleAlert aria-hidden className="size-4" />}
                    <AnimatedNumber locale={locale} value={gift.stock} />
                  </p>
                )}
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </MotionCard>
  );
}
