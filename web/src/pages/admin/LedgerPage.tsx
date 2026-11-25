import { Box, Button } from '@chakra-ui/react';
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEmployee, useTransactions, type TransactionFilters } from '../../api/admin';
import { useLocalized } from '../../i18n/hooks';
import type { TransactionType } from '../../api/types';
import { ExportButton } from '../../components/ExportButton';
import { Page } from '../../components/Page';
import { DateRange } from '../../components/ui/DateRange';
import { SelectField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { SearchField } from '../../components/ui/SearchField';
import { can } from '../../lib/roles';
import { useSession } from '../../lib/session';
import { readDate, readEnum, readId, readPage, useUrlFilters, useUrlSearch } from '../../lib/urlFilters';
import { AdjustPointsForm } from './AdjustPointsForm';
import { LedgerTable } from './LedgerTable';
import { ClearFilters, FilterChip, TableBlock, Toolbar } from './parts';

const PAGE_SIZE = 25;
const TYPES: TransactionType[] = ['eventAward', 'redemption', 'adjustment', 'reversal', 'expiry', 'externalCredit', 'externalDebit'];

/**
 * Every point movement. System admins can revert a row or adjust a balance; auditors only read. All filters
 * (search, type, dates, one employee, one event, the page) live in the URL, and "Export CSV" downloads
 * exactly the filtered list.
 */
export function LedgerPage() {
  const { t } = useTranslation();
  const me = useSession();
  const { params, patch } = useUrlFilters();
  const search = useUrlSearch('q');
  const filters: TransactionFilters = {
    employeeId: readId(params, 'employeeId'),
    eventId: readId(params, 'eventId'),
    type: readEnum(params, 'type', TYPES),
    q: search.q,
    from: readDate(params, 'from'),
    to: readDate(params, 'to'),
  };
  const page = readPage(params);
  const [adjusting, setAdjusting] = useState(false);
  // The chip of an employee filter shows the person's name once it is known, their id until then.
  const employee = useEmployee(filters.employeeId);
  // The chip of an event filter takes the title from the rows on screen (the same cached query the table uses).
  const localized = useLocalized();
  const rows = useTransactions(filters, page, PAGE_SIZE);
  const eventTitle = rows.data?.items.find((row) => row.eventId === filters.eventId)?.eventTitle;
  const filtered = filters.q !== '' || filters.type !== null || filters.from !== '' || filters.to !== '' || filters.employeeId !== null || filters.eventId !== null;

  return (
    <Page
      title={t('admin.ledger.title')}
      subtitle={t('admin.ledger.subtitle')}
      actions={
        can.admin(me) && (
          <Button onClick={() => setAdjusting(true)}>
            <SlidersHorizontal aria-hidden />
            {t('admin.ledger.adjust')}
          </Button>
        )
      }
    >
      <TableBlock>
        <Toolbar actions={<ExportButton path="/api/admin/transactions/export" filters={filters} />}>
          <SearchField flex="1 1 240px" minW="0" maxW={{ md: '420px' }} label={t('admin.ledger.search')} value={search.text} onChange={search.onChange} />
          <Box w={{ base: 'full', sm: '200px' }}>
            <SelectField
              aria-label={t('admin.ledger.type')}
              placeholder={t('admin.ledger.allTypes')}
              data={TYPES.map((value) => ({ value, label: t(`txType.${value}`) }))}
              value={filters.type}
              onChange={(type) => patch({ type })}
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
          <ClearFilters active={filtered} onClear={() => patch({ q: null, type: null, from: null, to: null, employeeId: null, eventId: null })} />
        </Toolbar>

        <LedgerTable
          filters={filters}
          page={page}
          pageSize={PAGE_SIZE}
          onPage={(next) => patch({ page: next === 1 ? null : next })}
          onFilterEvent={(eventId) => patch({ eventId })}
          emptyMessage={filters.q !== '' ? t('filters.noMatch', { q: filters.q }) : filtered ? t('admin.ledger.empty') : t('admin.ledger.emptyAll')}
        />
      </TableBlock>

      <Modal opened={adjusting} onClose={() => setAdjusting(false)} title={t('admin.ledger.adjustTitle')}>
        <AdjustPointsForm employee={null} onDone={() => setAdjusting(false)} />
      </Modal>
    </Page>
  );
}
