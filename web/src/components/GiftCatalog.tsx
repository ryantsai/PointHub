import { Badge, Box, Button, Flex, Grid, Progress, Text, type GridProps } from '@chakra-ui/react';
import { Check, Lock, PackageX, SearchX, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { GIFT_SORTS, useGifts, useRedeemGift } from '../api/gifts';
import type { Gift, Redemption } from '../api/types';
import { useErrorMessage, useFormat, useLocalized } from '../i18n/hooks';
import { limitLeft, maxClaimable } from '../lib/gifts';
import { springs } from '../lib/motion';
import { useSession } from '../lib/session';
import { readEnum, useUrlFilters, useUrlSearch } from '../lib/urlFilters';
import { giftBox } from '../themes/sprites/ui';
import { GiftGallery } from './GiftGallery';
import { Stagger, StaggerItem } from './Page';
import { EmptyState, ErrorBlock, LoadingBlock, NoMatch } from './states';
import { StatusBurst } from './StatusBurst';
import { Coin, Points } from './ui/bits';
import { Burst } from './ui/Burst';
import { NumberField, SelectField } from './ui/fields';
import { Modal } from './ui/Modal';
import { Notice } from './ui/Notice';
import { Panel } from './ui/Panel';
import { SearchField } from './ui/SearchField';
import { ToggleChip } from './ui/ToggleChip';

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

function RedeemDialog({ gift, onRedeemed, onClose }: { gift: Gift; onRedeemed: (redemption: Redemption) => void; onClose: () => void }) {
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
  // The picker stops at whichever runs out first: the per-person limit, the stock, the balance. After a refused
  // claim the gift is refetched, so `max` can drop to 0 while the dialog is open: the button then stays off.
  const left = limitLeft(gift);
  const max = maxClaimable(gift, balance);

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
        <Flex mt="3" gap="2" wrap="wrap" justify="center">
          <Button asChild variant="outline">
            <Link to="/claims">{t('gifts.viewMine')}</Link>
          </Button>
          <Button onClick={onClose}>{t('app.close')}</Button>
        </Flex>
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
      <NumberField label={t('gifts.quantity')} value={quantity} onChange={setQuantity} min={1} max={Math.max(1, max)} help={left !== null && left > 0 ? t('gifts.limitLeft', { count: left }) : undefined} />
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
        <Button loading={redeem.isPending} disabled={count < 1 || count > max} onClick={() => redeem.mutate({ giftId: gift.id, quantity: count }, { onSuccess: onRedeemed })}>
          {t('gifts.confirmRedeem')}
        </Button>
      </Flex>
    </Flex>
  );
}

interface GiftCardProps {
  gift: Gift;
  onRedeem: () => void;
  /** Set on the card whose gift was just redeemed. */
  celebration: Celebration | null;
}

