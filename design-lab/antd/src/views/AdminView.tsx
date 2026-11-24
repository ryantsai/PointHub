import { Children, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import {
  ApiOutlined,
  ArrowDownOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CloseOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  GiftOutlined,
  KeyOutlined,
  PlusOutlined,
  ProfileOutlined,
  QrcodeOutlined,
  SearchOutlined,
  TeamOutlined,
  UndoOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { Avatar, Badge, Button, Card, Input, Layout, Menu, Popconfirm, Progress, Statistic, Table, Tag, Tooltip, type MenuProps, type TableColumnsType } from 'antd';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type HTMLMotionProps, type Variants } from 'motion/react';
import { kpis, me, type Gift, type PendingCheckIn, type TransactionType } from '@shared/data';
import type { StringKey } from '@shared/strings';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Sparkline, TrendChart } from '../components/TrendChart';
import { useLab } from '../lab';
import { EASE, SPRING, rise, stagger } from '../motion';
import type { Dispatch, LabData, LedgerRow } from '../store';
import { useMedia } from '../useMedia';

const LOW_STOCK = 10;
/** Rows created in this session get ids above the seed data (see store.ts). */
const SEED_MAX_ID = 9200;
const now = () => new Date().toISOString();

const page: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

// ---------------------------------------------------------------------------------------------
// Navigation

type NavKey = 'dashboard' | 'approvals' | 'ledger' | 'giftsAdmin' | 'employees' | 'apiKeys';
const NAV: { key: NavKey; icon: ReactNode; anchor?: string }[] = [
  { key: 'dashboard', icon: <DashboardOutlined />, anchor: 'ph-top' },
  { key: 'approvals', icon: <AuditOutlined />, anchor: 'ph-approvals' },
  { key: 'ledger', icon: <ProfileOutlined />, anchor: 'ph-ledger' },
  { key: 'giftsAdmin', icon: <GiftOutlined />, anchor: 'ph-stock' },
  { key: 'employees', icon: <TeamOutlined /> },
  { key: 'apiKeys', icon: <KeyOutlined /> },
];

function useNav(pendingCount: number, compact: boolean) {
  const { tr } = useLab();
  const reduce = useReducedMotion();
  const items: MenuProps['items'] = NAV.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: tr(item.key),
    extra:
      item.key === 'approvals' && pendingCount > 0 && !compact ? (
        <Badge count={pendingCount} size="small" color="var(--ph-primary)" />
      ) : undefined,
  }));
  const onClick: MenuProps['onClick'] = ({ key }) => {
    const anchor = NAV.find((item) => item.key === key)?.anchor;
    if (!anchor) return;
    document.getElementById(anchor)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  return { items, onClick };
}

// ---------------------------------------------------------------------------------------------
// KPI strip

function Kpi({ label, value, suffix, aside, children }: { label: string; value: number; suffix?: string; aside?: ReactNode; children?: ReactNode }) {
  return (
    <motion.div className="ph-kpi" variants={rise}>
      <div className="ph-kpi-top">
        <Statistic title={label} value={value} formatter={(v) => <AnimatedNumber value={Number(v)} suffix={suffix} />} />
        {aside}
      </div>
      <div className="ph-kpi-foot">{children}</div>
    </motion.div>
  );
}

