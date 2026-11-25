import { Box, Button, Flex, Grid, Text } from '@chakra-ui/react';
import { Check, HandCoins, PackageCheck, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminRedemptions, useRedemptionAction, type RedemptionFilters } from '../../api/gifts';
import type { Redemption } from '../../api/types';
import { RedemptionStatusBadge } from '../../components/badges';
import { GiftThumb } from '../../components/GiftGallery';
import { EmptyState, ErrorBlock, LoadingBlock, Pager } from '../../components/states';
import { StatusBurst } from '../../components/StatusBurst';
import { Eyebrow } from '../../components/ui/bits';
import { CheckboxField, TextAreaField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../components/ui/Notice';
import { useErrorMessage, useFormat, useLocalized } from '../../i18n/hooks';
import { openConfirm } from '../../lib/confirm';
import { springs } from '../../lib/motion';
import { notifyError, notifySuccess } from '../../lib/notify';
import { can } from '../../lib/roles';
import { useSession } from '../../lib/session';
import { EmployeeLink, FormActions, TableBlock } from './parts';

/** How long a row celebrates before it leaves the open list. */
const CELEBRATION_MS = 1300;

// From xl up the rows are table-like: fixed tracks, so the cells line up under the header.
const COLUMNS = 'minmax(0, 1.2fr) minmax(0, 1.5fr) 56px 84px 148px 296px';
/** The same without the employee column: a list that is about one person already (the lookup page). */
const COLUMNS_ONE_PERSON = 'minmax(0, 1.5fr) 56px 84px 148px 296px';
/** A closed claim with a reason gets one more line for it: its own row on a phone, under the gift from xl up. */
const areas = (withNote: boolean, withEmployee: boolean) =>
  withEmployee
    ? {
        base: `"gift points" "employee employee" "when when" ${withNote ? '"note note" ' : ''}"action action"`,
        xl: `"employee gift quantity points when action"${withNote ? ' ". note note note note note"' : ''}`,
      }
    : {
        base: `"gift points" "when when" ${withNote ? '"note note" ' : ''}"action action"`,
        xl: `"gift quantity points when action"${withNote ? ' "note note note note note"' : ''}`,
      };
const CLOSED_BY = { fulfilled: 'admin.claims.fulfilledBy', cancelled: 'admin.claims.cancelledBy', refunded: 'admin.claims.refundedBy' } as const;

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
        help={t('admin.claims.reasonHelp')}
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

/** Takes back a gift that was already handed over: the points return to the employee, the items to stock if ticked. */
function RefundForm({ redemption, onDone }: { redemption: Redemption; onDone: () => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const errorMessage = useErrorMessage();
  const action = useRedemptionAction();
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    setSubmitted(true);
    if (reason.trim() === '') return;
    action.mutate(
      { id: redemption.id, action: 'refund', reason: reason.trim(), restock },
      {
        onSuccess: () => {
          notifySuccess(t(restock ? 'admin.claims.refundedRestocked' : 'admin.claims.refunded'));
          onDone();
        },
      },
    );
  };

  return (
    <Flex direction="column" gap="4">
      <Text fontSize="sm" fontWeight="medium">
        {t('admin.claims.refundBody', {
          name: redemption.employeeName,
          gift: localized(redemption.giftName),
          quantity: format.number(redemption.quantity),
          points: format.number(redemption.pointsSpent),
        })}
      </Text>
      <TextAreaField
        label={t('admin.ledger.reason')}
        help={t('admin.claims.reasonHelp')}
        required
        rows={2}
        value={reason}
        onChange={setReason}
        error={submitted && reason.trim() === '' ? t('admin.ledger.reasonRequired') : null}
      />
      <CheckboxField label={t('admin.claims.refundRestock', { gift: localized(redemption.giftName), quantity: format.number(redemption.quantity) })} help={t('admin.claims.refundRestockHelp')} value={restock} onChange={setRestock} />
      {action.error && <Notice tone="error" title={errorMessage(action.error)} />}
      <FormActions>
        <Button variant="outline" onClick={onDone}>
          {t('app.back')}
        </Button>
        <Button colorPalette="red" loading={action.isPending} onClick={submit}>
          {t('admin.claims.refundConfirm')}
        </Button>
      </FormActions>
    </Flex>
  );
}

interface ClaimRowProps {
  claim: Redemption;
  /** Just marked as fulfilled: the row shows its success moment before it leaves the list. */
  celebrating: boolean;
  busy: boolean;
  /** No buttons: an auditor reads the list, only gift admins and system admins act on it. */
  readOnly: boolean;
  /** Say the status on every row: a list that mixes them (the lookup page). */
  showStatus: boolean;
  showEmployee: boolean;
  onFulfill: () => void;
  onReopen: () => void;
  onCancel: () => void;
  onRefund: () => void;
}

function ClaimRow({ claim, celebrating, busy, readOnly, showStatus, showEmployee, onFulfill, onReopen, onCancel, onRefund }: ClaimRowProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const gift = localized(claim.giftName);
  const closed = claim.closedAt ? `${claim.closedByName ?? t('admin.audit.system')} · ${format.dateTime(claim.closedAt)}` : null;
  // The reason belongs to a cancellation or a refund; a claim that is open again does not show an old one.
  const stacked = claim.status === 'fulfilled' && !celebrating && !readOnly;
  const note = (claim.status === 'cancelled' || claim.status === 'refunded') && claim.note ? claim.note : null;

  return (
    <Grid
      templateAreas={areas(note !== null, showEmployee)}
      templateColumns={{ base: 'minmax(0, 1fr) auto', xl: showEmployee ? COLUMNS : COLUMNS_ONE_PERSON }}
      columnGap="3"
      rowGap="2"
      alignItems="center"
      px={{ base: '3', md: '4' }}
      py="3"
      bg={celebrating ? 'green.subtle' : 'bg.panel'}
      transition="background-color 240ms"
      _hover={celebrating ? undefined : { bg: 'bg.subtle' }}
    >
      {showEmployee && (
        <Box gridArea="employee" minW="0">
          <Text fontWeight="bold" lineHeight="1.35" truncate>
            <EmployeeLink id={claim.employeeId}>{claim.employeeName}</EmployeeLink>
          </Text>
          <Text fontSize="xs" color="fg.muted" fontWeight="medium">
            {claim.employeeNo}
          </Text>
        </Box>
      )}

      <Flex gridArea="gift" align="center" gap="3" minW="0">
        {/* The picture comes with the claim, so a gift that has been disabled since still shows it. */}
        <GiftThumb images={claim.giftImage ? [claim.giftImage] : []} size={40} shape="square" />
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
        {/* A list of every status says which one each row is in, under the date. */}
        {showStatus && (
          <Box as="span" display="block" mt="1">
            <RedemptionStatusBadge value={claim.status} />
          </Box>
        )}
      </Text>

      {note !== null && (
        <Text gridArea="note" fontSize="sm" fontWeight="medium" color="fg.muted" lineHeight="1.4" wordBreak="break-word">
          {t('admin.claims.reason', { reason: note })}
        </Text>
      )}

      {/* A handed-over claim has two actions: they sit under the "fulfilled by" line, so every row of the list has the same shape. */}
      <Flex gridArea="action" direction={stacked ? 'column' : 'row'} justify={stacked ? 'center' : 'flex-end'} align={stacked ? 'flex-end' : 'center'} gap={stacked ? '1.5' : '2'} wrap={stacked ? 'nowrap' : 'wrap'} minH="9">
        {celebrating ? (
          <Flex align="center" gap="3" role="status" color="green.fg" fontWeight="extrabold" fontSize="sm">
            {t('admin.claims.fulfilledMoment')}
            <StatusBurst tone="success" size={36} />
          </Flex>
        ) : claim.status === 'requested' && readOnly ? (
          // Nothing to do for a reader; the tab (or the chip under the date) already says "to hand over".
          !showStatus && <RedemptionStatusBadge value={claim.status} />
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
              <Text fontSize="xs" fontWeight="extrabold" color={claim.status === 'fulfilled' ? 'green.fg' : claim.status === 'refunded' ? 'orange.fg' : 'fg.muted'} lineHeight="1.3">
                {t(CLOSED_BY[claim.status])}
              </Text>
              {closed && (
                <Text fontSize="xs" color="fg.muted" fontWeight="medium" fontVariantNumeric="tabular-nums" lineHeight="1.4">
                  {closed}
                </Text>
              )}
            </Box>
            {claim.status === 'fulfilled' && !readOnly && (
              <Flex gap="2" flexShrink={0}>
                <Button size="xs" variant="outline" loading={busy} onClick={onReopen} aria-label={`${t('admin.claims.undo')}: ${claim.employeeName}, ${gift}`}>
                  <Undo2 aria-hidden />
                  {t('admin.claims.undo')}
                </Button>
                <Button size="xs" variant="outline" colorPalette="red" disabled={busy} onClick={onRefund} aria-label={`${t('admin.claims.refund')}: ${claim.employeeName}, ${gift}`}>
                  <HandCoins aria-hidden />
                  {t('admin.claims.refund')}
                </Button>
              </Flex>
            )}
          </>
        )}
      </Flex>
    </Grid>
  );
}

interface ClaimsListProps {
  filters: RedemptionFilters;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  /** `false` on a page that is about one person already (the lookup page). */
  showEmployee?: boolean;
  emptyMessage: string;
}

/**
 * Claims as rows with their actions and a pager: one tab of the claims page, or one person's claims on the
 * lookup page (`filters.status === null`: every status, each row says which). Gift admins and system admins
 * hand over, reopen, cancel and refund; an auditor gets the same rows without buttons.
 */
export function ClaimsList({ filters, page, pageSize, onPage, showEmployee = true, emptyMessage }: ClaimsListProps) {
  const { t } = useTranslation();
  const me = useSession();
  const localized = useLocalized();
  const errorMessage = useErrorMessage();
  const redemptions = useAdminRedemptions(filters, page, pageSize);
  const action = useRedemptionAction();
  const [busy, setBusy] = useState<number[]>([]);
  const [cancelling, setCancelling] = useState<Redemption | null>(null);
  const [refunding, setRefunding] = useState<Redemption | null>(null);
  // Rows that were just fulfilled stay where they were for a moment, although the server list has already dropped them.
  const [held, setHeld] = useState<{ claim: Redemption; index: number }[]>([]);
  const readOnly = !can.manageGifts(me);
  const showStatus = filters.status === null;

  // The last row of a page left (handed over, cancelled): go back to a page that exists.
  const pages = redemptions.data ? Math.max(1, Math.ceil(redemptions.data.total / pageSize)) : null;
  useEffect(() => {
    if (pages !== null && !redemptions.isPlaceholderData && page > pages) onPage(pages);
  }, [pages, page, redemptions.isPlaceholderData, onPage]);

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
      // A list of every status keeps the row (it only changes its state), so there is nothing to hold back.
      if (showStatus) return notifySuccess(t('admin.claims.fulfilledMoment'));
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

  const columns = showEmployee ? COLUMNS : COLUMNS_ONE_PERSON;
  return (
    <TableBlock>
      {rows.length === 0 ? (
        <EmptyState message={emptyMessage} icon={<PackageCheck size={26} strokeWidth={2.2} aria-hidden />} />
      ) : (
        <Box borderWidth="2px" borderColor="border" borderRadius="l2" bg="bg.panel" boxShadow="0 4px 0 0 {colors.border}" overflow="hidden">
          <Grid display={{ base: 'none', xl: 'grid' }} templateColumns={columns} columnGap="3" px="4" py="2.5" bg="bg.subtle" borderBottomWidth="1px" borderColor="border" aria-hidden>
            {showEmployee && <Eyebrow>{t('admin.claims.columns.employee')}</Eyebrow>}
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
                    celebrating={held.some((entry) => entry.claim.id === claim.id)}
                    busy={busy.includes(claim.id)}
                    readOnly={readOnly}
                    showStatus={showStatus}
                    showEmployee={showEmployee}
                    onFulfill={() => fulfill(claim, index)}
                    onReopen={() => confirmReopen(claim)}
                    onCancel={() => setCancelling(claim)}
                    onRefund={() => setRefunding(claim)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </Box>
        </Box>
      )}
      {redemptions.data && redemptions.data.total > 0 && <Pager page={page} pageSize={pageSize} total={redemptions.data.total} onChange={onPage} />}

      <Modal opened={cancelling !== null} onClose={() => setCancelling(null)} title={t('admin.claims.cancelTitle')}>
        {cancelling && <CancelForm key={cancelling.id} redemption={cancelling} onDone={() => setCancelling(null)} />}
      </Modal>
      <Modal opened={refunding !== null} onClose={() => setRefunding(null)} title={t('admin.claims.refundTitle')}>
        {refunding && <RefundForm key={refunding.id} redemption={refunding} onDone={() => setRefunding(null)} />}
      </Modal>
    </TableBlock>
  );
}
