import { Badge, Box, Button, Flex, Grid, SegmentGroup, Text } from '@chakra-ui/react';
import { CircleCheck, CircleX, Gauge, Inbox, LayoutTemplate, Send, Server } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useEmailOutbox, useEmailSettings, useSendTestEmail } from '../../api/email';
import type { EmailLogEntry, EmailSettings, EmailStatus, EmailTemplateKey, Locale } from '../../api/types';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Page } from '../../components/Page';
import { ErrorBlock, LoadingBlock, Pager } from '../../components/states';
import { Eyebrow, SectionTitle } from '../../components/ui/bits';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SelectField, TextField } from '../../components/ui/fields';
import { Notice } from '../../components/ui/Notice';
import { Panel } from '../../components/ui/Panel';
import { SimpleTabs } from '../../components/ui/SimpleTabs';
import { useErrorMessage, useFormat, useLocale } from '../../i18n/hooks';
import { isLocale, LOCALE_LABELS, LOCALES } from '../../i18n/locale';
import { itemVariants } from '../../lib/motion';
import { useSession } from '../../lib/session';
import { EmailTemplates } from './EmailTemplates';
import { Form, TableBlock, TwoLine } from './parts';

const PAGE_SIZE = 25;
const TEMPLATE_KEYS: EmailTemplateKey[] = ['checkInApproved', 'checkInRejected', 'redemptionRequested', 'redemptionFulfilled', 'redemptionCancelled', 'pointsAdjusted'];
const STATUSES: EmailStatus[] = ['pending', 'sent', 'failed', 'skipped'];
const STATUS_COLORS: Record<EmailStatus, string> = { pending: 'yellow', sent: 'green', failed: 'red', skipped: 'gray' };

const isTemplateKey = (value: string | null): value is EmailTemplateKey => value !== null && (TEMPLATE_KEYS as string[]).includes(value);

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Flex justify="space-between" align="baseline" gap="4" py="2" borderBottomWidth="1px" borderColor="border" _last={{ borderBottomWidth: 0 }}>
      <Text fontSize="sm" color="fg.muted" fontWeight="semibold" flexShrink={0}>
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="bold" textAlign="end" wordBreak="break-word">
        {children}
      </Text>
    </Flex>
  );
}

/** Sends one message now and shows what the SMTP server answered. */
function TestEmailForm() {
  const { t } = useTranslation();
  const me = useSession();
  const uiLocale = useLocale();
  const errorMessage = useErrorMessage();
  const send = useSendTestEmail();
  const [to, setTo] = useState(me.email);
  const [key, setKey] = useState<EmailTemplateKey>('checkInApproved');
  const [locale, setLocale] = useState<Locale>(uiLocale);
  const [submitted, setSubmitted] = useState(false);
  const invalid = !/^\S+@\S+\.\S+$/.test(to.trim());

  return (
    <Form
      gap="3"
      onSubmit={() => {
        setSubmitted(true);
        if (!invalid) send.mutate({ to: to.trim(), key, locale });
      }}
    >
      <Eyebrow>{t('admin.email.testTitle')}</Eyebrow>
      <Grid templateColumns={{ base: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }} gap="3" alignItems="start">
        <Box gridColumn={{ sm: 'span 2' }}>
          <TextField
            label={t('admin.email.testTo')}
            type="email"
            autoComplete="off"
            value={to}
            onChange={(value) => {
              setTo(value);
              send.reset();
            }}
            error={submitted && invalid ? t('admin.email.testToInvalid') : null}
          />
        </Box>
        <SelectField label={t('admin.email.testTemplate')} data={TEMPLATE_KEYS.map((value) => ({ value, label: t(`admin.email.template.${value}.name`) }))} value={key} onChange={(value) => value && setKey(value)} />
        <SelectField label={t('app.language')} data={LOCALES.map((value) => ({ value, label: LOCALE_LABELS[value] }))} value={locale} onChange={(value) => value && setLocale(value)} />
      </Grid>
      <Flex>
        <Button type="submit" variant="outline" loading={send.isPending}>
          <Send aria-hidden />
          {t('admin.email.testSend')}
        </Button>
      </Flex>
      <Box aria-live="polite">
        {send.data?.ok && <Notice tone="success" title={t('admin.email.testOk', { to: send.variables?.to })} />}
        {send.data && !send.data.ok && (
          <Notice tone="error" title={t('admin.email.testFailed')}>
            <Text as="span" fontFamily="mono" fontSize="xs" wordBreak="break-word">
              {send.data.error}
            </Text>
          </Notice>
        )}
        {send.error && <Notice tone="error" title={errorMessage(send.error)} />}
      </Box>
    </Form>
  );
}

