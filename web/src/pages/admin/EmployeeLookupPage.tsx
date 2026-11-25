import { Badge, Box, Button, Flex, Grid, Tag, Text } from '@chakra-ui/react';
import { ArrowLeft, CalendarCheck, ClipboardCheck, CreditCard, Minus, Plus, ReceiptText, TrendingDown, TrendingUp, UserSearch, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useEmployee } from '../../api/admin';
import { ApiError } from '../../api/client';
import type { EmployeeDetail } from '../../api/types';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { RoleBadges } from '../../components/badges';
import { ExportButton } from '../../components/ExportButton';
import { Page, PageHeader } from '../../components/Page';
import { EmptyState, ErrorBlock, LoadingBlock } from '../../components/states';
import { Coin, Eyebrow } from '../../components/ui/bits';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { SearchField } from '../../components/ui/SearchField';
import { SimpleTabs } from '../../components/ui/SimpleTabs';
import { useFormat } from '../../i18n/hooks';
import { LOCALE_LABELS } from '../../i18n/locale';
import { can } from '../../lib/roles';
import { useSession } from '../../lib/session';
import { readEnum, readPage, useUrlFilters, useUrlSearch } from '../../lib/urlFilters';
import { AttendanceTable } from './AttendanceTable';
import { ClaimsList } from './ClaimsList';
import { LedgerTable } from './LedgerTable';
import { TableBlock, Toolbar } from './parts';
import { PointsActionForm } from './PointsActionForm';

const PAGE_SIZE = 15;
const TABS = ['points', 'attendance', 'claims'] as const;
type TabKey = (typeof TABS)[number];
const EXPORTS: Record<TabKey, string> = {
  points: '/api/admin/transactions/export',
  attendance: '/api/admin/checkins/export',
  claims: '/api/admin/redemptions/export',
};

function BackLink() {
  const { t } = useTranslation();
  return (
    <Button asChild variant="ghost" size="xs" colorPalette="gray" alignSelf="flex-start" ms="-2">
      <Link to="/admin/employees">
        <ArrowLeft aria-hidden />
        {t('admin.lookup.back')}
      </Link>
    </Button>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box minW="0">
      <Eyebrow as="dt" display="block">
        {label}
      </Eyebrow>
      <Box as="dd" mt="1" fontWeight="semibold" lineHeight="1.4" wordBreak="break-word">
        {children}
      </Box>
    </Box>
  );
}

function Profile({ employee }: { employee: EmployeeDetail }) {
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <Panel padding={{ base: '4', md: '5' }}>
      <Grid as="dl" templateColumns={{ base: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }} columnGap="6" rowGap="4">
        <Fact label={t('admin.lookup.employeeNo')}>
          <Text as="span" fontVariantNumeric="tabular-nums">
            {employee.employeeNo}
          </Text>
        </Fact>
        <Fact label={t('admin.lookup.name')}>{employee.displayName}</Fact>
        <Fact label={t('admin.lookup.email')}>{employee.email}</Fact>
        <Fact label={t('admin.employees.columns.department')}>{employee.department ?? <Text color="fg.muted">–</Text>}</Fact>
        <Fact label={t('admin.lookup.status')}>
          <Flex gap="1.5" wrap="wrap">
            <Badge colorPalette={employee.isActive ? 'green' : 'gray'} variant={employee.isActive ? 'subtle' : 'solid'} px="2">
              {employee.isActive ? t('admin.lookup.active') : t('admin.employees.inactive')}
            </Badge>
            {employee.isProvisional && (
              <Badge colorPalette="orange" variant="subtle" px="2" title={t('admin.lookup.provisionalHelp')}>
                {t('admin.lookup.provisional')}
              </Badge>
            )}
          </Flex>
        </Fact>
        <Fact label={t('admin.employees.columns.roles')}>
          <RoleBadges roles={employee.roles} />
        </Fact>
        <Fact label={t('admin.employees.columns.cards')}>
          {employee.cards.length === 0 ? (
            <Text color="fg.muted" fontWeight="medium">
              {t('admin.employees.noCards')}
            </Text>
          ) : (
            <Flex gap="1.5" wrap="wrap">
              {employee.cards.map((card) => (
                <Tag.Root key={card.id} size="md" colorPalette="gray" variant="surface" borderRadius="full" opacity={card.isActive ? 1 : 0.55}>
                  <Tag.StartElement>
                    <CreditCard size={12} strokeWidth={2.5} aria-hidden />
                  </Tag.StartElement>
                  <Tag.Label fontWeight="semibold" fontVariantNumeric="tabular-nums" textDecoration={card.isActive ? undefined : 'line-through'}>
                    {card.label ? `${card.label} · ${card.uid}` : card.uid}
                  </Tag.Label>
                </Tag.Root>
              ))}
            </Flex>
          )}
        </Fact>
        <Fact label={t('admin.lookup.since')}>
          {format.dateTime(employee.createdAt)}
          {employee.preferredLocale && (
            <Text as="span" color="fg.muted" fontWeight="medium">
              {' · '}
              {LOCALE_LABELS[employee.preferredLocale]}
            </Text>
          )}
        </Fact>
      </Grid>
    </Panel>
  );
}

