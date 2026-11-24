import { Code, Text } from '@chakra-ui/react';
import { History } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudit } from '../../api/admin';
import type { AuditEntry } from '../../api/types';
import { Page } from '../../components/Page';
import { Pager } from '../../components/states';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useFormat } from '../../i18n/hooks';
import { TableBlock } from './parts';

const PAGE_SIZE = 50;

/** Who changed what, and when. Read-only for everyone who can open it. */
export function AuditPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const [page, setPage] = useState(1);
  const audit = useAudit(page, PAGE_SIZE);

  const columns: Column<AuditEntry>[] = [
    { key: 'time', header: t('admin.audit.columns.time'), shrink: true, numeric: true, cell: (entry) => format.dateTime(entry.createdAt) },
    {
      key: 'actor',
      header: t('admin.audit.columns.actor'),
      cell: (entry) => (
        <Text fontWeight="bold" color={entry.actorName ? undefined : 'fg.muted'}>
          {entry.actorName ?? t('admin.audit.system')}
        </Text>
      ),
    },
    {
      key: 'action',
      header: t('admin.audit.columns.action'),
      cell: (entry) => (
        <Code size="sm" variant="surface" colorPalette="gray" whiteSpace="nowrap">
          {entry.action}
        </Code>
      ),
    },
    {
      key: 'entity',
      header: t('admin.audit.columns.entity'),
      cell: (entry) => (
        <Text whiteSpace="nowrap">
          {entry.entityType}
          {entry.entityId ? ` #${entry.entityId}` : ''}
        </Text>
      ),
    },
    { key: 'summary', header: t('admin.audit.columns.summary'), cell: (entry) => <Text color={entry.summary ? undefined : 'fg.muted'}>{entry.summary ?? '–'}</Text> },
  ];

  return (
    <Page title={t('admin.audit.title')} subtitle={t('admin.audit.subtitle')}>
      <TableBlock>
        <DataTable
          columns={columns}
          rows={audit.data?.items}
          rowKey={(entry) => entry.id}
          minWidth={760}
          loading={audit.isPending}
          error={audit.error}
          onRetry={() => void audit.refetch()}
          stale={audit.isPlaceholderData}
          emptyMessage={t('admin.audit.empty')}
          emptyIcon={<History size={26} strokeWidth={2.2} aria-hidden />}
        />
        {audit.data && audit.data.total > 0 && <Pager page={page} pageSize={PAGE_SIZE} total={audit.data.total} onChange={setPage} />}
      </TableBlock>
    </Page>
  );
}
