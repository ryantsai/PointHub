import { Badge, Box, Button, Flex, Grid, Progress, Text, type GridProps } from '@chakra-ui/react';
import { Check, Lock, PackageX, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGifts, useRedeemGift } from '../api/gifts';
import { useMyRedemptions } from '../api/me';
import type { Gift, Redemption } from '../api/types';
import { useErrorMessage, useFormat, useLocalized } from '../i18n/hooks';
import { remainingAllowance } from '../lib/gifts';
import { springs } from '../lib/motion';
import { useSession } from '../lib/session';
import { giftBox } from '../themes/sprites/ui';
import { GiftGallery } from './GiftGallery';
import { Stagger, StaggerItem } from './Page';
import { EmptyState, ErrorBlock, LoadingBlock } from './states';
import { StatusBurst } from './StatusBurst';
import { Coin, Points } from './ui/bits';
import { Burst } from './ui/Burst';
import { NumberField } from './ui/fields';
import { Modal } from './ui/Modal';
import { Notice } from './ui/Notice';
import { Panel } from './ui/Panel';

/** How long a card keeps celebrating after its gift was redeemed. */
const CELEBRATION_MS = 1800;

/** The reward moment on a card: which gift, how many points left the balance, and a counter that fires the confetti. */
type Celebration = { giftId: number; points: number; count: number; active: boolean };

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

function RedeemDialog({ gift, allowance, onRedeemed, onClose }: { gift: Gift; allowance: number; onRedeemed: (redemption: Redemption) => void; onClose: () => void }) {
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
        <Button loading={redeem.isPending} disabled={balanceAfter < 0} onClick={() => redeem.mutate({ giftId: gift.id, quantity: count }, { onSuccess: onRedeemed })}>
          {t('gifts.confirmRedeem')}
        </Button>
      </Flex>
    </Flex>
  );
}

interface GiftCardProps {
  gift: Gift;
  allowance: number;
  onRedeem: () => void;
  /** Set on the card whose gift was just redeemed. */
  celebration: Celebration | null;
}

function GiftCard({ gift, allowance, onRedeem, celebration }: GiftCardProps) {
  const { t } = useTranslation();
  const me = useSession();
  const format = useFormat();
  const localized = useLocalized();
  const name = localized(gift.name);
  const soldOut = gift.stock <= 0;
  const limitReached = !soldOut && allowance <= 0;
  const missing = Math.max(0, gift.pointCost - me.balance);
  const celebrating = celebration?.active ?? false;

  return (
    // The motion element wraps the panel (`<Panel asChild>` would merge the card into its own body).
    <motion.article whileHover={{ y: -5 }} transition={springs.soft} style={{ height: '100%' }}>
      <Panel padding={{ base: '3', md: '4' }} gap="3" h="full" overflow="visible">
        <Box position="relative">
          {/* the picture hops when its gift is redeemed */}
          <motion.div animate={celebrating ? { y: [0, -16, 0], rotate: [0, -4, 3, 0], scale: [1, 1.06, 1] } : { y: 0, rotate: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.3, 1.4, 0.5, 1] }}>
            <GiftGallery images={gift.images} alt={name} dimmed={soldOut} />
          </motion.div>
          {/* the points flying off */}
          <AnimatePresence>
            {celebration && celebrating && (
              <motion.div
                key={celebration.count}
                aria-hidden
                style={{ position: 'absolute', left: 0, right: 0, top: '30%', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 3 }}
                initial={{ y: 10, opacity: 0, scale: 0.6 }}
                animate={{ y: -46, opacity: [0, 1, 1, 0], scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: [0.2, 0.8, 0.3, 1], times: [0, 0.15, 0.7, 1] }}
              >
                <Badge colorPalette="accent" variant="solid" size="lg" px="3" gap="1.5" fontWeight="black" boxShadow="0 3px 0 0 {colors.accent.depth}">
                  <Coin size={16} bg="white" />
                  {format.signed(-celebration.points)}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          <Burst trigger={celebration?.count ?? 0} count={18} radius={96} />
        </Box>

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

        {/* action: one slot, five states */}
        {celebrating ? (
          <Button size="md" w="full" colorPalette="green" aria-disabled tabIndex={-1} pointerEvents="none">
            <motion.span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} initial={{ y: 10, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={springs.bouncy}>
              <Check size={18} strokeWidth={3.5} aria-hidden />
              {t('gifts.redeemed')}
            </motion.span>
          </Button>
        ) : soldOut || limitReached ? (
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
      </Panel>
    </motion.article>
  );
}

interface GiftCatalogProps {
  /** Show only the first N gifts (the home page teaser). */
  limit?: number;
  /** Grid columns; default: 2 on phones, 3 from md, 4 from xl. */
  columns?: GridProps['templateColumns'];
}

/**
 * The gift catalogue as cards: picture (gallery when several, pixel-art box when none), cost, stock, per-person
 * limit, and one action slot (redeem / need N more / out of stock / limit reached). Redeeming opens the confirm
 * dialog; when it closes after a success, the card celebrates. Used by the home page and by `/gifts`.
 */
export function GiftCatalog({ limit, columns }: GiftCatalogProps) {
  const { t } = useTranslation();
  const gifts = useGifts();
  const redemptions = useMyRedemptions();
  const [selected, setSelected] = useState<Gift | null>(null);
  const [redeemed, setRedeemed] = useState<Redemption | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const close = () => {
    setSelected(null);
    if (!redeemed) return;
    // The dialog covered the card; now that it is gone, let the card have its moment.
    setCelebration((previous) => ({ giftId: redeemed.giftId, points: redeemed.pointsSpent, count: (previous?.count ?? 0) + 1, active: true }));
    setRedeemed(null);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCelebration((current) => current && { ...current, active: false }), CELEBRATION_MS);
  };

  if (gifts.isPending) return <LoadingBlock />;
  if (gifts.error) return <ErrorBlock error={gifts.error} onRetry={() => void gifts.refetch()} />;
  if (gifts.data.length === 0) return <EmptyState message={t('gifts.noGifts')} sprite={giftBox} />;

  const shown = limit === undefined ? gifts.data : gifts.data.slice(0, limit);

  return (
    <>
      <Stagger>
        <Grid templateColumns={columns ?? { base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }} gap={{ base: '3', md: '4' }}>
          {shown.map((gift) => (
            <StaggerItem key={gift.id}>
              <GiftCard
                gift={gift}
                allowance={remainingAllowance(gift, redemptions.data)}
                onRedeem={() => setSelected(gift)}
                celebration={celebration?.giftId === gift.id ? celebration : null}
              />
            </StaggerItem>
          ))}
        </Grid>
      </Stagger>
      <Modal opened={selected !== null} onClose={close} title={t('gifts.redeemTitle')} size="sm">
        {selected && <RedeemDialog key={selected.id} gift={selected} allowance={remainingAllowance(selected, redemptions.data)} onRedeemed={setRedeemed} onClose={close} />}
      </Modal>
    </>
  );
}
