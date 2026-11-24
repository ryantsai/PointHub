import { Box, Button, chakra, Flex, Spinner, Text } from '@chakra-ui/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdjustPoints, useEmployees } from '../../api/admin';
import type { Employee } from '../../api/types';
import { FormField, NumberField, TextAreaField } from '../../components/ui/fields';
import { Notice } from '../../components/ui/Notice';
import { SearchField } from '../../components/ui/SearchField';
import { useErrorMessage, useFormat } from '../../i18n/hooks';
import { useDebouncedValue } from '../../lib/hooks';
import { notifySuccess } from '../../lib/notify';
import { Form, FormActions } from './parts';

/** Search box plus the first few matches; the server does the filtering. */
function EmployeePicker({ onPick, error }: { onPick: (employee: Employee) => void; error: string | null }) {
  const { t } = useTranslation();
  const format = useFormat();
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 250);
  const candidates = useEmployees(debounced, 1, 6);

  return (
    <FormField label={t('admin.ledger.employee')} required error={error}>
      <Flex direction="column" gap="2" w="full">
        <SearchField value={search} onChange={setSearch} label={t('admin.ledger.employeePlaceholder')} autoFocus />
        <Flex direction="column" borderWidth="2px" borderColor="border" borderRadius="l2" overflow="hidden" minH="12" opacity={candidates.isPlaceholderData ? 0.6 : 1} transition="opacity 160ms">
          {candidates.isPending && (
            <Flex justify="center" py="3">
              <Spinner size="sm" />
            </Flex>
          )}
          {candidates.data?.items.length === 0 && (
            <Text px="3" py="3" fontSize="sm" color="fg.muted" fontWeight="medium">
              {t('admin.employees.empty')}
            </Text>
          )}
          {candidates.data?.items.map((employee) => (
            <chakra.button
              key={employee.id}
              type="button"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap="3"
              px="3"
              py="2"
              textAlign="start"
              cursor="pointer"
              bg="bg.panel"
              borderBottomWidth="1px"
              borderColor="border"
              _last={{ borderBottomWidth: 0 }}
              _hover={{ bg: 'brand.subtle' }}
              focusVisibleRing="inside"
              onClick={() => onPick(employee)}
            >
              <Box minW="0">
                <Text fontWeight="bold" fontSize="sm" lineHeight="1.3" truncate>
                  {employee.displayName}
                </Text>
                <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                  {employee.employeeNo}
                  {employee.department ? ` · ${employee.department}` : ''}
                </Text>
              </Box>
              <Text fontSize="sm" fontWeight="bold" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                {t('app.pointsValue', { value: format.number(employee.balance) })}
              </Text>
            </chakra.button>
          ))}
        </Flex>
      </Flex>
    </FormField>
  );
}

interface AdjustPointsFormProps {
  /** Pre-selected employee (from the employees page); `null` shows a search box. */
  employee: Employee | null;
  onDone: () => void;
}

/** Manual credit or debit with a mandatory reason. Writes an `adjustment` row to the ledger. */
export function AdjustPointsForm({ employee, onDone }: AdjustPointsFormProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const adjust = useAdjustPoints();
  const [selected, setSelected] = useState<Employee | null>(employee);
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const amountError = submitted && (amount === '' || amount === 0) ? t('admin.ledger.amountNonZero') : null;
  const reasonError = submitted && reason.trim() === '' ? t('admin.ledger.reasonRequired') : null;
  const employeeError = submitted && !selected ? t('app.required') : null;
  const after = selected && typeof amount === 'number' && amount !== 0 ? selected.balance + amount : null;

  const submit = () => {
    setSubmitted(true);
    if (!selected || amount === '' || amount === 0 || reason.trim() === '') return;
    adjust.mutate(
      { employeeId: selected.id, amount, reason: reason.trim() },
      {
        onSuccess: () => {
          notifySuccess(t('admin.ledger.adjusted'));
          onDone();
        },
      },
    );
  };

  return (
    <Form onSubmit={submit}>
      {selected ? (
        <Flex align="center" justify="space-between" gap="3" wrap="wrap" bg="bg.subtle" borderRadius="l2" px="3" py="2.5">
          <Box minW="0">
            <Text fontWeight="extrabold" lineHeight="1.3">
              {selected.displayName}
            </Text>
            <Text fontSize="xs" color="fg.muted" fontWeight="medium">
              {selected.employeeNo}
            </Text>
          </Box>
          <Flex align="center" gap="2" fontWeight="bold" fontSize="sm" fontVariantNumeric="tabular-nums">
            <span>{t('admin.ledger.currentBalance', { value: format.number(selected.balance) })}</span>
            {after !== null && (
              <>
                <ArrowRight size={14} strokeWidth={3} aria-hidden />
                <Text as="span" color={after < 0 ? 'loss' : 'gain'} fontWeight="black">
                  {t('app.pointsValue', { value: format.number(after) })}
                </Text>
              </>
            )}
          </Flex>
          {!employee && (
            <Button size="xs" variant="outline" onClick={() => setSelected(null)}>
              {t('admin.ledger.changeEmployee')}
            </Button>
          )}
        </Flex>
      ) : (
        <EmployeePicker onPick={setSelected} error={employeeError} />
      )}
      <NumberField label={t('admin.ledger.amount')} help={t('admin.ledger.amountHelp')} required value={amount} onChange={setAmount} error={amountError} />
      <TextAreaField label={t('admin.ledger.reason')} required rows={2} value={reason} onChange={setReason} error={reasonError} />
      {adjust.error && <Notice tone="error" title={errorMessage(adjust.error)} />}
      <FormActions>
        <Button variant="outline" onClick={onDone}>
          {t('app.cancel')}
        </Button>
        <Button type="submit" loading={adjust.isPending}>
          {t('admin.ledger.adjust')}
        </Button>
      </FormActions>
    </Form>
  );
}
