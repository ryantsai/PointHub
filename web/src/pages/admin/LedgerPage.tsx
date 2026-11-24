import { Badge, Box, Button, Flex, Tag, Text } from '@chakra-ui/react';
import { SlidersHorizontal, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useRevertTransaction, useTransactions } from '../../api/admin';
import type { Transaction, TransactionType } from '../../api/types';
import { TransactionTypeBadge } from '../../components/badges';
import { Page } from '../../components/Page';
import { Pager } from '../../components/states';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SelectField, TextAreaField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../components/ui/Notice';
import { SearchField } from '../../components/ui/SearchField';
import { useErrorMessage, useFormat, useLocalized } from '../../i18n/hooks';
import { useDebouncedValue } from '../../lib/hooks';
import { notifySuccess } from '../../lib/notify';
import { can } from '../../lib/roles';
import { useSession } from '../../lib/session';
import { AdjustPointsForm } from './AdjustPointsForm';
import { FormActions, LinkButton, TableBlock, Toolbar, TwoLine } from './parts';

const PAGE_SIZE = 25;
const TYPES: TransactionType[] = ['eventAward', 'redemption', 'adjustment', 'reversal', 'expiry', 'externalCredit', 'externalDebit'];

function toId(value: string | null): number | null {
  const id = Number(value);
  return value !== null && Number.isInteger(id) && id > 0 ? id : null;
}

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

/** Every point movement. System admins can revert a row or adjust a balance; auditors only read. */
export function LedgerPage() {
  const { t } = useTranslation();
  const me = useSession();
  const format = useFormat();
  const localized = useLocalized();
  const [params, setParams] = useSearchParams();
  const employeeId = toId(params.get('employeeId'));
  const eventId = toId(params.get('eventId'));
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search, 300);
  const [type, setType] = useState<TransactionType | null>(null);
  const [page, setPage] = useState(1);
  const [reverting, setReverting] = useState<Transaction | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const transactions = useTransactions({ employeeId, eventId, type, q, page, pageSize: PAGE_SIZE });
  const isAdmin = can.admin(me);

  /** Employee and event filters live in the URL so a filtered ledger can be linked or bookmarked. */
  const setUrlFilter = (key: 'employeeId' | 'eventId', value: number | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, String(value));
    setParams(next, { replace: true });
    setPage(1);
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      header: t('admin.ledger.columns.date'),
      shrink: true,
      numeric: true,
      cell: (tx) => <TwoLine strong={false} primary={format.dateTime(tx.createdAt)} secondary={`#${tx.id}`} />,
    },
    {
      key: 'employee',
      header: t('admin.ledger.columns.employee'),
      cell: (tx) => <TwoLine primary={<LinkButton onClick={() => setUrlFilter('employeeId', tx.employeeId)}>{tx.employeeName}</LinkButton>} secondary={tx.employeeNo} />,
    },
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
      cell: (tx) => (
        <Flex direction="column" align="flex-start" gap="0.5" maxW="340px">
          {tx.eventId !== null && (
            <LinkButton fontWeight="semibold" onClick={() => setUrlFilter('eventId', tx.eventId)}>
              {tx.eventTitle ? localized(tx.eventTitle) : t('admin.ledger.filterEvent', { id: tx.eventId })}
            </LinkButton>
          )}
          {tx.reason && <Text lineHeight="1.4">{tx.reason}</Text>}
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
      ),
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
              tx.type !== 'reversal' &&
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
    <Page
      title={t('admin.ledger.title')}
      subtitle={t('admin.ledger.subtitle')}
      actions={
        isAdmin && (
          <Button onClick={() => setAdjusting(true)}>
            <SlidersHorizontal aria-hidden />
            {t('admin.ledger.adjust')}
          </Button>
        )
      }
    >
      <TableBlock>
        <Toolbar>
          <SearchField flex="1" minW="220px" maxW="420px" label={t('admin.ledger.search')} value={search} onChange={(value) => { setSearch(value); setPage(1); }} />
          <Box w={{ base: 'full', sm: '220px' }}>
            <SelectField
              aria-label={t('admin.ledger.type')}
              placeholder={t('admin.ledger.allTypes')}
              data={TYPES.map((value) => ({ value, label: t(`txType.${value}`) }))}
              value={type}
              onChange={(value) => {
                setType(value);
                setPage(1);
              }}
            />
          </Box>
          {employeeId !== null && (
            <Tag.Root size="lg" colorPalette="brand" variant="subtle" borderRadius="full">
              <Tag.Label fontWeight="bold">{t('admin.ledger.filterEmployee', { id: employeeId })}</Tag.Label>
              <Tag.EndElement>
                <Tag.CloseTrigger aria-label={t('admin.ledger.clearFilter')} onClick={() => setUrlFilter('employeeId', null)} />
              </Tag.EndElement>
            </Tag.Root>
          )}
          {eventId !== null && (
            <Tag.Root size="lg" colorPalette="brand" variant="subtle" borderRadius="full">
              <Tag.Label fontWeight="bold">{t('admin.ledger.filterEvent', { id: eventId })}</Tag.Label>
              <Tag.EndElement>
                <Tag.CloseTrigger aria-label={t('admin.ledger.clearFilter')} onClick={() => setUrlFilter('eventId', null)} />
              </Tag.EndElement>
            </Tag.Root>
          )}
        </Toolbar>

        <DataTable
          columns={columns}
          rows={transactions.data?.items}
          rowKey={(tx) => tx.id}
          minWidth={900}
          loading={transactions.isPending}
          error={transactions.error}
          onRetry={() => void transactions.refetch()}
          stale={transactions.isPlaceholderData}
          emptyMessage={t('admin.ledger.empty')}
        />
        {transactions.data && transactions.data.total > 0 && <Pager page={page} pageSize={PAGE_SIZE} total={transactions.data.total} onChange={setPage} />}
      </TableBlock>

      <Modal opened={reverting !== null} onClose={() => setReverting(null)} title={t('admin.ledger.revertTitle')}>
        {reverting && <RevertForm key={reverting.id} tx={reverting} onDone={() => setReverting(null)} />}
      </Modal>
      <Modal opened={adjusting} onClose={() => setAdjusting(false)} title={t('admin.ledger.adjustTitle')}>
        <AdjustPointsForm employee={null} onDone={() => setAdjusting(false)} />
      </Modal>
    </Page>
  );
}
