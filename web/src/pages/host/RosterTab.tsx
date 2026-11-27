import { Badge, Box, Button, Flex, SegmentGroup, Text } from '@chakra-ui/react';
import { BadgeCheck, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAwardRoster, useImportRoster, useRematchRoster, useRoster } from '../../api/host';
import type { EventDetail, RosterAwardResult, RosterEntry, RosterImportResult } from '../../api/types';
import { CheckInStatusBadge, RosterMatchBadge } from '../../components/badges';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { CheckboxField } from '../../components/ui/fields';
import { FileDropZone } from '../../components/ui/FileDropZone';
import { Notice } from '../../components/ui/Notice';
import { Panel } from '../../components/ui/Panel';
import { useErrorMessage, useFormat } from '../../i18n/hooks';
import { openConfirm } from '../../lib/confirm';
import { springs } from '../../lib/motion';
import { notifyError } from '../../lib/notify';

// Windows reports .csv as an Excel type when Excel is installed, so accept both (and the bare extension).
const CSV_ACCEPT = ['text/csv', 'application/vnd.ms-excel', '.csv'];
const TEMPLATE = '﻿employeeNo,name,email\r\nE0001,Example Employee,employee@example.com\r\n';

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'roster-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function ImportSummary({ result }: { result: RosterImportResult }) {
  const { t } = useTranslation();
  const format = useFormat();
  const problems = result.notFound + result.inactive + result.duplicate;
  const tallies = [
    { key: 'matched', palette: 'green', count: result.matched },
    { key: 'notFound', palette: 'red', count: result.notFound },
    { key: 'inactive', palette: 'orange', count: result.inactive },
    { key: 'duplicate', palette: 'yellow', count: result.duplicate },
  ] as const;
  return (
    <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={springs.bouncy}>
      <Notice tone={problems > 0 ? 'warning' : 'success'} title={t('host.roster.importDone', { count: result.total })} role="status">
        <Flex gap="2" wrap="wrap" mt="1">
          {tallies.map((tally) => (
            // The summary sits on a tinted box, so the chips are solid outlines rather than tints on a tint.
            <Badge key={tally.key} colorPalette={tally.palette} variant="surface" size="md" px="2.5" opacity={tally.count === 0 ? 0.7 : 1} fontVariantNumeric="tabular-nums">
              {t(`rosterMatch.${tally.key}`)}: {format.number(tally.count)}
            </Badge>
          ))}
        </Flex>
        {problems > 0 && (
          <Text fontSize="sm" mt="2">
            {t('host.roster.problemsHint')}
          </Text>
        )}
      </Notice>
    </motion.div>
  );
}

const SKIPS_SHOWN = 8;

function AwardSummary({ result }: { result: RosterAwardResult }) {
  const { t } = useTranslation();
  const format = useFormat();
  const tallies = [
    { key: 'awarded', palette: 'green', count: result.awarded },
    { key: 'approvedPending', palette: 'green', count: result.approvedPending },
    { key: 'alreadyAwarded', palette: 'gray', count: result.alreadyAwarded },
    { key: 'skipped', palette: 'orange', count: result.skipped.length },
  ] as const;
  return (
    <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={springs.bouncy}>
      <Notice tone={result.skipped.length > 0 ? 'warning' : 'success'} title={t('host.roster.award.done', { count: result.awarded + result.approvedPending })} role="status">
        <Flex gap="2" wrap="wrap" mt="1">
          {tallies.map((tally) => (
            <Badge key={tally.key} colorPalette={tally.palette} variant="surface" size="md" px="2.5" opacity={tally.count === 0 ? 0.7 : 1} fontVariantNumeric="tabular-nums">
              {t(`host.roster.award.${tally.key}`)}: {format.number(tally.count)}
            </Badge>
          ))}
        </Flex>
        {result.skipped.length > 0 && (
          <Box as="ul" mt="2" fontSize="sm" listStyleType="disc" ps="5">
            {result.skipped.slice(0, SKIPS_SHOWN).map((skip) => (
              <li key={skip.employeeNo}>
                <Text as="span" fontWeight="bold">{skip.employeeNo}</Text>
                {skip.name ? ` ${skip.name}` : ''} – {t(`host.roster.award.reasons.${skip.reason}`)}
              </li>
            ))}
            {result.skipped.length > SKIPS_SHOWN && <li>{t('host.roster.award.more', { count: result.skipped.length - SKIPS_SHOWN })}</li>}
          </Box>
        )}
      </Notice>
    </motion.div>
  );
}

