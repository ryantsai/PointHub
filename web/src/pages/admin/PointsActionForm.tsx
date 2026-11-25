import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdjustEmployeePoints } from '../../api/admin';
import type { EmployeeDetail } from '../../api/types';
import { StatusBurst } from '../../components/StatusBurst';
import { Points } from '../../components/ui/bits';
import { NumberField, TextAreaField } from '../../components/ui/fields';
import { Notice } from '../../components/ui/Notice';
import { useErrorMessage, useFormat } from '../../i18n/hooks';
import { Form, FormActions } from './parts';

interface PointsActionFormProps {
  employee: EmployeeDetail;
  /** Award adds the amount, deduct takes it away; the person typing never deals with a minus sign. */
  mode: 'award' | 'deduct';
  onDone: () => void;
}

/**
 * The "Award points" / "Deduct points" dialog of the lookup page: a positive amount and a mandatory reason,
 * sent as one signed adjustment. Deducting more than the balance is allowed; the form warns that the balance
 * goes negative instead of blocking. After the save it stays open to show the balance the server now has.
 */
export function PointsActionForm({ employee, mode, onDone }: PointsActionFormProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const adjust = useAdjustEmployeePoints(employee.id);
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // The balance the dialog was opened with: the page behind refreshes after the save, the sums here must not jump.
  const [before] = useState(employee.balance);

  const valid = typeof amount === 'number' && Number.isInteger(amount) && amount > 0;
  const signed = valid ? (mode === 'award' ? amount : -amount) : null;
  const after = signed === null ? null : before + signed;
  const amountError = submitted && !valid ? t('admin.lookup.amountPositive') : null;
  const reasonError = submitted && reason.trim() === '' ? t('admin.ledger.reasonRequired') : null;

  const submit = () => {
    setSubmitted(true);
    if (signed === null || reason.trim() === '') return;
    adjust.mutate({ amount: signed, reason: reason.trim() });
  };

  if (adjust.isSuccess) {
    const { transaction, employee: fresh } = adjust.data;
    const balance = fresh?.balance ?? before + transaction.amount;
    return (
      <Flex direction="column" align="center" gap="2" py="4" role="status" textAlign="center">
        <StatusBurst tone="success" />
        <Text fontFamily="heading" fontWeight="extrabold" fontSize="xl" mt="4">
          {t(mode === 'award' ? 'admin.lookup.awarded' : 'admin.lookup.deducted', { name: employee.displayName, points: format.number(Math.abs(transaction.amount)) })}
        </Text>
        <Flex align="center" gap="2" wrap="wrap" justify="center" fontWeight="bold">
          <Text as="span" color="fg.muted">
            {t('admin.lookup.newBalance')}
          </Text>
          <Points value={balance} size="lg" color={balance < 0 ? 'loss' : undefined} />
        </Flex>
        <Button mt="3" onClick={onDone}>
          {t('app.close')}
        </Button>
      </Flex>
    );
  }

  return (
    <Form onSubmit={submit}>
      <Flex align="center" justify="space-between" gap="3" wrap="wrap" bg="bg.subtle" borderRadius="l2" px="3" py="2.5">
        <Box minW="0">
          <Text fontWeight="extrabold" lineHeight="1.3">
            {employee.displayName}
          </Text>
          <Text fontSize="xs" color="fg.muted" fontWeight="medium">
            {employee.employeeNo}
            {employee.department ? ` · ${employee.department}` : ''}
          </Text>
        </Box>
        <Flex align="center" gap="2" fontWeight="bold" fontSize="sm" fontVariantNumeric="tabular-nums">
          <span>{t('admin.ledger.currentBalance', { value: format.number(before) })}</span>
          {after !== null && (
            <>
              <ArrowRight size={14} strokeWidth={3} aria-hidden />
              <Text as="span" color={after < 0 ? 'loss' : mode === 'award' ? 'gain' : undefined} fontWeight="black">
                {t('app.pointsValue', { value: format.number(after) })}
              </Text>
            </>
          )}
        </Flex>
      </Flex>
      <NumberField
        label={t(mode === 'award' ? 'admin.lookup.amountAward' : 'admin.lookup.amountDeduct')}
        required
        min={1}
        value={amount}
        onChange={(value) => {
          adjust.reset();
          setAmount(value);
        }}
        error={amountError}
      />
      <TextAreaField label={t('admin.ledger.reason')} help={t('admin.lookup.reasonHelp')} required rows={2} value={reason} onChange={setReason} error={reasonError} />
      {after !== null && after < 0 && mode === 'deduct' && (
        <Notice tone="warning" title={t('admin.lookup.negativeTitle')}>
          {t('admin.lookup.negativeBody', { balance: format.number(before), after: format.number(after) })}
        </Notice>
      )}
      {adjust.error && <Notice tone="error" title={errorMessage(adjust.error)} />}
      <FormActions>
        <Button variant="outline" onClick={onDone}>
          {t('app.cancel')}
        </Button>
        <Button type="submit" colorPalette={mode === 'deduct' ? 'red' : undefined} loading={adjust.isPending}>
          {t(mode === 'award' ? 'admin.lookup.award' : 'admin.lookup.deduct')}
        </Button>
      </FormActions>
    </Form>
  );
}
