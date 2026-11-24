import { Badge, Box, Button, chakra, Flex, Grid, Input, SegmentGroup, Spinner, Switch, Text, Textarea } from '@chakra-ui/react';
import { Braces, Eye, MailOpen, RotateCcw, Save } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../api/client';
import { useEmailPreview, useResetEmailTemplate, useSaveEmailTemplate, useSetEmailTemplateEnabled } from '../../api/email';
import type { EmailTemplate, EmailTemplateKey, Locale } from '../../api/types';
import { EmptyState } from '../../components/states';
import { Eyebrow, SectionTitle } from '../../components/ui/bits';
import { FormField } from '../../components/ui/fields';
import { Notice } from '../../components/ui/Notice';
import { Panel } from '../../components/ui/Panel';
import { useErrorMessage } from '../../i18n/hooks';
import { LOCALE_LABELS, LOCALES } from '../../i18n/locale';
import { openConfirm } from '../../lib/confirm';
import { useDebouncedValue } from '../../lib/hooks';
import { notifyError, notifySuccess } from '../../lib/notify';
import { Form } from './parts';

/** The six notifications, in the order of the contract. */
const TEMPLATE_KEYS: EmailTemplateKey[] = ['checkInApproved', 'checkInRejected', 'redemptionRequested', 'redemptionFulfilled', 'redemptionCancelled', 'pointsAdjusted'];

type Draft = { subject: string; body: string };
type FieldName = keyof Draft;

/** `{{names}}` used in the text that this template does not offer. The server is the judge; this only words its "no" nicely. */
function unknownPlaceholders(text: string, allowed: readonly string[]): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([^{}\s]+)\s*\}\}/g)) {
    if (!allowed.includes(match[1])) found.add(match[1]);
  }
  return [...found];
}

/** The server's own sentence for a rejected draft ("Unknown placeholder: {{x}}."), when it sent one. */
function serverDetail(error: unknown): string | null {
  return error instanceof ApiError && error.code === 'validation_failed' && error.message !== '' ? error.message : null;
}

interface LocaleEditorProps {
  template: EmailTemplate;
  draft: Draft;
  onDraftChange: (draft: Draft | null) => void;
}

