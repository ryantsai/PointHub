import { Badge, Box, Button, Flex, IconButton, Tag, Text } from '@chakra-ui/react';
import { CreditCard, Nfc, Pencil, Plus, ReceiptText, SlidersHorizontal, Users } from 'lucide-react';
import { useCallback, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useEmployees, useRegisterCard, useRemoveCard, useSetEmployeeRoles } from '../../api/admin';
import type { Card, Employee, Role } from '../../api/types';
import { RoleBadges } from '../../components/badges';
import { ExportButton } from '../../components/ExportButton';
import { Page } from '../../components/Page';
import { Pager } from '../../components/states';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { CheckboxField, TextField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../components/ui/Notice';
import { SearchField } from '../../components/ui/SearchField';
import { CardReaderStatus } from '../../features/cardReader/CardReaderStatus';
import { SCAN_FIELD_ATTRIBUTE } from '../../features/cardReader/keyboardWedge';
import type { CardRead } from '../../features/cardReader/types';
import { useCardReader } from '../../features/cardReader/useCardReader';
import { useErrorMessage, useFormat } from '../../i18n/hooks';
import { openConfirm } from '../../lib/confirm';
import { notifyError, notifySuccess } from '../../lib/notify';
import { can } from '../../lib/roles';
import { useSession } from '../../lib/session';
import { readPage, useUrlFilters, useUrlSearch } from '../../lib/urlFilters';
import { AdjustPointsForm } from './AdjustPointsForm';
import { FormActions, TableBlock, TextLink, Toolbar, TwoLine } from './parts';

const PAGE_SIZE = 25;
/** In the order of the role table in docs/api.md, most powerful first. */
const ROLES: Role[] = ['systemAdmin', 'eventAdmin', 'giftAdmin', 'auditor'];

function PersonHeader({ employee }: { employee: Employee }) {
  return (
    <Box bg="bg.subtle" borderRadius="l2" px="3" py="2.5">
      <Text fontWeight="extrabold" lineHeight="1.3">
        {employee.displayName}
      </Text>
      <Text fontSize="xs" color="fg.muted" fontWeight="medium">
        {employee.employeeNo}
        {employee.department ? ` · ${employee.department}` : ''}
      </Text>
    </Box>
  );
}

/** Tick the roles a person holds; none ticked makes them a normal user. */
function RolesForm({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const { t } = useTranslation();
  const me = useSession();
  const errorMessage = useErrorMessage();
  const save = useSetEmployeeRoles();
  const [roles, setRoles] = useState<Role[]>(employee.roles);
  const losingOwnAccess = employee.id === me.id && !roles.includes('systemAdmin');
  const unchanged = roles.length === employee.roles.length && roles.every((role) => employee.roles.includes(role));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(
      { employeeId: employee.id, roles: ROLES.filter((role) => roles.includes(role)) },
      {
        onSuccess: () => {
          notifySuccess(t('admin.roles.saved', { name: employee.displayName }));
          onDone();
        },
      },
    );
  };

  return (
    <form noValidate onSubmit={submit}>
      <Flex direction="column" gap="4">
        <PersonHeader employee={employee} />
        <Flex direction="column" gap="2" role="group" aria-label={t('admin.employees.columns.roles')}>
          {ROLES.map((role) => {
            const checked = roles.includes(role);
            return (
              <Box
                key={role}
                borderWidth="2px"
                borderRadius="l2"
                px="3"
                py="2.5"
                borderColor={checked ? 'brand.solid' : 'border'}
                bg={checked ? 'brand.subtle' : 'bg.panel'}
                transition="background-color 160ms, border-color 160ms"
              >
                <CheckboxField
                  label={t(`role.${role}`)}
                  help={t(`admin.roles.help.${role}`)}
                  value={checked}
                  onChange={(on) => {
                    save.reset();
                    setRoles((current) => (on ? [...current, role] : current.filter((r) => r !== role)));
                  }}
                />
              </Box>
            );
          })}
        </Flex>
        <Text fontSize="sm" color="fg.muted" fontWeight="medium">
          {roles.length === 0 ? t('admin.roles.noneSelected') : t('admin.roles.noneHint')}
        </Text>
        {losingOwnAccess && !save.error && <Notice tone="warning" title={t('admin.roles.selfWarning')} />}
        {save.error && <Notice tone="error" title={errorMessage(save.error)} />}
        <FormActions>
          <Button variant="outline" onClick={onDone}>
            {t('app.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending} disabled={unchanged}>
            {t('admin.roles.save')}
          </Button>
        </FormActions>
      </Flex>
    </form>
  );
}

/** Tap a card on any connected reader (or type its UID) to bind it to the employee. */
function RegisterCardForm({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const register = useRegisterCard();
  const [uid, setUid] = useState('');
  const [label, setLabel] = useState('');
  const onRead = useCallback((read: CardRead) => setUid(read.uid), []);
  const reader = useCardReader({ onRead, enabled: true });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (uid.trim() === '') return;
    register.mutate(
      { employeeId: employee.id, cardUid: uid.trim(), label: label.trim() === '' ? null : label.trim() },
      {
        onSuccess: () => {
          notifySuccess(t('admin.employees.cardRegistered'));
          onDone();
        },
      },
    );
  };

  return (
    <form noValidate onSubmit={submit}>
      <Flex direction="column" gap="4">
        <PersonHeader employee={employee} />
        <Notice tone="info" icon={<Nfc aria-hidden />}>
          {t('admin.employees.scanHint')}
        </Notice>
        <CardReaderStatus bridge={reader.bridge} />
        {reader.nfc !== 'unsupported' && (
          <Flex align="center" gap="3" wrap="wrap">
            <Button variant="subtle" onClick={reader.nfc === 'scanning' ? reader.stopNfc : reader.startNfc}>
              <Nfc aria-hidden />
              {reader.nfc === 'scanning' ? t('host.station.nfcStop') : t('host.station.nfcStart')}
            </Button>
            {reader.nfc === 'denied' && (
              <Text fontSize="sm" color="loss" fontWeight="semibold">
                {t('host.station.nfcDenied')}
              </Text>
            )}
          </Flex>
        )}
        <TextField label={t('admin.employees.cardUid')} required autoFocus autoComplete="off" value={uid} onChange={setUid} {...{ [SCAN_FIELD_ATTRIBUTE]: '' }} />
        <TextField label={t('admin.employees.cardLabel')} placeholder={t('admin.employees.cardLabelPlaceholder')} value={label} onChange={setLabel} />
        {register.error && <Notice tone="error" title={errorMessage(register.error)} />}
        <FormActions>
          <Button variant="outline" onClick={onDone}>
            {t('app.cancel')}
          </Button>
          <Button type="submit" loading={register.isPending} disabled={uid.trim() === ''}>
            {t('admin.employees.registerCard')}
          </Button>
        </FormActions>
      </Flex>
    </form>
  );
}

/**
 * People, balances, roles and ID cards. System admins edit; auditors only read. A row (or the name in it)
 * opens that person's lookup page. The search and the page live in the URL; "Export CSV" downloads the
 * searched list with balances and lifetime totals.
 */
export function EmployeesPage() {
  const { t } = useTranslation();
  const me = useSession();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const navigate = useNavigate();
  const { params, patch } = useUrlFilters();
  const search = useUrlSearch('q');
  const page = readPage(params);
  const employees = useEmployees(search.q, page, PAGE_SIZE);
  const removeCard = useRemoveCard();
  const [registering, setRegistering] = useState<Employee | null>(null);
  const [adjusting, setAdjusting] = useState<Employee | null>(null);
  const [editingRoles, setEditingRoles] = useState<Employee | null>(null);
  const isAdmin = can.admin(me);

  const confirmRemove = (employee: Employee, card: Card) =>
    openConfirm({
      title: t('admin.employees.removeCard'),
      children: <Text fontSize="sm">{t('admin.employees.removeConfirm', { uid: card.uid, name: employee.displayName })}</Text>,
      labels: { confirm: t('admin.employees.removeCard'), cancel: t('app.cancel') },
      danger: true,
      onConfirm: () =>
        removeCard.mutate(card.id, {
          onSuccess: () => notifySuccess(t('admin.employees.cardRemoved')),
          onError: (error) => notifyError(errorMessage(error)),
        }),
    });

  const columns: Column<Employee>[] = [
    {
      key: 'employee',
      header: t('admin.employees.columns.employee'),
      cell: (employee) => (
        <TwoLine
          primary={
            <Flex align="center" gap="2" wrap="wrap">
              <TextLink to={`/admin/employees/${employee.id}`}>{employee.displayName}</TextLink>
              {!employee.isActive && (
                <Badge size="xs" colorPalette="gray" variant="solid">
                  {t('admin.employees.inactive')}
                </Badge>
              )}
            </Flex>
          }
          secondary={`${employee.employeeNo} · ${employee.email}`}
        />
      ),
    },
    { key: 'department', header: t('admin.employees.columns.department'), cell: (employee) => <Text color={employee.department ? undefined : 'fg.muted'}>{employee.department ?? '–'}</Text> },
    {
      key: 'roles',
      header: t('admin.employees.columns.roles'),
      cell: (employee) => (
        <Flex align="center" gap="1.5">
          <RoleBadges roles={employee.roles} />
          {isAdmin && (
            <IconButton
              size="2xs"
              variant="ghost"
              colorPalette="gray"
              aria-label={`${t('admin.roles.edit')}: ${employee.displayName}`}
              title={t('admin.roles.edit')}
              onClick={() => setEditingRoles(employee)}
            >
              <Pencil aria-hidden />
            </IconButton>
          )}
        </Flex>
      ),
    },
    {
      key: 'balance',
      header: t('admin.employees.columns.balance'),
      align: 'end',
      numeric: true,
      cell: (employee) => (
        <Text as="span" fontWeight="black">
          {format.number(employee.balance)}
        </Text>
      ),
    },
    {
      key: 'cards',
      header: t('admin.employees.columns.cards'),
      cell: (employee) => (
        <Flex align="center" gap="1.5" wrap="wrap">
          {employee.cards.length === 0 && (
            <Text fontSize="xs" color="fg.muted" fontWeight="medium">
              {t('admin.employees.noCards')}
            </Text>
          )}
          {employee.cards.map((card) => (
            <Tag.Root key={card.id} size="md" colorPalette="gray" variant="surface" borderRadius="full" title={card.label ?? undefined} opacity={card.isActive ? 1 : 0.55}>
              <Tag.StartElement>
                <CreditCard size={12} strokeWidth={2.5} aria-hidden />
              </Tag.StartElement>
              <Tag.Label fontWeight="semibold" fontVariantNumeric="tabular-nums" textDecoration={card.isActive ? undefined : 'line-through'}>
                {card.label ? `${card.label} · ${card.uid}` : card.uid}
              </Tag.Label>
              {isAdmin && (
                <Tag.EndElement>
                  <Tag.CloseTrigger aria-label={`${t('admin.employees.removeCard')}: ${card.uid}`} title={t('admin.employees.removeCard')} onClick={() => confirmRemove(employee, card)} />
                </Tag.EndElement>
              )}
            </Tag.Root>
          ))}
          {isAdmin && (
            <IconButton
              size="2xs"
              variant="ghost"
              colorPalette="gray"
              aria-label={`${t('admin.employees.registerCard')}: ${employee.displayName}`}
              title={t('admin.employees.registerCard')}
              onClick={() => setRegistering(employee)}
            >
              <Plus aria-hidden />
            </IconButton>
          )}
        </Flex>
      ),
    },
    {
      key: 'actions',
      header: '',
      shrink: true,
      align: 'end',
      cell: (employee) => (
        <Flex gap="1" justify="flex-end" wrap="nowrap">
          <Button asChild size="xs" variant="ghost">
            <Link to={`/admin/ledger?employeeId=${employee.id}`}>
              <ReceiptText aria-hidden />
              {t('admin.employees.viewLedger')}
            </Link>
          </Button>
          {isAdmin && (
            <Button size="xs" variant="subtle" onClick={() => setAdjusting(employee)} aria-label={`${t('admin.ledger.adjust')}: ${employee.displayName}`}>
              <SlidersHorizontal aria-hidden />
              {t('admin.employees.adjust')}
            </Button>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <Page title={t('admin.employees.title')} subtitle={t('admin.employees.subtitle')}>
      <TableBlock>
        <Toolbar actions={<ExportButton path="/api/admin/employees/export" filters={{ q: search.q }} />}>
          <SearchField flex="1 1 240px" minW="0" maxW={{ md: '420px' }} label={t('admin.employees.search')} value={search.text} onChange={search.onChange} />
        </Toolbar>
        <DataTable
          columns={columns}
          rows={employees.data?.items}
          rowKey={(employee) => employee.id}
          minWidth={940}
          loading={employees.isPending}
          error={employees.error}
          onRetry={() => void employees.refetch()}
          stale={employees.isPlaceholderData}
          onRowClick={(employee) => void navigate(`/admin/employees/${employee.id}`)}
          emptyMessage={search.q !== '' ? t('filters.noMatch', { q: search.q }) : t('admin.employees.empty')}
          emptyIcon={<Users size={26} strokeWidth={2.2} aria-hidden />}
        />
        {employees.data && employees.data.total > 0 && <Pager page={page} pageSize={PAGE_SIZE} total={employees.data.total} onChange={(next) => patch({ page: next === 1 ? null : next })} />}
      </TableBlock>

      <Modal opened={editingRoles !== null} onClose={() => setEditingRoles(null)} title={t('admin.roles.title')}>
        {editingRoles && <RolesForm key={editingRoles.id} employee={editingRoles} onDone={() => setEditingRoles(null)} />}
      </Modal>
      <Modal opened={registering !== null} onClose={() => setRegistering(null)} title={t('admin.employees.registerTitle')}>
        {registering && <RegisterCardForm key={registering.id} employee={registering} onDone={() => setRegistering(null)} />}
      </Modal>
      <Modal opened={adjusting !== null} onClose={() => setAdjusting(null)} title={t('admin.ledger.adjustTitle')}>
        {adjusting && <AdjustPointsForm key={adjusting.id} employee={adjusting} onDone={() => setAdjusting(null)} />}
      </Modal>
    </Page>
  );
}