function GiftCard({ gift, onRedeem, celebration }: GiftCardProps) {
  const { t } = useTranslation();
  const me = useSession();
  const format = useFormat();
  const localized = useLocalized();
  const name = localized(gift.name);
  const soldOut = gift.stock <= 0;
  // What the per-person limit still leaves this person; `null` = the gift has no limit.
  const left = limitLeft(gift);
  const limitReached = !soldOut && left === 0;
  const missing = Math.max(0, gift.pointCost - me.balance);
  const celebrating = celebration?.active ?? false;

  return (
    // The motion element wraps the panel (`<Panel asChild>` would merge the card into its own body).
    // `layout`: when the order changes (another sort, a filter), the card glides to its new place.
    <motion.article layout="position" whileHover={{ y: -5 }} transition={springs.soft} style={{ height: '100%' }}>
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
            // Two phrases that wrap as wholes on a narrow card: what is left for this person, then the rule.
            <Flex wrap="wrap" columnGap="2" fontSize="xs" lineHeight="1.35">
              {left !== null && left > 0 && (
                <Text as="span" fontWeight="bold" whiteSpace="nowrap">
                  {t('gifts.limitLeft', { count: left })}
                </Text>
              )}
              <Text as="span" fontWeight="semibold" color="fg.muted" whiteSpace="nowrap">
                {t('gifts.limit', { count: gift.perEmployeeLimit })}
              </Text>
            </Flex>
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
  /** The query-string key of the search box (default `q`); the home page has several searches and names each. */
  searchParam?: string;
  /** Adds the sort menu and the filters beside the search box (the gifts page). They live in the URL: `?sort=`, `?stock=1`, `?afford=1`. */
  controls?: boolean;
}

/**
 * The gift catalogue as cards: picture (gallery when several, pixel-art box when none), cost, stock, per-person
 * limit with what it still leaves this person (`perEmployeeLimit - claimedByMe`), and one action slot (redeem / need N more / out of stock / limit reached). Redeeming opens the confirm
 * dialog; when it closes after a success, the card celebrates. Used by the home page and by `/gifts`.
 * The search box above the cards asks the server (`/api/gifts?q=`): every word must match, in any language.
 * The most claimed gifts come first. With `controls`, people can pick another order (points, newest) and
 * narrow the list to what is in stock and to what their points cover; the server does both.
 */
export function GiftCatalog({ limit, columns, searchParam = 'q', controls = false }: GiftCatalogProps) {
  const { t } = useTranslation();
  const search = useUrlSearch(searchParam);
  const { params, patch } = useUrlFilters();
  const sort = (controls ? readEnum(params, 'sort', GIFT_SORTS) : null) ?? 'popular';
  const inStock = controls && params.get('stock') === '1';
  const affordable = controls && params.get('afford') === '1';
  const filtered = inStock || affordable;
  const gifts = useGifts({ q: search.q, sort, inStock, affordable });
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

  const shown = limit === undefined ? (gifts.data ?? []) : (gifts.data ?? []).slice(0, limit);

  return (
    <Flex direction="column" gap="4" minW="0">
      <Flex gap="3" align="center" wrap="wrap">
        <SearchField flex="1 1 240px" minW="0" maxW={{ md: '420px' }} label={t('gifts.search')} value={search.text} onChange={search.onChange} />
        {controls && (
          <>
            <Box w={{ base: 'full', sm: '220px' }}>
              <SelectField
                aria-label={t('gifts.sortLabel')}
                data={GIFT_SORTS.map((value) => ({ value, label: t(`gifts.sort.${value}`) }))}
                value={sort}
                // The default order is not written to the URL.
                onChange={(next) => patch({ sort: next === null || next === 'popular' ? null : next })}
              />
            </Box>
            <ToggleChip value={inStock} onChange={(on) => patch({ stock: on ? 1 : null })}>
              {t('gifts.filterInStock')}
            </ToggleChip>
            <ToggleChip value={affordable} onChange={(on) => patch({ afford: on ? 1 : null })}>
              {t('gifts.filterAffordable')}
            </ToggleChip>
          </>
        )}
      </Flex>
      {gifts.isPending ? (
        <LoadingBlock />
      ) : gifts.error ? (
        <ErrorBlock error={gifts.error} onRetry={() => void gifts.refetch()} />
      ) : gifts.data.length === 0 ? (
        filtered ? (
          // The filters may be what hides everything: offer to drop them first; a search term stays.
          <EmptyState message={t('gifts.noFilterMatch')} icon={<SearchX size={26} strokeWidth={2.2} aria-hidden />}>
            <Button size="sm" variant="outline" onClick={() => patch({ stock: null, afford: null })}>
              {t('filters.clear')}
            </Button>
          </EmptyState>
        ) : search.q !== '' ? (
          <NoMatch q={search.q} onClear={() => search.onChange('')} />
        ) : (
          <EmptyState message={t('gifts.noGifts')} sprite={giftBox} />
        )
      ) : (
        // While the next search is on its way the previous cards stay, dimmed.
        <Box opacity={gifts.isPlaceholderData ? 0.55 : 1} transition="opacity 160ms" aria-busy={gifts.isPlaceholderData}>
          <Stagger>
            <Grid templateColumns={columns ?? { base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }} gap={{ base: '3', md: '4' }}>
              {shown.map((gift) => (
                <StaggerItem key={gift.id}>
                  <GiftCard gift={gift} onRedeem={() => setSelected(gift)} celebration={celebration?.giftId === gift.id ? celebration : null} />
                </StaggerItem>
              ))}
            </Grid>
          </Stagger>
        </Box>
      )}
      <Modal opened={selected !== null} onClose={close} title={t('gifts.redeemTitle')} size="sm">
        {/* The freshest copy of the gift: after a refused claim (limit reached, stock gone) the dialog shows why. If the gift has left the catalogue, the copy it was opened with. */}
        {selected && <RedeemDialog key={selected.id} gift={gifts.data?.find((gift) => gift.id === selected.id) ?? selected} onRedeemed={setRedeemed} onClose={close} />}
      </Modal>
    </Flex>
  );
}