/** Subject, body, placeholder chips and the live preview for one language of one notification. */
function LocaleEditor({ template, draft, onDraftChange }: LocaleEditorProps) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const save = useSaveEmailTemplate();
  const reset = useResetEmailTemplate();
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<FieldName>('body');
  const [subject] = useDebouncedValue(draft.subject, 450);
  const [body] = useDebouncedValue(draft.body, 450);
  const preview = useEmailPreview({ key: template.key, locale: template.locale, subject, body });

  const dirty = draft.subject !== template.subject || draft.body !== template.body;
  const waiting = subject !== draft.subject || body !== draft.body || preview.isFetching;
  const unknown = unknownPlaceholders(`${draft.subject}\n${draft.body}`, template.placeholders);
  const unknownText = unknown.length > 0 ? t('admin.email.unknownPlaceholder', { names: unknown.map((name) => `{{${name}}}`).join(', ') }) : null;
  const empty = draft.subject.trim() === '' || draft.body.trim() === '';

  const change = (field: FieldName, value: string) => {
    save.reset();
    const next = { ...draft, [field]: value };
    onDraftChange(next.subject === template.subject && next.body === template.body ? null : next);
  };

  const insert = (name: string) => {
    const field = lastField.current;
    const element = field === 'subject' ? subjectRef.current : bodyRef.current;
    const value = draft[field];
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? start;
    const token = `{{${name}}}`;
    change(field, value.slice(0, start) + token + value.slice(end));
    // Put the caret after the inserted token once React has written the new value.
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const submit = () =>
    save.mutate(
      { key: template.key, locale: template.locale, subject: draft.subject, body: draft.body },
      {
        onSuccess: () => {
          onDraftChange(null);
          notifySuccess(t('admin.email.templateSaved'));
        },
      },
    );

  const confirmReset = () =>
    openConfirm({
      title: t('admin.email.resetTitle'),
      children: <Text fontSize="sm">{t('admin.email.resetBody', { language: LOCALE_LABELS[template.locale] })}</Text>,
      labels: { confirm: t('admin.email.reset'), cancel: t('app.cancel') },
      danger: true,
      onConfirm: () =>
        reset.mutate(
          { key: template.key, locale: template.locale },
          {
            onSuccess: () => {
              onDraftChange(null);
              notifySuccess(t('admin.email.templateReset'));
            },
            onError: (error) => notifyError(errorMessage(error)),
          },
        ),
    });

  return (
    <Grid templateColumns={{ base: 'minmax(0, 1fr)', '2xl': 'minmax(0, 1fr) minmax(0, 1fr)' }} gap="5" alignItems="start">
      <Form minW="0" onSubmit={submit}>
        <FormField label={t('admin.email.subject')} required>
          <Input ref={subjectRef} lang={template.locale} value={draft.subject} onFocus={() => (lastField.current = 'subject')} onChange={(event) => change('subject', event.currentTarget.value)} />
        </FormField>
        <FormField label={t('admin.email.body')} required help={t('admin.email.bodyHelp')}>
          <Textarea ref={bodyRef} lang={template.locale} rows={11} resize="vertical" lineHeight="1.6" value={draft.body} onFocus={() => (lastField.current = 'body')} onChange={(event) => change('body', event.currentTarget.value)} />
        </FormField>

        <Box>
          <Flex align="center" gap="2" mb="2">
            <Braces size={14} strokeWidth={2.6} aria-hidden />
            <Eyebrow>{t('admin.email.placeholders')}</Eyebrow>
          </Flex>
          <Flex gap="1.5" wrap="wrap">
            {template.placeholders.map((name) => (
              <chakra.button
                key={name}
                type="button"
                px="2.5"
                h="7"
                borderRadius="full"
                borderWidth="2px"
                borderColor="brand.muted"
                bg="brand.subtle"
                color="brand.fg"
                fontFamily="mono"
                fontSize="xs"
                fontWeight="bold"
                cursor="pointer"
                transition="transform 160ms, background-color 160ms"
                _hover={{ bg: 'brand.muted', transform: 'translateY(-1px)' }}
                _active={{ transform: 'scale(0.96)' }}
                focusVisibleRing="outside"
                title={t('admin.email.insertPlaceholder', { name })}
                aria-label={t('admin.email.insertPlaceholder', { name })}
                // Keep the caret in the text field while the chip is clicked.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(name)}
              >
                {`{{${name}}}`}
              </chakra.button>
            ))}
          </Flex>
          <Text fontSize="xs" color="fg.muted" fontWeight="medium" mt="2">
            {t('admin.email.placeholdersHelp')}
          </Text>
        </Box>

        {save.error && (
          <Notice tone="error" title={unknownText ?? errorMessage(save.error)}>
            {unknownText ? null : serverDetail(save.error)}
          </Notice>
        )}
        <Flex align="center" gap="2" wrap="wrap">
          <Button type="submit" loading={save.isPending} disabled={!dirty || empty}>
            <Save aria-hidden />
            {t('app.save')}
          </Button>
          {dirty && (
            <Button variant="outline" disabled={save.isPending} onClick={() => onDraftChange(null)}>
              {t('admin.email.discard')}
            </Button>
          )}
          {template.isCustomized && (
            <Button variant="ghost" colorPalette="red" loading={reset.isPending} onClick={confirmReset}>
              <RotateCcw aria-hidden />
              {t('admin.email.reset')}
            </Button>
          )}
          <Badge ms="auto" colorPalette={dirty ? 'orange' : template.isCustomized ? 'brand' : 'gray'} variant="subtle" px="2">
            {dirty ? t('admin.email.unsaved') : template.isCustomized ? t('admin.email.customized') : t('admin.email.default')}
          </Badge>
        </Flex>
      </Form>

      <Flex direction="column" gap="2" minW="0">
        <Flex align="center" gap="2" minH="6">
          <Eye size={14} strokeWidth={2.6} aria-hidden />
          <Eyebrow>{t('admin.email.preview')}</Eyebrow>
          {waiting && <Spinner size="xs" color="fg.muted" />}
        </Flex>
        {preview.error ? (
          <Notice tone="error" title={unknownText ?? errorMessage(preview.error)}>
            {unknownText ? null : serverDetail(preview.error)}
          </Notice>
        ) : (
          <Box borderWidth="2px" borderColor="border.emphasized" borderRadius="l2" overflow="hidden" opacity={waiting ? 0.7 : 1} transition="opacity 160ms">
            <Box px="3" py="2.5" bg="bg.subtle" borderBottomWidth="2px" borderColor="border.emphasized">
              <Text fontSize="xs" fontWeight="bold" color="fg.muted">
                {t('admin.email.subject')}
              </Text>
              <Text fontWeight="bold" lineHeight="1.35" lang={template.locale} minH="1.35em">
                {preview.data?.subject ?? ''}
              </Text>
            </Box>
            {/* The server's HTML, shown but never trusted: an empty `sandbox` means no scripts, no forms, no same-origin access. Mail is read on white. */}
            {preview.data ? (
              <iframe title={t('admin.email.previewFrame')} sandbox="" srcDoc={preview.data.html} style={{ display: 'block', width: '100%', height: 340, border: 0, background: 'white', colorScheme: 'light' }} />
            ) : (
              <Flex h="340px" align="center" justify="center" bg="white">
                <Spinner color="brand.solid" />
              </Flex>
            )}
          </Box>
        )}
        <Text fontSize="xs" color="fg.muted" fontWeight="medium">
          {t('admin.email.previewHelp')}
        </Text>
      </Flex>
    </Grid>
  );
}

