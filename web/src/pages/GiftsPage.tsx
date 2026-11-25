import { Box, Flex, Text } from '@chakra-ui/react';
import { Gift as GiftIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMyRedemptions } from '../api/me';
import type { Redemption } from '../api/types';
import { RedemptionStatusBadge } from '../components/badges';
import { GiftCatalog } from '../components/GiftCatalog';
import { GiftThumb } from '../components/GiftGallery';
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
    {
      key: 'gift',
      header: t('gifts.columns.gift'),
      cell: (r) => (
        <Flex align="center" gap="3" minW="0">
          {/* The picture travels with the claim, so a gift that was disabled since still shows it. */}
          <GiftThumb images={r.giftImage ? [r.giftImage] : []} size={40} shape="square" />
          <Text fontWeight="bold" lineHeight="1.35">
            {localized(r.giftName)}
          </Text>
        </Flex>
      ),
    },
    // Straight after the gift: on a phone the table scrolls sideways, and what became of the claim is what people look for.
    {
      key: 'status',
      header: t('gifts.columns.status'),
      cell: (r) => (
        <Box minW="0">
          <RedemptionStatusBadge value={r.status} />
          {(r.status === 'cancelled' || r.status === 'refunded') && (
            <Text mt="1" fontSize="xs" color="fg.muted" fontWeight="medium" lineHeight="1.4" maxW="64" wordBreak="break-word">
              {t('gifts.pointsReturned', { points: format.number(r.pointsSpent) })}
              {r.note && (
                <>
                  <br />
                  {t('gifts.reason', { reason: r.note })}
                </>
              )}
            </Text>
          )}
        </Box>
      ),
    },
    { key: 'quantity', header: t('gifts.quantity'), align: 'end', numeric: true, cell: (r) => format.number(r.quantity) },
    { key: 'points', header: t('gifts.columns.points'), align: 'end', numeric: true, cell: (r) => format.number(r.pointsSpent) },
    { key: 'requested', header: t('gifts.columns.requested'), cell: (r) => <Text whiteSpace="nowrap">{format.dateTime(r.requestedAt)}</Text> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={redemptions.data}
      rowKey={(r) => r.id}
      minWidth={600}
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
