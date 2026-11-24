import { Accordion, Badge, Box, Button, Clipboard, Code, Fieldset, Flex, Text } from '@chakra-ui/react';
import dayjs from 'dayjs';
import { Check, Copy, KeyRound, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiClients, useCreateApiClient, useRevokeApiClient } from '../../api/admin';
import type { ApiClient, ApiClientCreated, ApiScope } from '../../api/types';
import { Page } from '../../components/Page';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { CheckboxField, DateTimeField, TextField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../components/ui/Notice';
import { useErrorMessage, useFormat } from '../../i18n/hooks';
import { openConfirm } from '../../lib/confirm';
import { notifyError, notifySuccess } from '../../lib/notify';
import { Form, FormActions, TwoLine } from './parts';

const SCOPES: ApiScope[] = ['points:read', 'points:write', 'employees:write'];
const SCOPE_KEYS = {
  'points:read': 'pointsRead',
  'points:write': 'pointsWrite',
  'employees:write': 'employeesWrite',
} as const;

const SAMPLE_REQUEST = `GET /api/integration/v1/employees/{employeeNo}/points
X-Api-Key: phk_…

POST /api/integration/v1/transactions
X-Api-Key: phk_…
Content-Type: application/json

{ "employeeNo": "E0001", "amount": -50, "reason": "Canteen", "externalReference": "order-1234" }`;

/** The server only says active or not; a key that is inactive without having been revoked has expired. */
function clientState(client: ApiClient): 'active' | 'revoked' | 'expired' {
  if (client.revokedAt !== null) return 'revoked';
  return client.isActive ? 'active' : 'expired';
}

const STATE_COLORS = { active: 'green', revoked: 'red', expired: 'gray' } as const;

function CreateForm({ onCreated, onCancel }: { onCreated: (created: ApiClientCreated) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const create = useCreateApiClient();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<ApiScope[]>(['points:read']);
  const [expires, setExpires] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const toggle = (scope: ApiScope, on: boolean) => setScopes((current) => (on ? [...current.filter((s) => s !== scope), scope] : current.filter((s) => s !== scope)));

  const submit = () => {
    setSubmitted(true);
    if (name.trim() === '' || scopes.length === 0) return;
    create.mutate(
      {
        name: name.trim(),
        // Sent in the contract's order, whatever order the boxes were ticked in.
        scopes: SCOPES.filter((scope) => scopes.includes(scope)),
        // The key stays valid through the end of the chosen day, local time.
        expiresAt: expires ? dayjs(expires).endOf('day').toISOString() : null,
      },
      { onSuccess: onCreated },
    );
  };

  return (
    <Form onSubmit={submit}>
      <TextField
        label={t('admin.apiClients.name')}
        help={t('admin.apiClients.nameHelp')}
        required
        autoFocus
        value={name}
        onChange={setName}
        error={submitted && name.trim() === '' ? t('app.required') : null}
      />
      {/* A fieldset, not a <FormField required>: that would mark every single box as required. */}
      <Fieldset.Root invalid={submitted && scopes.length === 0}>
        <Fieldset.Legend fontWeight="bold" fontSize="sm" color="fg">
          {t('admin.apiClients.scopes')}
        </Fieldset.Legend>
        <Flex direction="column" gap="2.5" w="full">
          {SCOPES.map((scope) => (
            <CheckboxField
              key={scope}
              value={scopes.includes(scope)}
              onChange={(on) => toggle(scope, on)}
              label={
                <>
                  {t(`admin.apiClients.scopeLabel.${SCOPE_KEYS[scope]}`)}{' '}
                  <Code size="sm" colorPalette="gray">
                    {scope}
                  </Code>
                </>
              }
              help={t(`admin.apiClients.scopeHelp.${SCOPE_KEYS[scope]}`)}
            />
          ))}
        </Flex>
        <Fieldset.ErrorText fontWeight="semibold">{t('admin.apiClients.scopeRequired')}</Fieldset.ErrorText>
      </Fieldset.Root>
      <DateTimeField label={t('admin.apiClients.expires')} help={t('admin.apiClients.expiresHelp')} withTime={false} min={dayjs().startOf('day').toISOString()} value={expires} onChange={setExpires} />
      {create.error && <Notice tone="error" title={errorMessage(create.error)} />}
      <FormActions>
        <Button variant="outline" onClick={onCancel}>
          {t('app.cancel')}
        </Button>
        <Button type="submit" loading={create.isPending}>
          {t('admin.apiClients.create')}
        </Button>
      </FormActions>
    </Form>
  );
}

/** Shown once, right after creation. The key lives only in this component's props; closing the dialog drops it. */
function NewKeyNotice({ created, onClose }: { created: ApiClientCreated; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Flex direction="column" gap="4">
      <Notice tone="warning" title={t('admin.apiClients.onceTitle')}>
        {t('admin.apiClients.onceBody')}
      </Notice>
      <Text fontSize="sm" fontWeight="bold">
        {created.client.name}
      </Text>
      <Code size="md" colorPalette="gray" variant="surface" display="block" p="3" borderRadius="l2" wordBreak="break-all" whiteSpace="pre-wrap" userSelect="all">
        {created.apiKey}
      </Code>
      <Flex justify="space-between" gap="2" wrap="wrap">
        <Clipboard.Root value={created.apiKey}>
          <Clipboard.Trigger asChild>
            <Button variant="outline">
              <Clipboard.Indicator copied={<Check aria-hidden />}>
                <Copy aria-hidden />
              </Clipboard.Indicator>
              <Clipboard.Indicator copied={t('app.copied')}>{t('admin.apiClients.copyKey')}</Clipboard.Indicator>
            </Button>
          </Clipboard.Trigger>
        </Clipboard.Root>
        <Button onClick={onClose}>{t('admin.apiClients.savedIt')}</Button>
      </Flex>
    </Flex>
  );
}

/** Keys for other applications: list, create (the key is shown once), revoke. */
export function ApiClientsPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const clients = useApiClients();
  const revoke = useRevokeApiClient();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ApiClientCreated | null>(null);

  const confirmRevoke = (client: ApiClient) =>
    openConfirm({
      title: t('admin.apiClients.revokeTitle'),
      children: <Text fontSize="sm">{t('admin.apiClients.revokeBody', { name: client.name })}</Text>,
      labels: { confirm: t('admin.apiClients.revoke'), cancel: t('app.cancel') },
      danger: true,
      onConfirm: () =>
        revoke.mutate(client.id, {
          onSuccess: () => notifySuccess(t('admin.apiClients.revoked')),
          onError: (error) => notifyError(errorMessage(error)),
        }),
    });

  const columns: Column<ApiClient>[] = [
    { key: 'name', header: t('admin.apiClients.name'), cell: (client) => <Text fontWeight="bold">{client.name}</Text> },
    {
      key: 'key',
      header: t('admin.apiClients.columns.key'),
      cell: (client) => (
        <Code size="sm" colorPalette="gray" variant="surface" whiteSpace="nowrap">
          {client.keyPrefix}…
        </Code>
      ),
    },
    {
      key: 'scopes',
      header: t('admin.apiClients.scopes'),
      cell: (client) => (
        <Flex gap="1" wrap="wrap">
          {client.scopes.map((scope) => (
            <Badge key={scope} size="sm" variant="outline" colorPalette="gray" title={t(`admin.apiClients.scopeLabel.${SCOPE_KEYS[scope]}`)}>
              {scope}
            </Badge>
          ))}
        </Flex>
      ),
    },
    {
      key: 'status',
      header: t('admin.apiClients.columns.status'),
      cell: (client) => {
        const state = clientState(client);
        return (
          <Badge colorPalette={STATE_COLORS[state]} variant="subtle" px="2">
            {t(`admin.apiClients.state.${state}`)}
          </Badge>
        );
      },
    },
    {
      key: 'created',
      header: t('admin.apiClients.columns.created'),
      numeric: true,
      cell: (client) => <TwoLine strong={false} primary={<Text whiteSpace="nowrap">{format.dateTime(client.createdAt)}</Text>} secondary={client.createdByName} />,
    },
    {
      key: 'lastUsed',
      header: t('admin.apiClients.columns.lastUsed'),
      numeric: true,
      cell: (client) => <Text whiteSpace="nowrap">{client.lastUsedAt ? format.dateTime(client.lastUsedAt) : t('admin.apiClients.neverUsed')}</Text>,
    },
    {
      key: 'expires',
      header: t('admin.apiClients.expires'),
      numeric: true,
      cell: (client) => <Text whiteSpace="nowrap">{client.expiresAt ? format.dateTime(client.expiresAt) : t('admin.apiClients.noExpiry')}</Text>,
    },
    {
      key: 'actions',
      header: '',
      shrink: true,
      align: 'end',
      cell: (client) =>
        clientState(client) === 'active' && (
          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => confirmRevoke(client)} aria-label={`${t('admin.apiClients.revoke')}: ${client.name}`}>
            {t('admin.apiClients.revoke')}
          </Button>
        ),
    },
  ];

  return (
    <Page
      title={t('admin.apiClients.title')}
      subtitle={t('admin.apiClients.subtitle')}
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          {t('admin.apiClients.newKey')}
        </Button>
      }
    >
      <Accordion.Root collapsible variant="plain">
        <Accordion.Item value="howto" bg="bg.panel" borderWidth="2px" borderColor="border" borderRadius="l2" boxShadow="0 4px 0 0 {colors.border}">
          <Accordion.ItemTrigger px="4" py="3" fontWeight="bold" cursor="pointer" borderRadius="l2">
            <Box color="brand.fg" lineHeight="0">
              <KeyRound size={18} strokeWidth={2.5} aria-hidden />
            </Box>
            <Box flex="1" textAlign="start">
              {t('admin.apiClients.howToTitle')}
            </Box>
            <Accordion.ItemIndicator />
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Accordion.ItemBody px="4" pt="0" pb="4">
              <Flex direction="column" gap="3">
                <Text fontSize="sm" fontWeight="medium">
                  {t('admin.apiClients.howToBody')}
                </Text>
                <Code size="sm" colorPalette="gray" variant="surface" display="block" p="3" borderRadius="l2" whiteSpace="pre" overflowX="auto">
                  {SAMPLE_REQUEST}
                </Code>
              </Flex>
            </Accordion.ItemBody>
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>

      <DataTable
        columns={columns}
        rows={clients.data}
        rowKey={(client) => client.id}
        minWidth={920}
        loading={clients.isPending}
        error={clients.error}
        onRetry={() => void clients.refetch()}
        emptyMessage={t('admin.apiClients.empty')}
        emptyIcon={<KeyRound size={26} strokeWidth={2.2} aria-hidden />}
      />

      <Modal opened={creating} onClose={() => setCreating(false)} title={t('admin.apiClients.newKey')}>
        <CreateForm
          onCancel={() => setCreating(false)}
          onCreated={(result) => {
            setCreating(false);
            setCreated(result);
          }}
        />
      </Modal>
      <Modal opened={created !== null} onClose={() => setCreated(null)} title={t('admin.apiClients.createdTitle')} dismissible={false}>
        {created && <NewKeyNotice created={created} onClose={() => setCreated(null)} />}
      </Modal>
    </Page>
  );
}