interface TemplateEditorProps {
  /** The three language versions of one notification. */
  templates: EmailTemplate[];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

function TemplateEditor({ templates, locale, onLocaleChange }: TemplateEditorProps) {
  const { t } = useTranslation();
  // Unsaved text per language, so switching the language tab does not throw work away.
  const [drafts, setDrafts] = useState<Partial<Record<Locale, Draft>>>({});
  const template = templates.find((item) => item.locale === locale) ?? templates[0];
  const draft = drafts[template.locale] ?? { subject: template.subject, body: template.body };

  return (
    <Panel>
      <Flex align="flex-start" justify="space-between" gap="3" wrap="wrap">
        <Box minW="0" flex="1">
          <SectionTitle icon={MailOpen} title={t(`admin.email.template.${template.key}.name`)} compact />
          <Text fontSize="sm" color="fg.muted" fontWeight="medium" mt="2">
            {t(`admin.email.template.${template.key}.help`)}
          </Text>
        </Box>
        <SegmentGroup.Root size="sm" value={template.locale} onValueChange={(details) => details.value && onLocaleChange(details.value as Locale)} aria-label={t('app.language')}>
          <SegmentGroup.Indicator />
          {LOCALES.filter((code) => templates.some((item) => item.locale === code)).map((code) => (
            <SegmentGroup.Item key={code} value={code} lang={code}>
              <SegmentGroup.ItemText>
                {LOCALE_LABELS[code]}
                {drafts[code] ? ' *' : templates.find((item) => item.locale === code)?.isCustomized ? ' •' : ''}
              </SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          ))}
        </SegmentGroup.Root>
      </Flex>
      {!template.isEnabled && <Notice tone="warning" title={t('admin.email.disabledNotice')} />}
      <LocaleEditor
        key={template.locale}
        template={template}
        draft={draft}
        onDraftChange={(next) =>
          setDrafts((current) => {
            const rest = { ...current };
            if (next) rest[template.locale] = next;
            else delete rest[template.locale];
            return rest;
          })
        }
      />
    </Panel>
  );
}

interface EmailTemplatesProps {
  templates: EmailTemplate[];
  selectedKey: EmailTemplateKey | null;
  locale: Locale;
  onSelect: (key: EmailTemplateKey) => void;
  onLocaleChange: (locale: Locale) => void;
}

/** The six notifications with an on/off switch each; selecting one opens its editor. */
export function EmailTemplates({ templates, selectedKey, locale, onSelect, onLocaleChange }: EmailTemplatesProps) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const setEnabled = useSetEmailTemplateEnabled();
  const selected = selectedKey ? templates.filter((item) => item.key === selectedKey) : [];

