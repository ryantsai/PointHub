import { Badge, Button, Flex, Text } from '@chakra-ui/react';
import { ReceiptText, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRevertTransaction, useTransactions, type TransactionFilters } from '../../api/admin';
import type { Transaction } from '../../api/types';
import { TransactionTypeBadge } from '../../components/badges';
import { Pager } from '../../components/states';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { TextAreaField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../components/ui/Notice';
import { useErrorMessage, useFormat, useLocalized } from '../../i18n/hooks';
import { notifySuccess } from '../../lib/notify';
import { can } from '../../lib/roles';
import { useSession } from '../../lib/session';
import { EmployeeLink, FormActions, LinkButton, TwoLine } from './parts';

function RevertForm({ tx, onDone }: { tx: Transaction; onDone: () => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const revert = useRevertTransaction();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    setSubmitted(true);
    if (reason.trim() === '') return;
    revert.mutate(
      { id: tx.id, reason: reason.trim() },
      {
        onSuccess: () => {
          notifySuccess(t('admin.ledger.reverted'));
          onDone();
        },
      },
    );
  };

  return (
    <Flex direction="column" gap="4">
      <Text fontSize="sm" fontWeight="medium">
        {t('admin.ledger.revertBody', { id: tx.id, name: tx.employeeName, amount: format.signed(tx.amount), reversal: format.signed(-tx.amount) })}
      </Text>
      <TextAreaField
        label={t('admin.ledger.reason')}
        required
        rows={2}
        value={reason}
        onChange={setReason}
        error={submitted && reason.trim() === '' ? t('admin.ledger.reasonRequired') : null}
      />
      {revert.error && <Notice tone="error" title={errorMessage(revert.error)} />}
      <FormActions>
        <Button variant="outline" onClick={onDone}>
          {t('app.cancel')}
        </Button>
        <Button colorPalette="red" loading={revert.isPending} onClick={submit}>
          {t('admin.ledger.revert')}
        </Button>
      </FormActions>
    </Flex>
  );
}

interface LedgerTableProps {
  filters: TransactionFilters;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  /** `false` on a page that is about one person already (the lookup page). */
  showEmployee?: boolean;
  /** Makes the event title a "show only this event" filter. */
  onFilterEvent?: (eventId: number) => void;
  emptyMessage: string;
}

/**
 * Point movements as a table with its pager: the ledger page and the history tab of the lookup page. System
 * admins get "Revert" on each row that can still be reverted; auditors only read.
 */
export function LedgerTable({ filters, page, pageSize, onPage, showEmployee = true, onFilterEvent, emptyMessage }: LedgerTableProps) {
  const { t } = useTranslation();
  const me = useSession();
  const format = useFormat();
  const localized = useLocalized();
  const transactions = useTransactions(filters, page, pageSize);
  const [reverting, setReverting] = useState<Transaction | null>(null);
  const isAdmin = can.admin(me);

  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      header: t('admin.ledger.columns.date'),
      shrink: true,
      numeric: true,
      cell: (tx) => <TwoLine strong={false} primary={format.dateTime(tx.createdAt)} secondary={`#${tx.id}`} />,
    },
    ...(showEmployee
      ? [
          {
            key: 'employee',
            header: t('admin.ledger.columns.employee'),
            cell: (tx) => <TwoLine primary={<EmployeeLink id={tx.employeeId}>{tx.employeeName}</EmployeeLink>} secondary={tx.employeeNo} />,
          } satisfies Column<Transaction>,
        ]
      : []),
    { key: 'type', header: t('admin.ledger.columns.type'), cell: (tx) => <TransactionTypeBadge value={tx.type} /> },
    {
      key: 'amount',
      header: t('admin.ledger.columns.amount'),
      align: 'end',
      numeric: true,
      cell: (tx) => (
        <Text as="span" fontWeight="black" color={tx.amount >= 0 ? 'gain' : 'loss'} textDecoration={tx.reversedByTransactionId !== null ? 'line-through' : undefined} whiteSpace="nowrap">
          {format.signed(tx.amount)}
        </Text>
      ),
    },
    {
      key: 'details',
      header: t('admin.ledger.columns.details'),
      cell: (tx) => {
        const eventTitle = tx.eventId === null ? null : tx.eventTitle ? localized(tx.eventTitle) : t('admin.ledger.filterEvent', { id: tx.eventId });
        return (
          <Flex direction="column" align="flex-start" gap="0.5" maxW="340px">
            {tx.eventId !== null &&
              (onFilterEvent ? (
                <LinkButton fontWeight="semibold" title={t('admin.ledger.filterByEvent')} onClick={() => onFilterEvent(tx.eventId!)}>
                  {eventTitle}
                </LinkButton>
              ) : (
                <Text fontWeight="semibold" lineHeight="1.35">
                  {eventTitle}
                </Text>
              ))}
            {tx.giftName && (
              <Text fontWeight="semibold" lineHeight="1.35">
                {localized(tx.giftName)}
              </Text>
            )}
            {tx.reason && (
              <Text lineHeight="1.4" wordBreak="break-word">
                {tx.reason}
              </Text>
            )}
            {tx.externalReference && (
              <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                {t('admin.ledger.externalReference', { reference: tx.externalReference })}
              </Text>
            )}
            {tx.reversesTransactionId !== null && (
              <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                {t('admin.ledger.reverses', { id: tx.reversesTransactionId })}
              </Text>
            )}
            {tx.reversedByTransactionId !== null && (
              <Badge size="xs" colorPalette="orange" variant="subtle">
                {t('admin.ledger.revertedBy', { id: tx.reversedByTransactionId })}
              </Badge>
            )}
          </Flex>
        );
      },
    },
    {
      key: 'by',
      header: t('admin.ledger.columns.by'),
      cell: (tx) =>
        tx.apiClientName ? (
          <Badge size="sm" variant="outline" colorPalette="cyan" title={t('admin.ledger.viaApi')}>
            {tx.apiClientName}
          </Badge>
        ) : (
          <Text color={tx.createdByName ? undefined : 'fg.muted'}>{tx.createdByName ?? t('admin.audit.system')}</Text>
        ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            shrink: true,
            align: 'end',
            cell: (tx) =>
              // A claim's debit goes back through cancel or refund on the claims page, never from here.
              tx.type !== 'reversal' &&
              tx.type !== 'redemption' &&
              tx.reversedByTransactionId === null && (
                <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setReverting(tx)} aria-label={`${t('admin.ledger.revert')} #${tx.id}`}>
                  <Undo2 aria-hidden />
                  {t('admin.ledger.revert')}
                </Button>
              ),
          } satisfies Column<Transaction>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={transactions.data?.items}
        rowKey={(tx) => tx.id}
        minWidth={showEmployee ? 900 : 760}
        loading={transactions.isPending}
        error={transactions.error}
        onRetry={() => void transactions.refetch()}
        stale={transactions.isPlaceholderData}
        emptyMessage={emptyMessage}
        emptyIcon={<ReceiptText size={26} strokeWidth={2.2} aria-hidden />}
      />
      {transactions.data && transactions.data.total > 0 && <Pager page={page} pageSize={pageSize} total={transactions.data.total} onChange={onPage} />}

      <Modal opened={reverting !== null} onClose={() => setReverting(null)} title={t('admin.ledger.revertTitle')}>
        {reverting && <RevertForm key={reverting.id} tx={reverting} onDone={() => setReverting(null)} />}
      </Modal>
    </>
  );
}
