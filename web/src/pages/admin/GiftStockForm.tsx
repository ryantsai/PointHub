import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdjustStock } from '../../api/gifts';
import type { Gift } from '../../api/types';
import { GiftThumb } from '../../components/GiftGallery';
import { NumberField, TextAreaField } from '../../components/ui/fields';
import { Notice } from '../../components/ui/Notice';
import { useErrorMessage, useFormat, useLocalized } from '../../i18n/hooks';
import { notifySuccess } from '../../lib/notify';
import { Form, FormActions } from './parts';

/** Add or remove stock with a mandatory reason (the change is written to the audit log). */
export function GiftStockForm({ gift, onDone }: { gift: Gift; onDone: () => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const localized = useLocalized();
  const errorMessage = useErrorMessage();
  const adjust = useAdjustStock();
  const [delta, setDelta] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const after = typeof delta === 'number' && delta !== 0 ? gift.stock + delta : null;

  const submit = () => {
    setSubmitted(true);
    if (delta === '' || delta === 0 || reason.trim() === '') return;
    adjust.mutate(
      { giftId: gift.id, delta, reason: reason.trim() },
      {
        onSuccess: () => {
          notifySuccess(t('admin.gifts.stockSaved'));
          onDone();
        },
      },
    );
  };

  return (
    <Form onSubmit={submit}>
      <Flex align="center" gap="3" bg="bg.subtle" borderRadius="l2" px="3" py="2.5">
        <GiftThumb images={gift.images} size={40} shape="square" />
        <Box minW="0" flex="1">
          <Text fontWeight="extrabold" lineHeight="1.3">
            {localized(gift.name)}
          </Text>
          <Flex align="center" gap="2" fontSize="sm" fontWeight="bold" fontVariantNumeric="tabular-nums" color="fg.muted">
            <span>{t('admin.gifts.currentStock', { count: gift.stock })}</span>
            {after !== null && (
              <>
                <ArrowRight size={14} strokeWidth={3} aria-hidden />
                <Text as="span" color={after < 0 ? 'loss' : 'fg'} fontWeight="black">
                  {format.number(after)}
                </Text>
              </>
            )}
          </Flex>
        </Box>
      </Flex>
      <NumberField
        label={t('admin.gifts.delta')}
        help={t('admin.gifts.deltaHelp')}
        required
        value={delta}
        onChange={setDelta}
        error={submitted && (delta === '' || delta === 0) ? t('admin.ledger.amountNonZero') : null}
      />
      <TextAreaField
        label={t('admin.ledger.reason')}
        required
        rows={2}
        value={reason}
        onChange={setReason}
        error={submitted && reason.trim() === '' ? t('admin.ledger.reasonRequired') : null}
      />
      {adjust.error && <Notice tone="error" title={errorMessage(adjust.error)} />}
      <FormActions>
        <Button variant="outline" onClick={onDone}>
          {t('app.cancel')}
        </Button>
        <Button type="submit" loading={adjust.isPending}>
          {t('app.save')}
        </Button>
      </FormActions>
    </Form>
  );
}