/** Award the event's points to everyone matched on the roster: for online events, or attendance recorded elsewhere. */
function AwardFromRoster({ event, entries }: { event: EventDetail; entries: RosterEntry[] | undefined }) {
  const { t } = useTranslation();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const award = useAwardRoster(event.id);
  const [result, setResult] = useState<RosterAwardResult | null>(null);

  // People who would get points now: matched, and either not checked in yet or still waiting for approval.
  const eligible = new Set(
    (entries ?? [])
      .filter((entry) => entry.matchStatus === 'matched' && (entry.checkInStatus === null || entry.checkInStatus === 'pending'))
      .map((entry) => entry.employeeId),
  ).size;
  const allowed = event.status === 'open' || event.status === 'closed';

  const confirm = () =>
    openConfirm({
      title: t('host.roster.award.confirmTitle'),
      children: <Text fontSize="sm">{t('host.roster.award.confirmBody', { count: eligible, points: format.number(event.points) })}</Text>,
      labels: { confirm: t('host.roster.award.button'), cancel: t('app.cancel') },
      onConfirm: () => award.mutate(undefined, { onSuccess: setResult, onError: (error) => notifyError(errorMessage(error)) }),
    });

  return (
    <Panel gap="3">
      <Flex gap="3" align="flex-start" justify="space-between" wrap="wrap">
        <Flex gap="3" align="flex-start" flex="1" minW="16rem">
          <Box color="accent.fg" bg="accent.subtle" borderRadius="l2" p="2" flexShrink={0}>
            <BadgeCheck size={22} strokeWidth={2.5} aria-hidden />
          </Box>
          <Box>
            <Text fontWeight="bold">{t('host.roster.award.title')}</Text>
            <Text fontSize="sm" color="fg.muted">{t('host.roster.award.hint')}</Text>
          </Box>
        </Flex>
        <Button data-action="award-roster" colorPalette="accent" loading={award.isPending} disabled={!allowed || eligible === 0} onClick={confirm}>
          <BadgeCheck strokeWidth={2.5} aria-hidden />
          {t('host.roster.award.buttonCount', { count: eligible })}
        </Button>
      </Flex>
      {!allowed && <Text fontSize="sm" color="fg.muted">{t('host.roster.award.notAllowed')}</Text>}
      {result && <AwardSummary result={result} />}
    </Panel>
  );
}

export function RosterTab({ event }: { event: EventDetail }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const roster = useRoster(event.id);
  const importRoster = useImportRoster(event.id);
  const rematch = useRematchRoster(event.id);
  const [replace, setReplace] = useState(true);
  const [onlyUnmatched, setOnlyUnmatched] = useState(false);
  const [result, setResult] = useState<RosterImportResult | null>(null);

  const onError = (error: unknown) => notifyError(errorMessage(error));
  const entries = roster.data?.filter((entry) => !onlyUnmatched || entry.matchStatus !== 'matched');

  const columns: Column<RosterEntry>[] = [
    { key: 'employeeNo', header: t('host.roster.columns.employeeNo'), cell: (entry) => <Text fontWeight="bold">{entry.employeeNo}</Text> },
    { key: 'name', header: t('host.roster.columns.name'), cell: (entry) => entry.name ?? '–' },
    { key: 'email', header: t('host.roster.columns.email'), cell: (entry) => entry.email ?? '–' },
    { key: 'match', header: t('host.roster.columns.match'), cell: (entry) => <RosterMatchBadge value={entry.matchStatus} /> },
    { key: 'employee', header: t('host.roster.columns.employee'), cell: (entry) => entry.employeeName ?? '–' },
    { key: 'checkIn', header: t('host.roster.columns.checkIn'), cell: (entry) => <CheckInStatusBadge value={entry.checkInStatus} size="sm" /> },
  ];

  return (
    <Flex direction="column" gap="4">
      <FileDropZone
        accept={CSV_ACCEPT}
        loading={importRoster.isPending}
        onDrop={(files) => importRoster.mutate({ file: files[0], replace }, { onSuccess: setResult, onError })}
        onReject={() => notifyError(t('errors.invalid_csv'))}
        title={t('host.roster.dropTitle')}
        hint={t('host.roster.dropHint')}
        icon={<FileSpreadsheet size={34} strokeWidth={2} aria-hidden />}
      />

      <Flex direction="column" gap="2">
        <Flex justify="space-between" align="center" wrap="wrap" gap="3">
          <CheckboxField label={t('host.roster.replace')} value={replace} onChange={setReplace} />
          <Flex gap="2" wrap="wrap">
            <Button variant="ghost" onClick={downloadTemplate}>
              <Download strokeWidth={2.5} aria-hidden />
              {t('host.roster.template')}
            </Button>
            <Button variant="outline" loading={rematch.isPending} disabled={event.counts.roster === 0} onClick={() => rematch.mutate(undefined, { onSuccess: setResult, onError })}>
              <RefreshCw strokeWidth={2.5} aria-hidden />
              {t('host.roster.rematch')}
            </Button>
          </Flex>
        </Flex>
        <Text fontSize="xs" fontWeight="medium" color="fg.muted" textShadow="0 0 2px {colors.bg}, 0 0 6px {colors.bg}">
          {t('host.roster.rematchHint')}
        </Text>
      </Flex>

      {result && <ImportSummary result={result} />}

      {event.counts.roster > 0 && <AwardFromRoster event={event} entries={roster.data} />}

      <Box overflowX="auto" maxW="full" alignSelf="flex-start">
        <SegmentGroup.Root size="sm" value={onlyUnmatched ? 'unmatched' : 'all'} onValueChange={(details) => details.value && setOnlyUnmatched(details.value === 'unmatched')}>
          <SegmentGroup.Indicator />
          <SegmentGroup.Item value="all">
            <SegmentGroup.ItemText>{`${t('app.all')} (${event.counts.roster})`}</SegmentGroup.ItemText>
            <SegmentGroup.ItemHiddenInput />
          </SegmentGroup.Item>
          <SegmentGroup.Item value="unmatched">
            <SegmentGroup.ItemText>{`${t('host.roster.unmatched')} (${event.counts.rosterUnmatched})`}</SegmentGroup.ItemText>
            <SegmentGroup.ItemHiddenInput />
          </SegmentGroup.Item>
        </SegmentGroup.Root>
      </Box>

      <DataTable
        columns={columns}
        rows={entries}
        rowKey={(entry) => entry.id}
        minWidth={680}
        loading={roster.isPending}
        error={roster.error}
        onRetry={() => void roster.refetch()}
        emptyMessage={roster.data?.length === 0 ? t('host.roster.empty') : t('host.roster.noUnmatched')}
      />
    </Flex>
  );
}
