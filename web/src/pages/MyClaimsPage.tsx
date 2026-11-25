import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { Gift as GiftIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMyRedemptions } from '../api/me';
import type { Redemption } from '../api/types';
import { RedemptionStatusBadge } from '../components/badges';
import { GiftThumb } from '../components/GiftGallery';
import { Page } from '../components/Page';
import { EmptyState } from '../components/states';
import { DataTable, type Column } from '../components/ui/DataTable';
import { useFormat, useLocalized } from '../i18n/hooks';
import { giftBox } from '../themes/sprites/ui';

/**
 * `/claims`: the gifts the signed-in person has claimed, newest first, each with what became of it (waiting,
 * handed over, cancelled, refunded). A page of its own, next to Home and Gifts in the navigation.
 */
export function MyClaimsPage() {
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

  const browse = (
    <Button asChild size="sm" variant="outline">
      <Link to="/gifts">
        <GiftIcon aria-hidden />
        {t('gifts.browse')}
      </Link>
    </Button>
  );

  return (
    <Page title={t('gifts.mineTitle')} subtitle={t('gifts.mineSubtitle')} actions={redemptions.data && redemptions.data.length > 0 ? browse : undefined}>
      {redemptions.data?.length === 0 ? (
        // Nothing claimed yet: the way to the catalogue instead of an empty table.
        <EmptyState message={t('gifts.noRedemptions')} sprite={giftBox}>
          {browse}
        </EmptyState>
      ) : (
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
      )}
    </Page>
  );
}