function Delta({ value }: { value: number }) {
  const { percent, tr, locale } = useLab();
  const up = value >= 0;
  return (
    <span className={'ph-delta-wrap' + (locale === 'en' ? '' : ' is-label-first')}>
      <span className={'ph-delta ' + (up ? 'is-up' : 'is-down')}>
        {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        {percent(value)}
      </span>
      <span className="ph-muted">{tr('vsLastMonth')}</span>
    </span>
  );
}

function KpiStrip({ data }: { data: LabData }) {
  const { tr, num } = useLab();
  const reduce = useReducedMotion();
  const toApprovals = () => {
    document.getElementById('ph-approvals')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  const participation = Math.round((kpis.activeParticipants / kpis.totalEmployees) * 100);
  const pending = data.pending.length;
  return (
    <motion.section className="ph-kpis" variants={stagger(0.06, 0)} aria-label={tr('dashboard')}>
      <Kpi label={tr('issuedThisMonth')} value={data.issued} aside={<Sparkline data={kpis.issuedByWeek} tone="primary" />}>
        <Delta value={kpis.pointsIssuedDelta} />
      </Kpi>
      <Kpi label={tr('redeemedThisMonth')} value={data.redeemed} aside={<Sparkline data={kpis.redeemedByWeek} tone="accent" />}>
        <Delta value={kpis.pointsRedeemedDelta} />
      </Kpi>
      <Kpi label={tr('participation')} value={participation} suffix="%">
        <Progress percent={participation} showInfo={false} status="normal" size={{ height: 6 }} aria-label={tr('participation')} />
        <span className="ph-muted ph-tabular">{tr('capacity', { count: num(kpis.activeParticipants), max: num(kpis.totalEmployees) })}</span>
      </Kpi>
      <Kpi label={tr('outstanding')} value={data.outstanding}>
        <span className="ph-muted">{tr('points')}</span>
      </Kpi>
      <Kpi label={tr('pendingApprovals')} value={pending}>
        {pending > 0 ? (
          <button type="button" className="ph-kpi-link" onClick={toApprovals}>
            <i className="ph-live" aria-hidden="true" />
            {tr('approvals')}
            <ArrowRightOutlined />
          </button>
        ) : (
          <span className="ph-ok">
            <CheckCircleFilled /> {tr('allCaughtUp')}
          </span>
        )}
      </Kpi>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------------------------
// Pending approvals

type ExitPlan = Map<number, { dir: 1 | -1; order: number }>;

const approvalVariants = (id: number): Variants => ({
  hidden: { opacity: 0, x: 12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } },
  exit: (plan: ExitPlan) => {
    const { dir = 1, order = 0 } = plan.get(id) ?? {};
    return { opacity: 0, x: dir * 36, scale: 0.98, transition: { duration: 0.26, ease: 'easeIn', delay: order * 0.05 } };
  },
});

function ApprovalRow({ item, plan, onApprove, onReject }: { item: PendingCheckIn; plan: ExitPlan; onApprove: () => void; onReject: () => void }) {
  const { tr, text, signed, date } = useLab();
  const name = text(item.employeeName);
  return (
    <motion.li className="ph-approval" layout="position" variants={approvalVariants(item.id)} custom={plan} exit="exit" transition={{ layout: SPRING }}>
      <Avatar size={34} className="ph-avatar">
        {name.slice(0, 1)}
      </Avatar>
      <div className="ph-approval-main">
        <div className="ph-approval-who">
          <b>{name}</b>
          <span className="ph-mono">{item.employeeNo}</span>
          <span className="ph-muted ph-ellipsis">{text(item.department)}</span>
        </div>
        <div className="ph-approval-what">
          <span className="ph-ellipsis">{text(item.eventTitle)}</span>
          <span className="ph-points">
            {signed(item.points)} {tr('pts')}
          </span>
        </div>
      </div>
      <div className="ph-approval-meta">
        <Tag color={item.onRoster ? undefined : 'warning'} variant="filled">
          {item.onRoster ? tr('onRoster') : tr('walkIn')}
        </Tag>
        <Tooltip title={date(item.checkedInAt)}>
          <span className="ph-method" tabIndex={0}>
            {item.method === 'card' ? <CreditCardOutlined /> : <QrcodeOutlined />}
            {item.method === 'card' ? tr('byCard') : tr('byLink')}
          </span>
        </Tooltip>
      </div>
      <div className="ph-approval-actions">
        <Tooltip title={tr('approve')}>
          <Button type="primary" size="small" icon={<CheckOutlined />} aria-label={`${tr('approve')} – ${name}`} onClick={onApprove} />
        </Tooltip>
        <Tooltip title={tr('reject')}>
          <Button danger type="text" size="small" icon={<CloseOutlined />} aria-label={`${tr('reject')} – ${name}`} onClick={onReject} />
        </Tooltip>
      </div>
    </motion.li>
  );
}

function Approvals({ pending, dispatch }: { pending: PendingCheckIn[]; dispatch: Dispatch }) {
  const { tr } = useLab();
  const plan = useRef<ExitPlan>(new Map()).current;

  const approve = (ids: number[]) => {
    ids.forEach((id, order) => plan.set(id, { dir: 1, order }));
    dispatch({ type: 'approve', ids, at: now() });
  };
  const reject = (id: number) => {
    plan.set(id, { dir: -1, order: 0 });
    dispatch({ type: 'reject', id });
  };

  return (
    <Card
      id="ph-approvals"
      className="ph-card ph-card-approvals"
      size="small"
      title={
        <span className="ph-card-title">
          {tr('pendingApprovals')}
          <Badge count={pending.length} showZero={false} color="var(--ph-primary)" />
        </span>
      }
      extra={
        <Button size="small" color="primary" variant="filled" icon={<CheckOutlined />} disabled={pending.length === 0} onClick={() => approve(pending.map((p) => p.id))}>
          {tr('approveAll')}
        </Button>
      }
    >
      <motion.ul className="ph-approvals" variants={stagger(0.05, 0.1)} aria-label={tr('pendingApprovals')}>
        <AnimatePresence mode="popLayout" custom={plan}>
          {pending.map((item) => (
            <ApprovalRow key={item.id} item={item} plan={plan} onApprove={() => approve([item.id])} onReject={() => reject(item.id)} />
          ))}
        </AnimatePresence>
      </motion.ul>
      <AnimatePresence>
        {pending.length === 0 && (
          <motion.div
            className="ph-empty"
            role="status"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.25 }}
          >
            <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
              <motion.circle cx="28" cy="28" r="25" className="ph-empty-ring" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: 0.3, ease: EASE }} />
              <motion.path d="M18 29l7 7 14-15" className="ph-empty-check" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.75, ease: EASE }} />
            </svg>
            <span>{tr('allCaughtUp')}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Ledger

const TYPE_TONE: Record<TransactionType, string> = {
  eventAward: 'primary',
  redemption: 'accent',
  adjustment: 'neutral',
  reversal: 'error',
  externalCredit: 'primary',
  externalDebit: 'accent',
};

export function TypeTag({ type }: { type: TransactionType }) {
  const { tr } = useLab();
  const external = type === 'externalCredit' || type === 'externalDebit';
  return (
    <Tag className="ph-type-tag" variant="outlined">
      {external ? <ApiOutlined className={'ph-type-icon is-' + TYPE_TONE[type]} /> : <i className={'ph-dot ph-dot-' + TYPE_TONE[type]} />}
      {tr(('type_' + type) as StringKey)}
    </Tag>
  );
}

// Table body pieces: antd's Table renders plain <tr>s, so rows are swapped for motion rows inside an
// AnimatePresence. `layout="position"` slides the existing rows down when a reversal is inserted on top.
function LedgerBody({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody {...rest}>
      {/* LayoutGroup: when a row finishes its exit, the remaining rows re-measure and glide up. */}
      <LayoutGroup>
        <AnimatePresence initial={false}>{Children.toArray(children)}</AnimatePresence>
      </LayoutGroup>
    </tbody>
  );
}

function LedgerTr({ children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <motion.tr
      {...(rest as HTMLMotionProps<'tr'>)}
      layout="position"
      initial={{ opacity: 0, y: -22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.14 } }}
      transition={{ layout: SPRING, y: SPRING, opacity: { duration: 0.35 } }}
    >
      {children}
    </motion.tr>
  );
}