function SmtpPanel({ smtp }: { smtp: EmailSettings['smtp'] }) {
  const { t } = useTranslation();
  return (
    <Panel h="full">
      <SectionTitle icon={Server} title={t('admin.email.smtpTitle')} compact>
        <Badge colorPalette={smtp.configured ? 'green' : 'orange'} variant="subtle" size="md" px="2" gap="1">
          {smtp.configured ? <CircleCheck size={14} strokeWidth={2.6} aria-hidden /> : <CircleX size={14} strokeWidth={2.6} aria-hidden />}
          {smtp.configured ? t('admin.email.smtpConfigured') : t('admin.email.smtpNotConfigured')}
        </Badge>
      </SectionTitle>
      {!smtp.configured && <Notice tone="warning" title={t('admin.email.smtpMissing')} />}
      <Box>
        <InfoRow label={t('admin.email.smtpServer')}>{smtp.host ? `${smtp.host}:${smtp.port}` : '–'}</InfoRow>
        <InfoRow label={t('admin.email.smtpSecurity')}>{t(`admin.email.security.${smtp.security}`)}</InfoRow>
        <InfoRow label={t('admin.email.smtpFrom')}>{smtp.fromAddress ? (smtp.fromName ? `${smtp.fromName} <${smtp.fromAddress}>` : smtp.fromAddress) : '–'}</InfoRow>
        <InfoRow label={t('admin.email.smtpAuth')}>{smtp.authenticated ? t('admin.email.smtpAuthYes') : t('admin.email.smtpAuthNo')}</InfoRow>
      </Box>
      <Text fontSize="sm" color="fg.muted" fontWeight="medium">
        {t('admin.email.smtpReadOnly')}
      </Text>
      <Box borderTopWidth="2px" borderColor="border" pt="4">
        <TestEmailForm />
      </Box>
    </Panel>
  );
}

function Stat({ label, value, palette }: { label: string; value: number; palette: string }) {
  return (
    <Box colorPalette={palette} bg="colorPalette.subtle" borderWidth="2px" borderColor="colorPalette.muted" borderRadius="l2" px="4" py="3" minW="0">
      <Text fontFamily="heading" fontWeight="black" fontSize="3xl" lineHeight="1.1" color="colorPalette.fg" fontVariantNumeric="tabular-nums">
        <AnimatedNumber value={value} />
      </Text>
      <Text fontSize="sm" fontWeight="bold" color="fg.muted" lineHeight="1.3" mt="1">
        {label}
      </Text>
    </Box>
  );
}

function QueuePanel({ queue }: { queue: EmailSettings['queue'] }) {
  const { t } = useTranslation();
  return (
    <Panel h="full">
      <SectionTitle icon={Gauge} title={t('admin.email.queueTitle')} compact />
      <Grid templateColumns={{ base: 'repeat(3, minmax(0, 1fr))', lg: 'minmax(0, 1fr)' }} gap="3">
        <Stat label={t('admin.email.queuePending')} value={queue.pending} palette={queue.pending > 0 ? 'yellow' : 'gray'} />
        <Stat label={t('admin.email.queueFailed')} value={queue.failed} palette={queue.failed > 0 ? 'red' : 'gray'} />
        <Stat label={t('admin.email.queueSent')} value={queue.sentLast24Hours} palette="green" />
      </Grid>
      <Text fontSize="sm" color="fg.muted" fontWeight="medium">
        {t('admin.email.queueHelp')}
      </Text>
    </Panel>
  );
}

