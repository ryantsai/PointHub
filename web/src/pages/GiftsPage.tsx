import { Badge, Box, Button, Flex, Grid, Progress, Text } from '@chakra-ui/react';
import { Gift as GiftIcon, Lock, PackageX, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGifts, useRedeemGift } from '../api/gifts';
import { useMyRedemptions } from '../api/me';
import type { Gift, Redemption } from '../api/types';
import { RedemptionStatusBadge } from '../components/badges';
import { GiftGallery } from '../components/GiftGallery';
import { Page, Stagger, StaggerItem } from '../components/Page';
import { EmptyState, ErrorBlock, LoadingBlock } from '../components/states';
import { StatusBurst } from '../components/StatusBurst';
import { Coin, Points } from '../components/ui/bits';
import { DataTable, type Column } from '../components/ui/DataTable';
import { NumberField } from '../components/ui/fields';
import { Modal } from '../components/ui/Modal';
import { Notice } from '../components/ui/Notice';
import { Panel } from '../components/ui/Panel';
import { SimpleTabs } from '../components/ui/SimpleTabs';
import { useErrorMessage, useFormat, useLocalized } from '../i18n/hooks';
import { springs } from '../lib/motion';
import { useSession } from '../lib/session';
import { giftBox } from '../themes/sprites/ui';

/** How many more of this gift the employee may take: stock, capped by the per-person limit minus past redemptions. */
function remainingAllowance(gift: Gift, redemptions: Redemption[] | undefined): number {
  if (gift.perEmployeeLimit === null) return gift.stock;
  const taken = (redemptions ?? [])
    .filter((r) => r.giftId === gift.id && r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.quantity, 0);
  return Math.max(0, Math.min(gift.stock, gift.perEmployeeLimit - taken));
}

function SummaryRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <Flex justify="space-between" align="center" gap="3">
      <Text fontWeight="medium" color="fg.muted">
        {label}
      </Text>
      <Points value={value} color={negative ? 'loss' : undefined} />
    </Flex>
  );
}