  return (
    <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(260px, 320px) minmax(0, 1fr)' }} gap="5" alignItems="start">
      <Flex as="ul" listStyleType="none" direction="column" gap="2" aria-label={t('admin.email.templatesTitle')}>
        {TEMPLATE_KEYS.map((key) => {
          const versions = templates.filter((item) => item.key === key);
          if (versions.length === 0) return null;
          const enabled = versions[0].isEnabled;
          const active = key === selectedKey;
          const name = t(`admin.email.template.${key}.name`);
          return (
            <Flex
              as="li"
              key={key}
              align="center"
              gap="2"
              pr="3"
              borderWidth="2px"
              borderRadius="l2"
              borderColor={active ? 'brand.solid' : 'border'}
              bg={active ? 'brand.subtle' : 'bg.panel'}
              boxShadow={active ? '0 3px 0 0 {colors.brand.solid}' : '0 3px 0 0 {colors.border}'}
              transition="border-color 160ms, background-color 160ms, box-shadow 160ms"
            >
              <chakra.button
                type="button"
                flex="1"
                minW="0"
                textAlign="start"
                px="3"
                py="2.5"
                cursor="pointer"
                borderRadius="l2"
                focusVisibleRing="inside"
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(key)}
              >
                <Flex align="center" gap="2" wrap="wrap">
                  <Text fontWeight="bold" fontSize="sm" lineHeight="1.3" color={enabled ? undefined : 'fg.muted'}>
                    {name}
                  </Text>
                  {versions.some((item) => item.isCustomized) && (
                    <Badge size="xs" colorPalette="brand" variant="subtle">
                      {t('admin.email.customized')}
                    </Badge>
                  )}
                </Flex>
                <Text fontSize="xs" color="fg.muted" fontWeight="medium" lineHeight="1.4" mt="0.5">
                  {enabled ? t(`admin.email.template.${key}.help`) : t('admin.email.off')}
                </Text>
              </chakra.button>
              <Switch.Root
                checked={enabled}
                disabled={setEnabled.isPending && setEnabled.variables?.key === key}
                onCheckedChange={(details) =>
                  setEnabled.mutate(
                    { key, isEnabled: details.checked },
                    {
                      onSuccess: () => notifySuccess(details.checked ? t('admin.email.enabled', { name }) : t('admin.email.disabled', { name })),
                      onError: (error) => notifyError(errorMessage(error)),
                    },
                  )
                }
                aria-label={t('admin.email.sendToggle', { name })}
              >
                <Switch.HiddenInput />
                <Switch.Control />
              </Switch.Root>
            </Flex>
          );
        })}
      </Flex>

      {selected.length > 0 ? (
        <TemplateEditor key={selectedKey} templates={selected} locale={locale} onLocaleChange={onLocaleChange} />
      ) : (
        <Panel>
          <EmptyState message={t('admin.email.selectTemplate')} icon={<MailOpen size={26} strokeWidth={2.2} aria-hidden />} />
        </Panel>
      )}
    </Grid>
  );
}