function Outbox() {
  const { t } = useTranslation();
  const format = useFormat();
  const [status, setStatus] = useState<EmailStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const outbox = useEmailOutbox(status === 'all' ? null : status, page, PAGE_SIZE);

  const columns: Column<EmailLogEntry>[] = [
    { key: 'created', header: t('admin.email.columns.created'), shrink: true, numeric: true, cell: (entry) => format.dateTime(entry.createdAt) },
    { key: 'to', header: t('admin.email.columns.to'), cell: (entry) => <Text fontWeight="bold">{entry.to}</Text> },
    {
      key: 'subject',
      header: t('admin.email.columns.subject'),
      cell: (entry) => <TwoLine strong={false} primary={entry.subject} secondary={entry.templateKey ? t(`admin.email.template.${entry.templateKey}.name`) : undefined} />,
    },
    {
      key: 'status',
      header: t('admin.email.columns.status'),
      cell: (entry) => (
        <Badge colorPalette={STATUS_COLORS[entry.status]} variant="subtle" px="2">
          {t(`admin.email.status.${entry.status}`)}
        </Badge>
      ),
    },
    { key: 'attempts', header: t('admin.email.columns.attempts'), align: 'end', numeric: true, cell: (entry) => format.number(entry.attempts) },
    {
      key: 'result',
      header: t('admin.email.columns.result'),
      cell: (entry) =>
        entry.lastError ? (
          <Text fontSize="xs" fontWeight="semibold" color="loss" maxW="280px" lineClamp={2} title={entry.lastError}>
            {entry.lastError}
          </Text>
        ) : entry.sentAt ? (
          <Text whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
            {format.dateTime(entry.sentAt)}
          </Text>
        ) : (
          <Text color="fg.muted">–</Text>
        ),
    },
  ];

  return (
    <TableBlock>
      <Box overflowX="auto" mx="-1" px="1" pb="1">
        <SegmentGroup.Root
          size="sm"
          value={status}
          onValueChange={(details) => {
            if (!details.value) return;
            setStatus(details.value as EmailStatus | 'all');
            setPage(1);
          }}
          aria-label={t('admin.email.columns.status')}
        >
          <SegmentGroup.Indicator />
          {(['all', ...STATUSES] as const).map((value) => (
            <SegmentGroup.Item key={value} value={value}>
              <SegmentGroup.ItemText whiteSpace="nowrap">{value === 'all' ? t('app.all') : t(`admin.email.status.${value}`)}</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          ))}
        </SegmentGroup.Root>
      </Box>
      <DataTable
        columns={columns}
        rows={outbox.data?.items}
        rowKey={(entry) => entry.id}
        minWidth={860}
        loading={outbox.isPending}
        error={outbox.error}
        onRetry={() => void outbox.refetch()}
        stale={outbox.isPlaceholderData}
        emptyMessage={t('admin.email.outboxEmpty')}
      />
      {outbox.data && outbox.data.total > 0 && <Pager page={page} pageSize={PAGE_SIZE} total={outbox.data.total} onChange={setPage} />}
    </TableBlock>
  );
}

type Tab = 'templates' | 'outbox';

/**
 * Email: SMTP status and a test message, queue numbers, the six notification templates and the outbox log.
 * `/admin/email?template=<key>&locale=<locale>` opens that template's editor; `?tab=outbox` the log.
 */
export function EmailPage() {
  const { t } = useTranslation();
  const uiLocale = useLocale();
  const settings = useEmailSettings();
  const [params, setParams] = useSearchParams();
  const templateParam = params.get('template');
  const localeParam = params.get('locale');
  const selectedKey = isTemplateKey(templateParam) ? templateParam : null;
  const locale: Locale = isLocale(localeParam) ? localeParam : uiLocale;
  const tab: Tab = params.get('tab') === 'outbox' && !selectedKey ? 'outbox' : 'templates';

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(changes)) {
      if (value === null) next.delete(name);
      else next.set(name, value);
    }
    setParams(next, { replace: true });
  };

  return (
    <Page title={t('admin.email.title')} subtitle={t('admin.email.subtitle')}>
      {settings.isPending && <LoadingBlock />}
      {settings.error && !settings.data && <ErrorBlock error={settings.error} onRetry={() => void settings.refetch()} />}
      {settings.data && (
        <>
          <motion.section variants={itemVariants}>
            <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(200px, 280px)' }} gap="5">
              <SmtpPanel smtp={settings.data.smtp} />
              <QueuePanel queue={settings.data.queue} />
            </Grid>
          </motion.section>
          <motion.section variants={itemVariants}>
            <SimpleTabs<Tab>
              value={tab}
              onChange={(value) => update({ tab: value === 'outbox' ? 'outbox' : null, ...(value === 'outbox' ? { template: null, locale: null } : {}) })}
              tabs={[
                {
                  value: 'templates',
                  label: t('admin.email.templatesTitle'),
                  icon: <LayoutTemplate size={16} strokeWidth={2.5} aria-hidden />,
                  content: (
                    <EmailTemplates
                      templates={settings.data.templates}
                      selectedKey={selectedKey}
                      locale={locale}
                      onSelect={(key) => update({ template: key, tab: null })}
                      onLocaleChange={(value) => update({ locale: value })}
                    />
                  ),
                },
                { value: 'outbox', label: t('admin.email.outboxTitle'), icon: <Inbox size={16} strokeWidth={2.5} aria-hidden />, content: <Outbox /> },
              ]}
            />
          </motion.section>
        </>
      )}
    </Page>
  );
}