const ledgerComponents = { body: { wrapper: LedgerBody, row: LedgerTr } };

function Ledger({ rows, dispatch, stickyOffset }: { rows: LedgerRow[]; dispatch: Dispatch; stickyOffset: number }) {
  const { tr, text, signed, date } = useLab();
  const [query, setQuery] = useState('');
  const phone = useMedia('(max-width: 575.98px)');

  const nameOf = (row: LedgerRow) => (row.nameL ? text(row.nameL) : row.employeeName);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const names = row.nameL ? [row.nameL.en, row.nameL.ja, row.nameL.zhHant] : [row.employeeName];
      return [...names, row.employeeNo].some((value) => value.toLowerCase().includes(q));
    });
  }, [rows, query]);

  const columns: TableColumnsType<LedgerRow> = [
    {
      title: tr('colEmployee'),
      key: 'employee',
      width: phone ? undefined : '19%',
      render: (_, row) => (
        <div className="ph-cell-employee">
          <b>{nameOf(row)}</b>
          <span className="ph-mono">{row.employeeNo}</span>
        </div>
      ),
    },
    { title: tr('colType'), key: 'type', width: 150, responsive: ['sm'], render: (_, row) => <TypeTag type={row.type} /> },
    {
      title: tr('colDescription'),
      key: 'description',
      render: (_, row) => (
        <div className="ph-cell-desc">
          <span>{text(row.title)}</span>
          {row.source && (
            <span className="ph-source">
              <ApiOutlined /> {row.source}
            </span>
          )}
        </div>
      ),
    },
    {
      title: tr('colAmount'),
      key: 'amount',
      align: 'right',
      width: phone ? undefined : 104,
      render: (_, row) => <span className={'ph-amount ' + (row.amount >= 0 ? 'is-plus' : 'is-minus')}>{signed(row.amount)}</span>,
    },
    { title: tr('colDate'), key: 'date', width: 170, responsive: ['md'], render: (_, row) => <span className="ph-date">{date(row.createdAt)}</span> },
    {
      title: <span className="ph-sr">{tr('revert')}</span>,
      key: 'action',
      align: 'right',
      width: phone ? 56 : 124,
      render: (_, row) => {
        if (row.reverted) return <Tag variant="filled">{tr('reverted')}</Tag>;
        if (row.type === 'reversal') return null;
        return (
          <Popconfirm
            title={tr('revert')}
            description={`${nameOf(row)} · ${signed(row.amount)} ${tr('pts')}`}
            okButtonProps={{ danger: true }}
            placement="topRight"
            onConfirm={() => dispatch({ type: 'revert', txId: row.id, at: now() })}
          >
            <Button type="text" size="small" icon={<UndoOutlined />} aria-label={`${tr('revert')} – ${nameOf(row)} ${signed(row.amount)}`}>
              {phone ? null : tr('revert')}
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <Card
      id="ph-ledger"
      className="ph-card ph-card-ledger"
      size="small"
      title={<span className="ph-card-title">{tr('ledger')}</span>}
      extra={
        <Input
          className="ph-search"
          size="small"
          allowClear
          prefix={<SearchOutlined />}
          placeholder={tr('search')}
          aria-label={tr('search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      }
    >
      <Table<LedgerRow>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={visible}
        pagination={false}
        sticky={{ offsetHeader: stickyOffset }}
        scroll={phone ? { x: 'max-content' } : undefined}
        components={ledgerComponents}
        rowClassName={(row) =>
          (row.reverted ? 'ph-row-reverted ' : '') + (row.id > SEED_MAX_ID && Date.now() - Date.parse(row.createdAt) < 2500 ? 'ph-row-fresh' : '')
        }
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Gift stock

function Stock({ gifts }: { gifts: Gift[] }) {
  const { tr, text, num } = useLab();
  const sorted = useMemo(() => [...gifts].sort((a, b) => a.stock - b.stock || a.id - b.id), [gifts]);
  return (
    <Card id="ph-stock" className="ph-card ph-card-stock" size="small" title={<span className="ph-card-title">{tr('giftsAdmin')}</span>}>
      <ul className="ph-stock" aria-label={tr('giftsAdmin')}>
        {sorted.map((gift) => {
          const out = gift.stock === 0;
          const low = !out && gift.stock <= LOW_STOCK;
          return (
            <motion.li key={gift.id} layout="position" transition={{ layout: SPRING }} className={'ph-stock-row' + (out ? ' is-out' : low ? ' is-low' : '')}>
              <span className="ph-emoji-tile" aria-hidden="true">
                {gift.emoji}
              </span>
              <div className="ph-stock-main">
                <b className="ph-ellipsis">{text(gift.name)}</b>
                <span className="ph-muted ph-tabular">
                  {tr('colCost')} · {num(gift.pointCost)} {tr('pts')}
                </span>
              </div>
              <div className="ph-stock-level">
                {out ? (
                  <Tag color="error" variant="filled">
                    {tr('outOfStock')}
                  </Tag>
                ) : (
                  <>
                    <span className="ph-stock-count">
                      {low && <WarningFilled />}
                      <span className="ph-muted">{tr('colStock')}</span>
                      <b className="ph-tabular">{num(gift.stock)}</b>
                    </span>
                    <Progress
                      percent={Math.min(100, (gift.stock / 50) * 100)}
                      showInfo={false} status="normal"
                      size={{ height: 4 }}
                      strokeColor={low ? 'var(--ph-warning)' : undefined}
                      aria-label={`${text(gift.name)} – ${tr('colStock')}`}
                    />
                  </>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Page

export function AdminView({ data, dispatch }: { data: LabData; dispatch: Dispatch }) {
  const { tr, text } = useLab();
  const wide = useMedia('(min-width: 992px)');
  const tablet = useMedia('(min-width: 768px)');
  const nav = useNav(data.pending.length, !wide);
  const myName = text(me.displayName);

  return (
    <motion.div className="ph-admin" variants={page} initial="hidden" animate="show" exit="exit">
      <Layout hasSider={tablet} className="ph-admin-layout">
        {tablet ? (
          <Layout.Sider className="ph-sider" width={220} collapsedWidth={64} collapsed={!wide} trigger={null} theme="light">
            <motion.div className="ph-sider-inner" variants={{ hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } } }}>
              <Menu mode="inline" selectedKeys={['dashboard']} items={nav.items} onClick={nav.onClick} inlineCollapsed={!wide} aria-label={tr('appName')} />
              <div className="ph-sider-me">
                <Avatar size={32} className="ph-avatar">
                  {myName.slice(0, 1)}
                </Avatar>
                {wide && (
                  <div className="ph-sider-me-text">
                    <b className="ph-ellipsis">{myName}</b>
                    <span className="ph-muted ph-ellipsis">{text(me.department)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </Layout.Sider>
        ) : (
          <motion.div className="ph-topnav" variants={rise}>
            <Menu mode="horizontal" selectedKeys={['dashboard']} items={nav.items} onClick={nav.onClick} aria-label={tr('appName')} />
          </motion.div>
        )}

        <Layout.Content className="ph-admin-content" id="ph-top">
          <motion.div className="ph-page-head" variants={rise}>
            <h1>{tr('dashboard')}</h1>
            <Button type="primary" icon={<PlusOutlined />}>
              {tr('adjustPoints')}
            </Button>
          </motion.div>

          <KpiStrip data={data} />

          <div className="ph-admin-row ph-admin-row-a">
            <motion.div variants={rise} className="ph-grid-cell">
              <Card
                className="ph-card ph-card-chart"
                size="small"
                title={<span className="ph-card-title">{tr('issuedVsRedeemed')}</span>}
                extra={
                  <span className="ph-legend">
                    <span>
                      <i className="ph-dot ph-dot-primary" />
                      {tr('issued')}
                    </span>
                    <span>
                      <i className="ph-dot ph-dot-accent" />
                      {tr('redeemedSeries')}
                    </span>
                  </span>
                }
              >
                <TrendChart issued={kpis.issuedByWeek} redeemed={kpis.redeemedByWeek} title={tr('issuedVsRedeemed')} />
              </Card>
            </motion.div>
            <motion.div variants={rise} className="ph-grid-cell">
              <Approvals pending={data.pending} dispatch={dispatch} />
            </motion.div>
          </div>

          {/* layout="position": when the queue or the ledger changes height, the cards below glide instead of jumping. */}
          <div className="ph-admin-row ph-admin-row-b">
            <motion.div variants={rise} layout="position" transition={{ layout: SPRING }} className="ph-grid-cell">
              <Ledger rows={data.ledger} dispatch={dispatch} stickyOffset={tablet ? 56 : 0} />
            </motion.div>
            <motion.div variants={rise} layout="position" transition={{ layout: SPRING }} className="ph-grid-cell">
              <Stock gifts={data.gifts} />
            </motion.div>
          </div>
        </Layout.Content>
      </Layout>
    </motion.div>
  );
}
