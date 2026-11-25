import { Badge, Flex, Text } from '@chakra-ui/react';
import { CalendarCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCheckIns, type CheckInFilters } from '../../api/admin';
import type { CheckIn } from '../../api/types';
import { CheckInMethodBadge, CheckInStatusBadge } from '../../components/badges';
import { Pager } from '../../components/states';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useFormat, useLocalized } from '../../i18n/hooks';
import { EmployeeLink, LinkButton, TwoLine } from './parts';

interface AttendanceTableProps {
  filters: CheckInFilters;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  /** `false` on a page that is about one person already (the lookup page). */
  showEmployee?: boolean;
  /** Makes the event title a "show only this event" filter. */
  onFilterEvent?: (eventId: number) => void;
  emptyMessage: string;
}

/**
 * Check-ins as a read-only table with its pager: the attendance page and the attendance tab of the lookup
 * page. Approving and rejecting stay with the event's own page.
 */
export function AttendanceTable({ filters, page, pageSize, onPage, showEmployee = true, onFilterEvent, emptyMessage }: AttendanceTableProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const checkIns = useCheckIns(filters, page, pageSize);

  const columns: Column<CheckIn>[] = [
    {
      key: 'when',
      header: t('admin.attendance.columns.checkedIn'),
      shrink: true,
      numeric: true,
      cell: (row) => <TwoLine strong={false} primary={format.dateTime(row.checkedInAt)} secondary={`#${row.id}`} />,
    },
    ...(showEmployee
      ? [
          {
            key: 'employee',
            header: t('admin.attendance.columns.employee'),
            cell: (row) => (
              <TwoLine primary={<EmployeeLink id={row.employeeId}>{row.employeeName}</EmployeeLink>} secondary={row.department ? `${row.employeeNo} · ${row.department}` : row.employeeNo} />
            ),
          } satisfies Column<CheckIn>,
        ]
      : []),
    {
      key: 'event',
      header: t('admin.attendance.columns.event'),
      cell: (row) =>
        onFilterEvent ? (
          <LinkButton fontWeight="semibold" title={t('admin.ledger.filterByEvent')} onClick={() => onFilterEvent(row.eventId)}>
            {localized(row.eventTitle)}
          </LinkButton>
        ) : (
          <Text fontWeight="semibold" lineHeight="1.35">
            {localized(row.eventTitle)}
          </Text>
        ),
    },
    {
      key: 'status',
      header: t('admin.attendance.columns.status'),
      cell: (row) => (
        <Flex direction="column" align="flex-start" gap="1">
          <CheckInStatusBadge value={row.status} />
          {row.note && (
            <Text fontSize="xs" color="fg.muted" fontWeight="medium" lineHeight="1.4" maxW="56" wordBreak="break-word">
              {row.note}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      key: 'method',
      header: t('admin.attendance.columns.method'),
      cell: (row) => (
        <Flex align="center" gap="1.5" wrap="wrap">
          <CheckInMethodBadge value={row.method} />
          {row.onRoster && (
            <Badge colorPalette="brand" variant="subtle" px="2" whiteSpace="nowrap">
              {t('host.approvals.onRoster')}
            </Badge>
          )}
        </Flex>
      ),
    },
    {
      key: 'points',
      header: t('admin.attendance.columns.points'),
      align: 'end',
      numeric: true,
      // Points only reach the balance once the check-in is approved: say so with the colour, never with it alone.
      cell: (row) => (
        <Text as="span" fontWeight="black" color={row.status === 'approved' ? 'gain' : 'fg.muted'} textDecoration={row.status === 'rejected' || row.status === 'reverted' ? 'line-through' : undefined} whiteSpace="nowrap">
          {format.signed(row.points)}
        </Text>
      ),
    },
    {
      key: 'decided',
      header: t('admin.attendance.columns.decided'),
      cell: (row) =>
        row.decidedAt ? (
          <TwoLine strong={false} primary={row.decidedByName ?? t('admin.audit.system')} secondary={format.dateTime(row.decidedAt)} />
        ) : (
          <Text color="fg.muted">–</Text>
        ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={checkIns.data?.items}
        rowKey={(row) => row.id}
        minWidth={showEmployee ? 920 : 760}
        loading={checkIns.isPending}
        error={checkIns.error}
        onRetry={() => void checkIns.refetch()}
        stale={checkIns.isPlaceholderData}
        emptyMessage={emptyMessage}
        emptyIcon={<CalendarCheck size={26} strokeWidth={2.2} aria-hidden />}
      />
      {checkIns.data && checkIns.data.total > 0 && <Pager page={page} pageSize={pageSize} total={checkIns.data.total} onChange={onPage} />}
    </>
  );
}
