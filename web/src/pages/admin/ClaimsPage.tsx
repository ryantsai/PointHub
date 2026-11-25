import { Box } from '@chakra-ui/react';
import { ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminGifts, useGifts, useRedemptionCount, type RedemptionFilters } from '../../api/gifts';
import type { RedemptionStatus } from '../../api/types';
import { ExportButton } from '../../components/ExportButton';
import { Page } from '../../components/Page';
import { DateRange } from '../../components/ui/DateRange';
import { SelectField } from '../../components/ui/fields';
import { Notice } from '../../components/ui/Notice';
import { SearchField } from '../../components/ui/SearchField';
import { SimpleTabs } from '../../components/ui/SimpleTabs';
import { useFormat, useLocalized } from '../../i18n/hooks';
import { can } from '../../lib/roles';
import { useSession } from '../../lib/session';
import { readDate, readEnum, readId, readPage, useUrlFilters, useUrlSearch } from '../../lib/urlFilters';
import { ClaimsList } from './ClaimsList';
import { ClearFilters, FilterChip, TableBlock, Toolbar } from './parts';

const PAGE_SIZE = 20;
const STATUSES: RedemptionStatus[] = ['requested', 'fulfilled', 'cancelled', 'refunded'];

/** A counter that reads on a selected tab (white on brand) and on an unselected one alike. */
function TabCount({ value }: { value: number | undefined }) {
  const format = useFormat();
  if (value === undefined) return null;
  return (
    <Box as="span" minW="5" h="5" px="1.5" display="inline-flex" alignItems="center" justifyContent="center" borderRadius="full" borderWidth="2px" borderColor="currentColor" fontSize="xs" fontWeight="black" lineHeight="1" fontVariantNumeric="tabular-nums">
      {format.number(value)}
    </Box>
  );
}

/**
 * Where a gift admin checks whether each claim has been handed over, and takes one back (cancel before the
 * hand-over, refund after it). Auditors open it read-only: the same lists, search and export, no buttons.
 * The tab, the search, the gift, the dates and the page live in the URL; "Export CSV" downloads the open tab
 * with its filters.
 */
export function ClaimsPage() {
  const { t } = useTranslation();
  const me = useSession();
  const localized = useLocalized();
  const { params, patch } = useUrlFilters();
  const search = useUrlSearch('q');
  const manages = can.manageGifts(me);
  // The gift filter: people who manage gifts get every gift, an auditor the catalogue (the full list is refused to them).
  const allGifts = useAdminGifts(manages);
  const catalogue = useGifts('', !manages);
  const gifts = (manages ? allGifts.data : catalogue.data) ?? [];

  const status = readEnum(params, 'status', STATUSES) ?? 'requested';
  const filters: Omit<RedemptionFilters, 'status'> = {
    q: search.q,
    giftId: readId(params, 'giftId'),
    employeeId: readId(params, 'employeeId'),
    from: readDate(params, 'from'),
    to: readDate(params, 'to'),
  };
  const page = readPage(params);
  const filtered = filters.q !== '' || filters.giftId !== null || filters.employeeId !== null || filters.from !== '' || filters.to !== '';
  const counts = {
    requested: useRedemptionCount({ ...filters, status: 'requested' }).data,
    fulfilled: useRedemptionCount({ ...filters, status: 'fulfilled' }).data,
    cancelled: useRedemptionCount({ ...filters, status: 'cancelled' }).data,
    refunded: useRedemptionCount({ ...filters, status: 'refunded' }).data,
  };

  return (
    <Page title={t('admin.claims.title')} subtitle={manages ? t('admin.claims.subtitle') : t('admin.claims.subtitleReadOnly')}>
      <TableBlock>
        {!manages && <Notice tone="info" title={t('admin.claims.readOnly')} />}
        <Toolbar actions={<ExportButton path="/api/admin/redemptions/export" filters={{ ...filters, status }} />}>
          <SearchField flex="1 1 240px" minW="0" maxW={{ md: '420px' }} label={t('admin.claims.search')} value={search.text} onChange={search.onChange} />
          <Box w={{ base: 'full', sm: '220px' }}>
            <SelectField
              aria-label={t('admin.claims.giftFilter')}
              placeholder={t('admin.claims.allGifts')}
              data={gifts.map((item) => ({ value: String(item.id), label: localized(item.name) }))}
              value={filters.giftId === null ? null : String(filters.giftId)}
              onChange={(giftId) => patch({ giftId })}
            />
          </Box>
          <DateRange w={{ base: 'full', md: 'auto' }} from={filters.from} to={filters.to} onChange={(range) => patch(range)} />
          {filters.employeeId !== null && <FilterChip label={t('admin.ledger.filterEmployee', { id: filters.employeeId })} onClear={() => patch({ employeeId: null })} />}
          <ClearFilters active={filtered} onClear={() => patch({ q: null, giftId: null, employeeId: null, from: null, to: null })} />
        </Toolbar>
        <SimpleTabs
          value={status}
          onChange={(next) => patch({ status: next === 'requested' ? null : next })}
          tabs={STATUSES.map((value) => ({
            value,
            label: t(`admin.claims.tab.${value}`),
            icon: value === 'requested' ? <ClipboardCheck size={16} strokeWidth={2.5} aria-hidden /> : undefined,
            badge: <TabCount value={counts[value]} />,
            content: (
              <ClaimsList
                filters={{ ...filters, status: value }}
                page={page}
                pageSize={PAGE_SIZE}
                onPage={(next) => patch({ page: next === 1 ? null : next })}
                emptyMessage={filters.q !== '' ? t('filters.noMatch', { q: filters.q }) : filtered ? t('admin.claims.emptyFiltered') : t(`admin.claims.empty.${value}`)}
              />
            ),
          }))}
        />
      </TableBlock>
    </Page>
  );
}
