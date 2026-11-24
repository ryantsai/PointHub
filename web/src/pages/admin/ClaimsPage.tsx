import { Box, Button, Flex, Grid, Text } from '@chakra-ui/react';
import { Check, ClipboardCheck, PackageCheck, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminGifts, useAdminRedemptions, useRedemptionAction, useRedemptionCount } from '../../api/gifts';
import type { GiftImage, Redemption, RedemptionStatus } from '../../api/types';
import { GiftThumb } from '../../components/GiftGallery';
import { Page } from '../../components/Page';
import { EmptyState, ErrorBlock, LoadingBlock, Pager } from '../../components/states';
import { StatusBurst } from '../../components/StatusBurst';
import { Eyebrow } from '../../components/ui/bits';
import { SelectField, TextAreaField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../components/ui/Notice';
import { SearchField } from '../../components/ui/SearchField';
import { SimpleTabs } from '../../components/ui/SimpleTabs';
import { useErrorMessage, useFormat, useLocalized } from '../../i18n/hooks';
import { openConfirm } from '../../lib/confirm';
import { useDebouncedValue } from '../../lib/hooks';
import { springs } from '../../lib/motion';
import { notifyError, notifySuccess } from '../../lib/notify';
import { FormActions, TableBlock, Toolbar } from './parts';

const PAGE_SIZE = 20;
const STATUSES: RedemptionStatus[] = ['requested', 'fulfilled', 'cancelled'];
/** How long a row celebrates before it leaves the open list. */
const CELEBRATION_MS = 1300;

// From xl up the rows are table-like: fixed tracks, so the cells line up under the header.
const COLUMNS = 'minmax(0, 1.2fr) minmax(0, 1.5fr) 56px 84px 148px 296px';
const AREAS = { base: '"gift points" "employee employee" "when when" "action action"', xl: '"employee gift quantity points when action"' };

function CancelForm({ redemption, onDone }: { redemption: Redemption; onDone: () => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const errorMessage = useErrorMessage();
  const action = useRedemptionAction();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    setSubmitted(true);
    if (reason.trim() === '') return;
    action.mutate(
      { id: redemption.id, action: 'cancel', reason: reason.trim() },
      {
        onSuccess: () => {
          notifySuccess(t('admin.claims.cancelled'));
          onDone();
        },
      },
    );
  };

  return (
    <Flex direction="column" gap="4">
      <Text fontSize="sm" fontWeight="medium">
        {t('admin.claims.cancelBody', {
          name: redemption.employeeName,
          gift: localized(redemption.giftName),
          quantity: format.number(redemption.quantity),
          points: format.number(redemption.pointsSpent),
        })}
      </Text>
      <TextAreaField
        label={t('admin.ledger.reason')}
        required
        rows={2}
        value={reason}
        onChange={setReason}
        error={submitted && reason.trim() === '' ? t('admin.ledger.reasonRequired') : null}
      />
      {action.error && <Notice tone="error" title={errorMessage(action.error)} />}
      <FormActions>
        <Button variant="outline" onClick={onDone}>
          {t('app.back')}
        </Button>
        <Button colorPalette="red" loading={action.isPending} onClick={submit}>
          {t('admin.claims.cancel')}
        </Button>
      </FormActions>
    </Flex>
  );
}

interface ClaimRowProps {
  claim: Redemption;
  images: GiftImage[];
  /** Just marked as fulfilled: the row shows its success moment before it leaves the list. */
  celebrating: boolean;
  busy: boolean;
  onFulfill: () => void;
  onReopen: () => void;
  onCancel: () => void;
}

function ClaimRow({ claim, images, celebrating, busy, onFulfill, onReopen, onCancel }: ClaimRowProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const gift = localized(claim.giftName);
  const closed = claim.closedAt ? `${claim.closedByName ?? t('admin.audit.system')} · ${format.dateTime(claim.closedAt)}` : null;

  return (
    <Grid
      templateAreas={AREAS}
      templateColumns={{ base: 'minmax(0, 1fr) auto', xl: COLUMNS }}
      columnGap="3"
      rowGap="2"
      alignItems="center"
      px={{ base: '3', md: '4' }}
      py="3"
      bg={celebrating ? 'green.subtle' : 'bg.panel'}
      transition="background-color 240ms"
      _hover={celebrating ? undefined : { bg: 'bg.subtle' }}
    >
      <Box gridArea="employee" minW="0">
        <Text fontWeight="bold" lineHeight="1.35" truncate>
          {claim.employeeName}
        </Text>
        <Text fontSize="xs" color="fg.muted" fontWeight="medium">
          {claim.employeeNo}
        </Text>
      </Box>

      <Flex gridArea="gift" align="center" gap="3" minW="0">
        <GiftThumb images={images} size={40} shape="square" />
        <Text fontWeight="bold" lineHeight="1.3" minW="0">
          {gift}
          <Text as="span" display={{ xl: 'none' }} fontWeight="black" whiteSpace="nowrap">
            {' '}
            × {format.number(claim.quantity)}
          </Text>
        </Text>
      </Flex>

      <Text gridArea="quantity" display={{ base: 'none', xl: 'block' }} textAlign="end" fontWeight="black" fontVariantNumeric="tabular-nums">
        × {format.number(claim.quantity)}
      </Text>

      <Text gridArea="points" textAlign="end" fontWeight="bold" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
        {format.number(claim.pointsSpent)}
        <Text as="span" fontSize="xs" color="fg.muted" fontWeight="bold">
          {' '}
          {t('app.pointsUnit')}
        </Text>
      </Text>

      <Text gridArea="when" fontSize="sm" fontWeight="medium" color={{ base: 'fg.muted', xl: 'fg' }} fontVariantNumeric="tabular-nums">
        <Text as="span" display={{ xl: 'none' }}>
          {t('admin.claims.columns.claimed')}:{' '}
        </Text>
        {format.dateTime(claim.requestedAt)}
      </Text>

      <Flex gridArea="action" justify="flex-end" align="center" gap="2" wrap="wrap" minH="9">
        {celebrating ? (
          <Flex align="center" gap="3" role="status" color="green.fg" fontWeight="extrabold" fontSize="sm">
            {t('admin.claims.fulfilledMoment')}
            <StatusBurst tone="success" size={36} />
          </Flex>
        ) : claim.status === 'requested' ? (
          <>
            <Button size="sm" variant="ghost" colorPalette="red" disabled={busy} onClick={onCancel} aria-label={`${t('admin.claims.cancel')}: ${claim.employeeName}, ${gift}`}>
              {t('admin.claims.cancel')}
            </Button>
            <Button size="sm" colorPalette="green" loading={busy} onClick={onFulfill} aria-label={`${t('admin.claims.fulfill')}: ${claim.employeeName}, ${gift}`}>
              <Check aria-hidden />
              {t('admin.claims.fulfill')}
            </Button>
          </>
        ) : (
          <>
            <Box textAlign="end" minW="0">
              <Text fontSize="xs" fontWeight="extrabold" color={claim.status === 'fulfilled' ? 'green.fg' : 'fg.muted'} lineHeight="1.3">
                {t(claim.status === 'fulfilled' ? 'admin.claims.fulfilledBy' : 'admin.claims.cancelledBy')}
              </Text>
              {closed && (
                <Text fontSize="xs" color="fg.muted" fontWeight="medium" fontVariantNumeric="tabular-nums" lineHeight="1.4">
                  {closed}
                </Text>
              )}
            </Box>
            {claim.status === 'fulfilled' && (
              <Button size="xs" variant="outline" loading={busy} onClick={onReopen} aria-label={`${t('admin.claims.undo')}: ${claim.employeeName}, ${gift}`}>
                <Undo2 aria-hidden />
                {t('admin.claims.undo')}
              </Button>
            )}
          </>
        )}
      </Flex>
    </Grid>
  );
}

interface ClaimsListProps {
  status: RedemptionStatus;
  q: string;
  giftId: number | null;
  imagesByGift: Map<number, GiftImage[]>;
}

function ClaimsList({ status, q, giftId, imagesByGift }: ClaimsListProps) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const errorMessage = useErrorMessage();
  const [page, setPage] = useState(1);
  const redemptions = useAdminRedemptions({ status, q, giftId, page, pageSize: PAGE_SIZE });
  const action = useRedemptionAction();
  const [busy, setBusy] = useState<number[]>([]);
  const [cancelling, setCancelling] = useState<Redemption | null>(null);
  // Rows that were just fulfilled stay where they were for a moment, although the server list has already dropped them.
  const [held, setHeld] = useState<{ claim: Redemption; index: number }[]>([]);

  // Filters changed (or the last row of a page left): go back to a page that exists.
  const filterKey = `${q}|${giftId ?? ''}`;
  const [seenFilters, setSeenFilters] = useState(filterKey);
  const pages = redemptions.data ? Math.max(1, Math.ceil(redemptions.data.total / PAGE_SIZE)) : null;
  if (seenFilters !== filterKey) {
    setSeenFilters(filterKey);
    setPage(1);
  } else if (pages !== null && !redemptions.isPlaceholderData && page > pages) {
    setPage(pages);
  }

  const rows = (redemptions.data?.items ?? []).filter((claim) => !held.some((entry) => entry.claim.id === claim.id));
  for (const entry of [...held].sort((a, b) => a.index - b.index)) rows.splice(Math.min(entry.index, rows.length), 0, entry.claim);

  // `mutateAsync` per call: callbacks passed to `mutate()` only run for the latest call, and two rows can be clicked in quick succession.
  const run = (claim: Redemption, request: 'fulfill' | 'reopen', onSuccess: (updated: Redemption) => void) => {
    setBusy((current) => [...current, claim.id]);
    action
      .mutateAsync({ id: claim.id, action: request })
      .then(onSuccess)
      .catch((error: unknown) => notifyError(errorMessage(error)))
      .finally(() => setBusy((current) => current.filter((id) => id !== claim.id)));
  };

  const fulfill = (claim: Redemption, index: number) =>
    run(claim, 'fulfill', (updated) => {
      setHeld((current) => [...current, { claim: updated, index }]);
      window.setTimeout(() => setHeld((current) => current.filter((entry) => entry.claim.id !== claim.id)), CELEBRATION_MS);
    });

  const confirmReopen = (claim: Redemption) =>
    openConfirm({
      title: t('admin.claims.undoTitle'),
      children: <Text fontSize="sm">{t('admin.claims.undoBody', { name: claim.employeeName, gift: localized(claim.giftName) })}</Text>,
      labels: { confirm: t('admin.claims.undoConfirm'), cancel: t('app.cancel') },
      onConfirm: () => run(claim, 'reopen', () => notifySuccess(t('admin.claims.reopened'))),
    });

  if (redemptions.isPending) return <LoadingBlock />;
  if (redemptions.error && !redemptions.data) return <ErrorBlock error={redemptions.error} onRetry={() => void redemptions.refetch()} />;

  const filtered = q !== '' || giftId !== null;
  return (
    <TableBlock>
      {rows.length === 0 ? (
        <EmptyState
          message={filtered ? t('admin.claims.emptyFiltered') : t(`admin.claims.empty.${status}`)}
          icon={status === 'requested' && !filtered ? <PackageCheck size={26} strokeWidth={2.2} aria-hidden /> : undefined}
        />
      ) : (
        <Box borderWidth="2px" borderColor="border" borderRadius="l2" bg="bg.panel" boxShadow="0 4px 0 0 {colors.border}" overflow="hidden">
          <Grid display={{ base: 'none', xl: 'grid' }} templateColumns={COLUMNS} columnGap="3" px="4" py="2.5" bg="bg.subtle" borderBottomWidth="1px" borderColor="border" aria-hidden>
            <Eyebrow>{t('admin.claims.columns.employee')}</Eyebrow>
            <Eyebrow>{t('admin.claims.columns.gift')}</Eyebrow>
            <Eyebrow textAlign="end">{t('admin.claims.columns.quantity')}</Eyebrow>
            <Eyebrow textAlign="end">{t('admin.claims.columns.points')}</Eyebrow>
            <Eyebrow>{t('admin.claims.columns.claimed')}</Eyebrow>
            <span />
          </Grid>
          <Box as="ul" listStyleType="none" opacity={redemptions.isPlaceholderData ? 0.55 : 1} transition="opacity 160ms">
            <AnimatePresence initial={false}>
              {rows.map((claim, index) => (
                <motion.li
                  key={claim.id}
                  layout="position"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 48, height: 0 }}
                  transition={springs.soft}
                  style={{ overflow: 'hidden', borderTop: index === 0 ? undefined : '1px solid var(--chakra-colors-border)' }}
                >
                  <ClaimRow
                    claim={claim}
                    images={imagesByGift.get(claim.giftId) ?? []}
                    celebrating={held.some((entry) => entry.claim.id === claim.id)}
                    busy={busy.includes(claim.id)}
                    onFulfill={() => fulfill(claim, index)}
                    onReopen={() => confirmReopen(claim)}
                    onCancel={() => setCancelling(claim)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </Box>
        </Box>
      )}
      {redemptions.data && redemptions.data.total > 0 && <Pager page={page} pageSize={PAGE_SIZE} total={redemptions.data.total} onChange={setPage} />}

      <Modal opened={cancelling !== null} onClose={() => setCancelling(null)} title={t('admin.claims.cancelTitle')}>
        {cancelling && <CancelForm key={cancelling.id} redemption={cancelling} onDone={() => setCancelling(null)} />}
      </Modal>
    </TableBlock>
  );
}

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

/** Where a gift admin checks whether each claim has been handed over. */
export function ClaimsPage() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const gifts = useAdminGifts();
  const [status, setStatus] = useState<RedemptionStatus>('requested');
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search, 300);
  const [gift, setGift] = useState<string | null>(null);
  const giftId = gift === null ? null : Number(gift);
  const counts = {
    requested: useRedemptionCount({ status: 'requested', q, giftId }).data,
    fulfilled: useRedemptionCount({ status: 'fulfilled', q, giftId }).data,
    cancelled: useRedemptionCount({ status: 'cancelled', q, giftId }).data,
  };
  const imagesByGift = new Map((gifts.data ?? []).map((item) => [item.id, item.images]));

  return (
    <Page title={t('admin.claims.title')} subtitle={t('admin.claims.subtitle')}>
      <TableBlock>
        <Toolbar>
          <SearchField flex="1" minW="220px" maxW="420px" label={t('admin.claims.search')} value={search} onChange={setSearch} />
          <Box w={{ base: 'full', sm: '240px' }}>
            <SelectField
              aria-label={t('admin.claims.giftFilter')}
              placeholder={t('admin.claims.allGifts')}
              data={(gifts.data ?? []).map((item) => ({ value: String(item.id), label: localized(item.name) }))}
              value={gift}
              onChange={setGift}
            />
          </Box>
        </Toolbar>
        <SimpleTabs
          value={status}
          onChange={setStatus}
          tabs={STATUSES.map((value) => ({
            value,
            label: t(`admin.claims.tab.${value}`),
            icon: value === 'requested' ? <ClipboardCheck size={16} strokeWidth={2.5} aria-hidden /> : undefined,
            badge: <TabCount value={counts[value]} />,
            content: <ClaimsList status={value} q={q} giftId={giftId} imagesByGift={imagesByGift} />,
          }))}
        />
      </TableBlock>
    </Page>
  );
}