interface TotalProps {
  label: string;
  value: number;
  icon?: LucideIcon;
  /** The balance: the coin instead of an icon, and red when it is below zero. */
  balance?: boolean;
  /** Where the tile sits in the 2 / 6 / 5-column grid. */
  span: { base: string; md: string; xl: string };
}

function Total({ label, value, icon: Icon, balance, span }: TotalProps) {
  return (
    <Box gridColumn={span} minW="0">
      <Panel padding="4" gap="1.5" h="full" borderColor={balance ? 'brand.muted' : undefined} bg={balance ? 'brand.subtle' : undefined}>
        <Flex align="center" gap="2" color="fg.muted">
          {balance ? <Coin size={18} /> : Icon && <Icon size={16} strokeWidth={2.5} aria-hidden />}
          <Eyebrow>{label}</Eyebrow>
        </Flex>
        <Text fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="black" lineHeight="1.1" letterSpacing="-0.02em" color={balance && value < 0 ? 'loss' : undefined}>
          <AnimatedNumber value={value} from={value} />
        </Text>
      </Panel>
    </Box>
  );
}

function Totals({ employee }: { employee: EmployeeDetail }) {
  const { t } = useTranslation();
  const third = { base: 'span 1', md: 'span 2', xl: 'span 1' };
  const half = { base: 'span 1', md: 'span 3', xl: 'span 1' };
  return (
    <Grid templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(6, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' }} gap={{ base: '3', md: '4' }}>
      <Total label={t('admin.lookup.balance')} value={employee.balance} balance span={{ base: 'span 2', md: 'span 2', xl: 'span 1' }} />
      <Total label={t('admin.lookup.lifetimeEarned')} value={employee.lifetimeEarned} icon={TrendingUp} span={third} />
      <Total label={t('admin.lookup.lifetimeSpent')} value={employee.lifetimeSpent} icon={TrendingDown} span={third} />
      <Total label={t('admin.lookup.checkIns')} value={employee.checkInCount} icon={CalendarCheck} span={half} />
      <Total label={t('admin.lookup.claims')} value={employee.claimCount} icon={ClipboardCheck} span={half} />
    </Grid>
  );
}

/** One of the three lists of a person: its own search box and Export CSV above the shared table. */
function PersonList({ tab, employeeId }: { tab: TabKey; employeeId: number }) {
  const { t } = useTranslation();
  const { params, patch } = useUrlFilters();
  const search = useUrlSearch('q');
  const page = readPage(params);
  const onPage = (next: number) => patch({ page: next === 1 ? null : next });
  const emptyMessage = search.q !== '' ? t('filters.noMatch', { q: search.q }) : t(`admin.lookup.empty.${tab}`);
  const filters = { employeeId, q: search.q };

  return (
    <TableBlock>
      <Toolbar actions={<ExportButton path={EXPORTS[tab]} filters={filters} />}>
        <SearchField flex="1 1 240px" minW="0" maxW={{ md: '420px' }} label={t(`admin.lookup.search.${tab}`)} value={search.text} onChange={search.onChange} />
      </Toolbar>
      {tab === 'points' && (
        <LedgerTable filters={{ ...filters, eventId: null, type: null, from: '', to: '' }} page={page} pageSize={PAGE_SIZE} onPage={onPage} showEmployee={false} emptyMessage={emptyMessage} />
      )}
      {tab === 'attendance' && (
        <AttendanceTable filters={{ ...filters, eventId: null, status: null, from: '', to: '' }} page={page} pageSize={PAGE_SIZE} onPage={onPage} showEmployee={false} emptyMessage={emptyMessage} />
      )}
      {tab === 'claims' && (
        <ClaimsList filters={{ ...filters, status: null, giftId: null, from: '', to: '' }} page={page} pageSize={PAGE_SIZE} onPage={onPage} showEmployee={false} emptyMessage={emptyMessage} />
      )}
    </TableBlock>
  );
}

/**
 * Everything about one person on one page: profile, totals, and their point history, attendance and claims
 * (the three admin lists filtered by `employeeId`). System admins award and deduct points here; auditors get
 * the same page without those two buttons. The open tab, its search and its page live in the URL.
 */
export function EmployeeLookupPage() {
  const { t } = useTranslation();
  const me = useSession();
  const { id: idParam } = useParams();
  const id = /^[1-9]\d*$/.test(idParam ?? '') ? Number(idParam) : null;
  const employee = useEmployee(id);
  const { params, patch } = useUrlFilters();
  const tab = readEnum(params, 'tab', TABS) ?? 'points';
  // `mode` outlives `open`, so the dialog keeps its title while it closes.
  const [action, setAction] = useState<{ mode: 'award' | 'deduct'; open: boolean }>({ mode: 'award', open: false });

  const missing = id === null || (employee.error instanceof ApiError && employee.error.status === 404);
  if (missing) {
    return (
      <Page>
        <BackLink />
        <EmptyState message={t('admin.lookup.notFound')} icon={<UserSearch size={26} strokeWidth={2.2} aria-hidden />}>
          <Button asChild variant="outline">
            <Link to="/admin/employees">{t('admin.lookup.backToList')}</Link>
          </Button>
        </EmptyState>
      </Page>
    );
  }
  if (employee.isPending) return <LoadingBlock />;
  if (!employee.data) {
    return (
      <Page>
        <BackLink />
        <ErrorBlock error={employee.error} onRetry={() => void employee.refetch()} />
      </Page>
    );
  }

  const person = employee.data;
  const icons: Record<TabKey, ReactNode> = {
    points: <ReceiptText size={16} strokeWidth={2.5} aria-hidden />,
    attendance: <CalendarCheck size={16} strokeWidth={2.5} aria-hidden />,
    claims: <ClipboardCheck size={16} strokeWidth={2.5} aria-hidden />,
  };

  return (
    <Page>
      <Flex direction="column" gap="2">
        <BackLink />
        <PageHeader
          title={person.displayName}
          subtitle={[person.employeeNo, person.department].filter(Boolean).join(' · ')}
          actions={
            can.admin(me) && (
              <>
                <Button onClick={() => setAction({ mode: 'award', open: true })}>
                  <Plus aria-hidden />
                  {t('admin.lookup.award')}
                </Button>
                <Button variant="outline" colorPalette="red" onClick={() => setAction({ mode: 'deduct', open: true })}>
                  <Minus aria-hidden />
                  {t('admin.lookup.deduct')}
                </Button>
              </>
            )
          }
        />
      </Flex>

      <Flex direction="column" gap={{ base: '3', md: '4' }}>
        <Totals employee={person} />
        <Profile employee={person} />
      </Flex>

      <SimpleTabs
        value={tab}
        // Each list has its own search: a term typed for one of them does not follow to the next.
        onChange={(next) => patch({ tab: next === 'points' ? null : next, q: null })}
        tabs={TABS.map((value) => ({
          value,
          label: t(`admin.lookup.tab.${value}`),
          icon: icons[value],
          content: <PersonList tab={value} employeeId={person.id} />,
        }))}
      />

      <Modal opened={action.open} onClose={() => setAction({ ...action, open: false })} title={action.mode === 'deduct' ? t('admin.lookup.deductTitle') : t('admin.lookup.awardTitle')}>
        <PointsActionForm employee={person} mode={action.mode} onDone={() => setAction({ ...action, open: false })} />
      </Modal>
    </Page>
  );
}
