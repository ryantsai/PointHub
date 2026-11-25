import { Box } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useCheckIns, useEmployee, type CheckInFilters } from '../../api/admin';
import { useLocalized } from '../../i18n/hooks';
import type { CheckInStatus } from '../../api/types';
import { ExportButton } from '../../components/ExportButton';
import { Page } from '../../components/Page';
import { DateRange } from '../../components/ui/DateRange';
import { SelectField } from '../../components/ui/fields';
import { SearchField } from '../../components/ui/SearchField';
import { readDate, readEnum, readId, readPage, useUrlFilters, useUrlSearch } from '../../lib/urlFilters';
import { AttendanceTable } from './AttendanceTable';
import { ClearFilters, FilterChip, TableBlock, Toolbar } from './parts';

const PAGE_SIZE = 25;
const STATUSES: CheckInStatus[] = ['pending', 'approved', 'rejected', 'reverted'];

/**
 * Who checked in where, across all events, newest first. Read-only (system admins and auditors); check-ins
 * are approved on the event's own page. Filters live in the URL and "Export CSV" downloads the filtered list.
 */
export function AttendancePage() {
  const { t } = useTranslation();
  const { params, patch } = useUrlFilters();
  const search = useUrlSearch('q');
  const filters: CheckInFilters = {
    employeeId: readId(params, 'employeeId'),
    eventId: readId(params, 'eventId'),
    status: readEnum(params, 'status', STATUSES),
    q: search.q,
    from: readDate(params, 'from'),
    to: readDate(params, 'to'),
  };
  const page = readPage(params);
  const employee = useEmployee(filters.employeeId);
  // The chip of an event filter takes the title from the rows on screen (the same cached query the table uses).
  const localized = useLocalized();
  const rows = useCheckIns(filters, page, PAGE_SIZE);
  const eventTitle = rows.data?.items.find((row) => row.eventId === filters.eventId)?.eventTitle;
  const filtered = filters.q !== '' || filters.status !== null || filters.from !== '' || filters.to !== '' || filters.employeeId !== null || filters.eventId !== null;

  return (
    <Page title={t('admin.attendance.title')} subtitle={t('admin.attendance.subtitle')}>
      <TableBlock>
        <Toolbar actions={<ExportButton path="/api/admin/checkins/export" filters={filters} />}>
          <SearchField flex="1 1 240px" minW="0" maxW={{ md: '420px' }} label={t('admin.attendance.search')} value={search.text} onChange={search.onChange} />
          <Box w={{ base: 'full', sm: '200px' }}>
            <SelectField
              aria-label={t('admin.attendance.status')}
              placeholder={t('admin.attendance.allStatuses')}
              data={STATUSES.map((value) => ({ value, label: t(`checkInStatus.${value}`) }))}
              value={filters.status}
              onChange={(status) => patch({ status })}
            />
          </Box>
          <DateRange w={{ base: 'full', md: 'auto' }} from={filters.from} to={filters.to} onChange={(range) => patch(range)} />
          {filters.employeeId !== null && (
            <FilterChip
              label={employee.data ? `${employee.data.displayName} · ${employee.data.employeeNo}` : t('admin.ledger.filterEmployee', { id: filters.employeeId })}
              onClear={() => patch({ employeeId: null })}
            />
          )}
          {filters.eventId !== null && <FilterChip label={eventTitle ? localized(eventTitle) : t('admin.ledger.filterEvent', { id: filters.eventId })} onClear={() => patch({ eventId: null })} />}
          <ClearFilters active={filtered} onClear={() => patch({ q: null, status: null, from: null, to: null, employeeId: null, eventId: null })} />
        </Toolbar>

        <AttendanceTable
          filters={filters}
          page={page}
          pageSize={PAGE_SIZE}
          onPage={(next) => patch({ page: next === 1 ? null : next })}
          onFilterEvent={(eventId) => patch({ eventId })}
          emptyMessage={filters.q !== '' ? t('filters.noMatch', { q: filters.q }) : filtered ? t('admin.attendance.empty') : t('admin.attendance.emptyAll')}
        />
      </TableBlock>
    </Page>
  );
}
