import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ApiOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  RightOutlined,
  ScanOutlined,
  TeamOutlined,
  TrophyFilled,
  UndoOutlined,
} from '@ant-design/icons';
import { Button, Card, Progress, Statistic, Tag } from 'antd';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { leaderboard, me, type EventItem, type Gift, type Transaction, type TransactionType } from '@shared/data';
import type { StringKey } from '@shared/strings';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Burst } from '../components/Burst';
import { Particles } from '../components/Particles';
import { useLab } from '../lab';
import { EASE, SPRING, rise, stagger } from '../motion';
import type { Dispatch, LabData } from '../store';

const page: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

const swap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: EASE },
} as const;

function DrawnCheck({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" className="ph-drawn-check">
      <motion.path d="M4.5 10.5l3.6 3.6 7.4-8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: EASE, delay: 0.05 }} />
    </svg>
  );
}

function SectionHead({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return (
    <div className="ph-section-head">
      <h2>
        {title}
        {count !== undefined && <span className="ph-count">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

function SeeAll() {
  const { tr } = useLab();
  return (
    <Button type="link" size="small" className="ph-see-all" icon={<RightOutlined />} iconPlacement="end">
      {tr('seeAll')}
    </Button>
  );
}

// ---------------------------------------------------------------------------------------------
// Hero

function Hero({ data }: { data: LabData }) {
  const { tr, num, season } = useLab();
  const remaining = Math.max(0, me.nextRewardAt - data.balance);
  const progress = Math.min(100, Math.round((data.balance / me.nextRewardAt) * 100));
  return (
    <motion.section className="ph-hero" variants={rise} aria-label={tr('balance')}>
      <div className="ph-hero-bg" aria-hidden="true">
        <svg className="ph-hero-rings" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="40" />
          <circle cx="100" cy="100" r="68" />
          <circle cx="100" cy="100" r="96" />
        </svg>
      </div>
      <Particles kind={season.particles} />
      <div className="ph-hero-body">
        <div className="ph-hero-top">
          <span className="ph-hero-label">{tr('balance')}</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={season.key} className="ph-hero-medal" aria-hidden="true" initial={{ opacity: 0, scale: 0.4, rotate: -30 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.4 }} transition={SPRING}>
              {season.emoji}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="ph-hero-balance">
          <AnimatedNumber value={data.balance} duration={1.2} />
          <span className="ph-hero-unit">{tr('pts')}</span>
        </div>
        <div className="ph-hero-progress">
          <Progress percent={progress} showInfo={false} status="normal" size={{ height: 8 }} strokeColor="#ffffff" railColor="rgba(255, 255, 255, 0.24)" aria-label={tr('nextReward', { count: num(remaining) })} />
          <div className="ph-hero-progress-text">
            <span>{tr('nextReward', { count: num(remaining) })}</span>
            <span className="ph-tabular">{tr('capacity', { count: num(data.balance), max: num(me.nextRewardAt) })}</span>
          </div>
        </div>
        <div className="ph-hero-stats">
          <Statistic title={tr('lifetimeEarned')} value={data.earned} formatter={(v) => <AnimatedNumber value={Number(v)} />} />
          <Statistic title={tr('lifetimeSpent')} value={data.spent} formatter={(v) => <AnimatedNumber value={Number(v)} />} />
        </div>
      </div>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------------------------
// Check-in call to action

type CtaPhase = 'idle' | 'scanning' | 'done';

function CheckInCta() {
  const { tr, palette } = useLab();
  const [phase, setPhase] = useState<CtaPhase>('idle');
  const [fire, setFire] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const run = () => {
    if (phase !== 'idle') return;
    setPhase('scanning');
    timers.current.push(
      window.setTimeout(() => {
        setPhase('done');
        setFire((n) => n + 1);
      }, 950),
      window.setTimeout(() => setPhase('idle'), 3100),
    );
  };

  return (
    <motion.div className="ph-cta" variants={rise}>
      <div className="ph-cta-button">
        <Button type="primary" size="large" block className={'ph-cta-btn is-' + phase} onClick={run} aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {phase === 'idle' && (
              <motion.span key="idle" className="ph-cta-label" {...swap}>
                <ScanOutlined />
                {tr('checkIn')}
              </motion.span>
            )}
            {phase === 'scanning' && (
              <motion.span key="scanning" className="ph-cta-label" {...swap}>
                <span className="ph-scan" aria-hidden="true">
                  <ScanOutlined />
                  <i />
                </span>
                {tr('checkIn')}
              </motion.span>
            )}
            {phase === 'done' && (
              <motion.span key="done" className="ph-cta-label" {...swap}>
                <DrawnCheck size={22} />
                {tr('checkedIn')}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
        {phase === 'done' && <motion.i className="ph-cta-ring" aria-hidden="true" initial={{ opacity: 0.55, scale: 0.96 }} animate={{ opacity: 0, scale: 1.08 }} transition={{ duration: 0.8, ease: 'easeOut' }} />}
        <Burst fire={fire} colors={[palette.accentGraphic, palette.primaryGraphic, palette.success, '#ffffff']} />
      </div>
      <p className="ph-cta-hint">{tr('scanToCheckIn')}</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------------------
// Events

function EventCard({ event, onCheckIn }: { event: EventItem; onCheckIn: () => void }) {
  const { tr, text, num, date, signed, palette } = useLab();
  const [fire, setFire] = useState(0);
  const open = event.status === 'open';
  const showFoot = open || event.capacity !== null || event.attendees > 0;
  return (
    <motion.li className={'ph-event' + (open ? ' is-open' : '')} variants={rise} whileHover={{ y: -2 }}>
      <span className="ph-emoji-tile ph-emoji-tile-lg" aria-hidden="true">
        {event.emoji}
      </span>
      <div className="ph-event-main">
        <div className="ph-event-title">
          <b>{text(event.title)}</b>
          <span className="ph-points">
            {signed(event.points)} {tr('pts')}
          </span>
        </div>
        <div className="ph-event-meta">
          <span>
            <ClockCircleOutlined /> {date(event.startsAt)}
          </span>
          <span>
            <EnvironmentOutlined /> {text(event.location)}
          </span>
        </div>
        {showFoot && <div className="ph-event-foot">
          {event.capacity ? (
            <span className="ph-event-capacity">
              <Progress percent={(event.attendees / event.capacity) * 100} showInfo={false} status="normal" size={{ height: 4 }} aria-label={tr('capacity', { count: event.attendees, max: event.capacity })} />
              <span className="ph-tabular">
                <TeamOutlined /> {tr('capacity', { count: num(event.attendees), max: num(event.capacity) })}
              </span>
            </span>
          ) : event.attendees > 0 ? (
            <span className="ph-event-capacity">
              <span className="ph-tabular">
                <TeamOutlined /> {tr('attendees', { count: num(event.attendees) })}
              </span>
            </span>
          ) : (
            <span />
          )}
          {open && (
            <span className="ph-event-action">
              <AnimatePresence mode="popLayout" initial={false}>
                {event.myCheckIn === 'none' && (
                  <motion.span key="none" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.18 }}>
                    <Button
                      type="primary"
                      icon={<ScanOutlined />}
                      onClick={() => {
                        setFire((n) => n + 1);
                        onCheckIn();
                      }}
                    >
                      {tr('checkIn')}
                    </Button>
                  </motion.span>
                )}
                {event.myCheckIn === 'pending' && (
                  <motion.span key="pending" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={SPRING}>
                    <Tag className="ph-state-tag" color="warning" variant="filled" icon={<ClockCircleOutlined />}>
                      {tr('waitingApproval')}
                    </Tag>
                  </motion.span>
                )}
                {event.myCheckIn === 'approved' && (
                  <motion.span key="approved" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={SPRING}>
                    <Tag className="ph-state-tag" color="success" variant="filled" icon={<CheckCircleFilled />}>
                      {tr('checkedIn')}
                    </Tag>
                  </motion.span>
                )}
              </AnimatePresence>
              <Burst fire={fire} colors={[palette.accentGraphic, palette.primaryGraphic, palette.success]} />
            </span>
          )}
        </div>}
      </div>
    </motion.li>
  );
}

function Events({ events, dispatch }: { events: EventItem[]; dispatch: Dispatch }) {
  const { tr } = useLab();
  const groups: { key: StringKey; items: EventItem[] }[] = [
    { key: 'openNow', items: events.filter((e) => e.status === 'open') },
    { key: 'upcoming', items: events.filter((e) => e.status === 'upcoming') },
  ];
  return (
    <motion.section className="ph-section" variants={rise} aria-labelledby="ph-events-h">
      <SectionHead title={tr('events')} action={<SeeAll />} />
      <span id="ph-events-h" className="ph-sr">
        {tr('events')}
      </span>
      <div className="ph-event-groups">
        {groups.map((group) => (
          <div key={group.key} className="ph-event-group">
            <h3 className={'ph-group-label' + (group.key === 'openNow' ? ' is-live' : '')}>
              {group.key === 'openNow' && <i className="ph-live" aria-hidden="true" />}
              {tr(group.key)}
              <span className="ph-count">{group.items.length}</span>
            </h3>
            <motion.ul className="ph-events" variants={stagger(0.06, 0.1)}>
              {group.items.map((event) => (
                <EventCard key={event.id} event={event} onCheckIn={() => dispatch({ type: 'checkIn', eventId: event.id })} />
              ))}
            </motion.ul>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------------------------
// Gifts

const TAG_KEY: Record<NonNullable<Gift['tag']>, StringKey> = { new: 'tagNew', popular: 'tagPopular', limited: 'tagLimited' };

function GiftCard({ gift, balance, onRedeem }: { gift: Gift; balance: number; onRedeem: () => void }) {
  const { tr, text, num, palette } = useLab();
  const [celebrating, setCelebrating] = useState(false);
  const [fire, setFire] = useState(0);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const out = gift.stock <= 0;
  const missing = gift.pointCost - balance;
  const affordable = missing <= 0;

  const redeem = () => {
    setCelebrating(true);
    setFire((n) => n + 1);
    onRedeem();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCelebrating(false), 1700);
  };

  let action: ReactNode;
  if (celebrating) {
    action = (
      <motion.div key="done" className="ph-gift-done" role="status" {...swap}>
        <DrawnCheck />
        {tr('redeemed')}
      </motion.div>
    );
  } else if (out) {
    action = (
      <motion.div key="out" className="ph-gift-note" {...swap}>
        {tr('outOfStock')}
      </motion.div>
    );
  } else if (!affordable) {
    action = (
      <motion.div key="need" className="ph-gift-need" {...swap}>
        <Progress percent={(balance / gift.pointCost) * 100} showInfo={false} status="normal" size={{ height: 4 }} aria-label={tr('notEnough', { count: num(missing) })} />
        <span>{tr('notEnough', { count: num(missing) })}</span>
      </motion.div>
    );
  } else {
    action = (
      <motion.div key="redeem" {...swap}>
        <Button type="primary" block icon={<GiftOutlined />} onClick={redeem} aria-label={`${tr('redeem')} – ${text(gift.name)}`}>
          {tr('redeem')}
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.li className="ph-gift-cell" variants={rise} whileHover={{ y: -3 }}>
      <Card
        className={'ph-gift' + (out && !celebrating ? ' is-out' : '')}
        size="small"
        cover={
          <div className="ph-gift-art">
            {gift.tag && (
              <Tag className="ph-gift-tag" variant="solid" color="var(--ph-primary)">
                {tr(TAG_KEY[gift.tag])}
              </Tag>
            )}
            <motion.span
              className="ph-gift-emoji"
              aria-hidden="true"
              animate={celebrating ? { y: [0, -16, 0], rotate: [0, -12, 10, 0], scale: [1, 1.25, 1] } : { y: 0, rotate: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              {gift.emoji}
            </motion.span>
          </div>
        }
      >
        <div className="ph-gift-body">
          <b className="ph-gift-name">{text(gift.name)}</b>
          <p className="ph-gift-desc">{text(gift.description)}</p>
          <div className="ph-gift-price">
            <span className="ph-gift-cost">
              <b className="ph-tabular">{num(gift.pointCost)}</b> {tr('pts')}
            </span>
            {!out && <span className="ph-muted ph-tabular">{tr('inStock', { count: num(gift.stock) })}</span>}
          </div>
          <div className="ph-gift-action">
            <AnimatePresence mode="wait" initial={false}>
              {action}
            </AnimatePresence>
            <Burst fire={fire} colors={[palette.accentGraphic, palette.primaryGraphic, palette.success, palette.warning]} />
          </div>
        </div>
      </Card>
    </motion.li>
  );
}

function Gifts({ data, dispatch }: { data: LabData; dispatch: Dispatch }) {
  const { tr } = useLab();
  return (
    <motion.section className="ph-section" variants={rise}>
      <SectionHead title={tr('gifts')} action={<SeeAll />} />
      <motion.ul className="ph-gifts" variants={stagger(0.05, 0.15)}>
        {data.gifts.map((gift) => (
          <GiftCard key={gift.id} gift={gift} balance={data.balance} onRedeem={() => dispatch({ type: 'redeem', giftId: gift.id, at: new Date().toISOString() })} />
        ))}
      </motion.ul>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------------------------
// Activity + leaderboard

const TYPE_ICON: Record<TransactionType, ReactNode> = {
  eventAward: <CalendarOutlined />,
  redemption: <GiftOutlined />,
  adjustment: <EditOutlined />,
  reversal: <UndoOutlined />,
  externalCredit: <ApiOutlined />,
  externalDebit: <ApiOutlined />,
};

function Activity({ items }: { items: Transaction[] }) {
  const { tr, text, date, signed } = useLab();
  return (
    <motion.div variants={rise}>
      <Card className="ph-card" size="small" title={<span className="ph-card-title">{tr('recentActivity')}</span>} extra={<SeeAll />}>
        <ul className="ph-activity">
          <AnimatePresence initial={false} mode="popLayout">
            {items.slice(0, 7).map((tx) => (
              <motion.li
                key={tx.id}
                layout="position"
                className="ph-activity-row"
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ layout: SPRING, default: { duration: 0.4, ease: EASE } }}
              >
                <span className={'ph-activity-icon ' + (tx.amount >= 0 ? 'is-plus' : 'is-minus')} aria-hidden="true">
                  {TYPE_ICON[tx.type]}
                </span>
                <div className="ph-activity-main">
                  <b className="ph-ellipsis">{text(tx.title)}</b>
                  <span className="ph-muted ph-ellipsis">
                    {tr(('type_' + tx.type) as StringKey)} · {date(tx.createdAt)}
                    {tx.source ? ` · ${tx.source}` : ''}
                  </span>
                </div>
                <span className={'ph-amount ' + (tx.amount >= 0 ? 'is-plus' : 'is-minus')}>{signed(tx.amount)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Card>
    </motion.div>
  );
}

function Leaderboard({ balance }: { balance: number }) {
  const { tr, num, text } = useLab();
  return (
    <motion.div variants={rise} layout="position" transition={{ layout: SPRING }}>
      <Card className="ph-card" size="small" title={<span className="ph-card-title">{tr('leaderboard')}</span>} extra={<SeeAll />}>
        <ol className="ph-board">
          {leaderboard.map((row) => (
            <li key={row.rank} className={'ph-board-row' + (row.rank === 1 ? ' is-first' : '')}>
              <span className="ph-board-rank">{row.rank === 1 ? <TrophyFilled /> : row.rank}</span>
              <span className="ph-ellipsis">{row.name}</span>
              <b className="ph-tabular">{num(row.points)}</b>
            </li>
          ))}
          <li className="ph-board-row is-me">
            <span className="ph-board-rank">{me.rank}</span>
            <span className="ph-board-me">
              <span className="ph-ellipsis">{text(me.displayName)}</span>
              <span className="ph-muted ph-ellipsis">{tr('rank', { rank: me.rank })}</span>
            </span>
            <b className="ph-tabular">
              <AnimatedNumber value={balance} />
            </b>
          </li>
        </ol>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------------------
// Page

export function EmployeeView({ data, dispatch }: { data: LabData; dispatch: Dispatch }) {
  const { tr, text } = useLab();
  return (
    <motion.main className="ph-emp" variants={page} initial="hidden" animate="show" exit="exit">
      <div className="ph-emp-a">
        <motion.div className="ph-greeting" variants={rise}>
          <h1>{tr('greeting', { name: text(me.displayName) })}</h1>
          <p className="ph-muted">
            {text(me.department)} · <span className="ph-mono">{me.employeeNo}</span>
          </p>
        </motion.div>
        <Hero data={data} />
        <CheckInCta />
      </div>
      <div className="ph-emp-b">
        <Events events={data.events} dispatch={dispatch} />
        <Gifts data={data} dispatch={dispatch} />
      </div>
      <div className="ph-emp-c">
        <Activity items={data.activity} />
        <Leaderboard balance={data.balance} />
      </div>
    </motion.main>
  );
}
