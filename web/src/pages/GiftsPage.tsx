import { Text } from '@chakra-ui/react';
import { Gift as GiftIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMyRedemptions } from '../api/me';
import type { Redemption } from '../api/types';
import { RedemptionStatusBadge } from '../components/badges';
import { GiftCatalog } from '../components/GiftCatalog';
import { Page } from '../components/Page';
import { DataTable, type Column } from '../components/ui/DataTable';
import { SimpleTabs } from '../components/ui/SimpleTabs';
import { useFormat, useLocalized } from '../i18n/hooks';

function MyRedemptions() {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const redemptions = useMyRedemptions();

  const columns: Column<Redemption>[] = [
    { key: 'gift', header: t('gifts.columns.gift'), cell: (r) => <Text fontWeight="bold">{localized(r.giftName)}</Text> },
    { key: 'quantity', header: t('gifts.quantity'), align: 'end', numeric: true, cell: (r) => format.number(r.quantity) },
    { key: 'points', header: t('gifts.columns.points'), align: 'end', numeric: true, cell: (r) => format.number(r.pointsSpent) },
    { key: 'requested', header: t('gifts.columns.requested'), cell: (r) => <Text whiteSpace="nowrap">{format.dateTime(r.requestedAt)}</Text> },
    { key: 'status', header: t('gifts.columns.status'), cell: (r) => <RedemptionStatusBadge value={r.status} /> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={redemptions.data}
      rowKey={(r) => r.id}
      minWidth={520}
      loading={redemptions.isPending}
      error={redemptions.error}
      onRetry={() => void redemptions.refetch()}
      emptyMessage={t('gifts.noRedemptions')}
    />
  );
}

export function GiftsPage() {
  const { t } = useTranslation();
  return (
    <Page title={t('gifts.title')} subtitle={t('gifts.subtitle')}>
      <SimpleTabs
        tabs={[
          { value: 'catalog', label: t('gifts.tabCatalog'), icon: <GiftIcon size={16} strokeWidth={2.5} aria-hidden />, content: <GiftCatalog /> },
          { value: 'mine', label: t('gifts.tabMine'), content: <MyRedemptions /> },
        ]}
      />
    </Page>
  );
}