function RedeemDialog({ gift, allowance, onClose }: { gift: Gift; allowance: number; onClose: () => void }) {
  const { t } = useTranslation();
  const me = useSession();
  const format = useFormat();
  const localized = useLocalized();
  const errorMessage = useErrorMessage();
  const redeem = useRedeemGift();
  const [quantity, setQuantity] = useState<number | ''>(1);
  // The balance before the tap: the session refreshes as soon as the redemption lands, and the summary
  // should not jump while the dialog is still open.
  const [balance] = useState(me.balance);
  const count = quantity === '' ? 1 : quantity;
  const total = gift.pointCost * count;
  const balanceAfter = balance - total;

  if (redeem.isSuccess) {
    return (
      <Flex direction="column" align="center" gap="2" py="4" role="status" textAlign="center">
        <StatusBurst tone="success" />
        <Text fontFamily="heading" fontWeight="extrabold" fontSize="xl" mt="4">
          {t('gifts.redeemedTitle')}
        </Text>
        {/* the points leaving the balance */}
        <motion.div initial={{ opacity: 0, y: 18, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...springs.bouncy, delay: 0.2 }}>
          <Badge colorPalette="accent" variant="solid" size="lg" px="3" py="1" gap="1.5" fontWeight="black" fontSize="md" boxShadow="0 3px 0 0 {colors.accent.depth}">
            <Coin size={18} bg="white" />
            {format.signed(-redeem.data.pointsSpent)}
          </Badge>
        </motion.div>
        <Text color="fg.muted" fontWeight="medium" mt="1">
          {t('gifts.redeemedBody')}
        </Text>
        <Button mt="3" onClick={onClose}>
          {t('app.close')}
        </Button>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="3">
        <Box w="16" flexShrink={0}>
          <GiftGallery images={gift.images.slice(0, 1)} alt="" />
        </Box>
        <Box minW="0">
          <Text fontWeight="extrabold" lineHeight="1.3">
            {localized(gift.name)}
          </Text>
          <Points value={gift.pointCost} size="sm" mt="1.5" />
        </Box>
      </Flex>
      <NumberField label={t('gifts.quantity')} value={quantity} onChange={setQuantity} min={1} max={Math.max(1, allowance)} />
      <Flex direction="column" gap="2" bg="bg.subtle" borderRadius="l2" p="3">
        <SummaryRow label={t('gifts.totalCost')} value={total} />
        <SummaryRow label={t('gifts.balanceAfter')} value={balanceAfter} negative={balanceAfter < 0} />
      </Flex>
      {balanceAfter < 0 && <Notice tone="warning" title={t('gifts.notEnough')} />}
      {redeem.error && <Notice tone="error" title={errorMessage(redeem.error)} />}
      <Flex justify="flex-end" gap="2" wrap="wrap">
        <Button variant="outline" onClick={onClose}>
          {t('app.cancel')}
        </Button>
        <Button loading={redeem.isPending} disabled={balanceAfter < 0} onClick={() => redeem.mutate({ giftId: gift.id, quantity: count })}>
          {t('gifts.confirmRedeem')}
        </Button>
      </Flex>
    </Flex>
  );
}

function GiftCard({ gift, allowance, onRedeem }: { gift: Gift; allowance: number; onRedeem: () => void }) {
  const { t } = useTranslation();
  const me = useSession();
  const format = useFormat();
  const localized = useLocalized();
  const name = localized(gift.name);
  const soldOut = gift.stock <= 0;
  const limitReached = !soldOut && allowance <= 0;
  const missing = Math.max(0, gift.pointCost - me.balance);

  return (
    <Panel asChild padding={{ base: '3', md: '4' }} gap="3" h="full">
      <motion.article whileHover={{ y: -5 }} transition={springs.soft}>
        <GiftGallery images={gift.images} alt={name} dimmed={soldOut} />

        <Box minW="0">
          <Text as="h3" fontWeight="extrabold" fontSize={{ base: 'sm', md: 'md' }} lineHeight="1.3">
            {name}
          </Text>
          {gift.description && (
            <Text mt="1" color="fg.muted" fontSize={{ base: 'xs', md: 'sm' }} lineHeight="1.4" lineClamp={2}>
              {localized(gift.description)}
            </Text>
          )}
        </Box>

        <Flex direction="column" gap="1.5" mt="auto">
          <Flex align="center" justify="space-between" gap="2" wrap="wrap">
            <Points value={gift.pointCost} />
            {!soldOut && (
              <Text fontSize="xs" fontWeight="bold" color={gift.stock <= 5 ? 'loss' : 'fg.muted'} whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                {t('gifts.stockLeft', { count: gift.stock })}
              </Text>
            )}
          </Flex>
          {gift.perEmployeeLimit !== null && (
            <Text fontSize="xs" fontWeight="semibold" color="fg.muted" lineHeight="1.3">
              {t('gifts.limit', { count: gift.perEmployeeLimit })}
            </Text>
          )}
        </Flex>

        {/* action: one slot, four states */}
        {soldOut || limitReached ? (
          <Flex align="center" justify="center" gap="2" minH="10" px="2" borderRadius="l2" bg="bg.muted" color="fg.muted" fontSize="sm" fontWeight="bold" textAlign="center" lineHeight="1.25">
            {soldOut ? <PackageX size={16} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0 }} /> : <ShieldCheck size={16} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0 }} />}
            {soldOut ? t('gifts.outOfStock') : t('gifts.limitReached')}
          </Flex>
        ) : missing === 0 ? (
          <Button size="md" w="full" onClick={onRedeem} aria-label={`${t('gifts.redeem')}: ${name}`}>
            {t('gifts.redeem')}
          </Button>
        ) : (
          <Box minH="10">
            <Flex align="center" justify="center" gap="1.5" minH="6" color="fg.muted" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="bold" textAlign="center" lineHeight="1.25">
              <Lock size={13} strokeWidth={2.8} aria-hidden style={{ flexShrink: 0 }} />
              {t('gifts.needMore', { points: format.number(missing) })}
            </Flex>
            <Progress.Root value={Math.min(100, (me.balance / gift.pointCost) * 100)} size="sm" mt="1.5" aria-label={t('gifts.needMore', { points: format.number(missing) })}>
              <Progress.Track borderRadius="full" bg="bg.muted">
                <Progress.Range borderRadius="full" css={{ transition: 'width 700ms cubic-bezier(0.3, 1.2, 0.5, 1)' }} />
              </Progress.Track>
            </Progress.Root>
          </Box>
        )}
      </motion.article>
    </Panel>
  );
}

function Catalog() {
  const { t } = useTranslation();
  const gifts = useGifts();
  const redemptions = useMyRedemptions();
  const [selected, setSelected] = useState<Gift | null>(null);

  if (gifts.isPending) return <LoadingBlock />;
  if (gifts.error) return <ErrorBlock error={gifts.error} onRetry={() => void gifts.refetch()} />;
  if (gifts.data.length === 0) return <EmptyState message={t('gifts.noGifts')} sprite={giftBox} />;

  return (
    <>
      <Stagger>
        <Grid templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }} gap={{ base: '3', md: '4' }}>
          {gifts.data.map((gift) => (
            <StaggerItem key={gift.id}>
              <GiftCard gift={gift} allowance={remainingAllowance(gift, redemptions.data)} onRedeem={() => setSelected(gift)} />
            </StaggerItem>
          ))}
        </Grid>
      </Stagger>
      <Modal opened={selected !== null} onClose={() => setSelected(null)} title={t('gifts.redeemTitle')} size="sm">
        {selected && <RedeemDialog key={selected.id} gift={selected} allowance={remainingAllowance(selected, redemptions.data)} onClose={() => setSelected(null)} />}
      </Modal>
    </>
  );
}

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
          { value: 'catalog', label: t('gifts.tabCatalog'), icon: <GiftIcon size={16} strokeWidth={2.5} aria-hidden />, content: <Catalog /> },
          { value: 'mine', label: t('gifts.tabMine'), content: <MyRedemptions /> },
        ]}
      />
    </Page>
  );
}
