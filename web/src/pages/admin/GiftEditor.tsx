import { Box, Button, Flex, Grid, NumberInput, SegmentGroup, Text } from '@chakra-ui/react';
import { Boxes, Images, PencilLine } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSaveGift } from '../../api/gifts';
import type { Gift, GiftInput, LocalizedText } from '../../api/types';
import { LocalizedInput } from '../../components/LocalizedInput';
import { SectionTitle } from '../../components/ui/bits';
import { FormField, NumberField, SwitchField } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../components/ui/Notice';
import { Panel } from '../../components/ui/Panel';
import { useErrorMessage, useFormat } from '../../i18n/hooks';
import { notifySuccess } from '../../lib/notify';
import { GiftImagesEditor } from './GiftImagesEditor';
import { GiftStockForm } from './GiftStockForm';
import { Form } from './parts';

const EMPTY_TEXT: LocalizedText = { en: '', ja: null, zhHant: null };

type LimitMode = 'none' | 'limited';

interface LimitFieldProps {
  mode: LimitMode;
  count: number | '';
  onModeChange: (mode: LimitMode) => void;
  onCountChange: (count: number | '') => void;
  error: string | null;
}

/** "No limit" or a number: how many of this gift one person may claim in total. */
function LimitField({ mode, count, onModeChange, onCountChange, error }: LimitFieldProps) {
  const { t } = useTranslation();
  const label = t('admin.gifts.fields.perEmployeeLimit');
  return (
    <FormField label={label} help={t('admin.gifts.fields.perEmployeeLimitHelp')} error={error}>
      <Flex align="center" gap="3" wrap="wrap" w="full">
        <SegmentGroup.Root size="sm" value={mode} onValueChange={(details) => details.value && onModeChange(details.value as LimitMode)} aria-label={label}>
          <SegmentGroup.Indicator />
          {(['none', 'limited'] as const).map((value) => (
            <SegmentGroup.Item key={value} value={value}>
              <SegmentGroup.ItemText>{t(`admin.gifts.limit.${value}`)}</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          ))}
        </SegmentGroup.Root>
        {mode === 'limited' && (
          <Flex align="center" gap="2">
            <NumberInput.Root
              w="28"
              value={count === '' ? '' : String(count)}
              onValueChange={(details) => onCountChange(Number.isNaN(details.valueAsNumber) ? '' : details.valueAsNumber)}
              min={1}
              formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
              inputMode="numeric"
              clampValueOnBlur
            >
              <NumberInput.Control />
              <NumberInput.Input aria-label={t('admin.gifts.limit.count')} />
            </NumberInput.Root>
            <Text fontSize="sm" fontWeight="semibold" color="fg.muted" whiteSpace="nowrap">
              {t('admin.gifts.limit.unit')}
            </Text>
          </Flex>
        )}
      </Flex>
    </FormField>
  );
}

interface GiftEditorProps {
  /** `null` creates a gift. */
  gift: Gift | null;
  /** Called with the new gift right after it was created (the page then shows its picture section). */
  onCreated: (gift: Gift) => void;
  onClose: () => void;
}

/** Details on the left, pictures on the right. Details are saved with the button; pictures save themselves. */
export function GiftEditor({ gift, onCreated, onClose }: GiftEditorProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const save = useSaveGift(gift?.id ?? null);
  const [name, setName] = useState<LocalizedText>(gift?.name ?? EMPTY_TEXT);
  const [description, setDescription] = useState<LocalizedText>(gift?.description ?? EMPTY_TEXT);
  const [pointCost, setPointCost] = useState<number | ''>(gift?.pointCost ?? '');
  const [initialStock, setInitialStock] = useState<number | ''>(0);
  const [limitMode, setLimitMode] = useState<LimitMode>(gift?.perEmployeeLimit != null ? 'limited' : 'none');
  const [limitCount, setLimitCount] = useState<number | ''>(gift?.perEmployeeLimit ?? 1);
  const [isActive, setIsActive] = useState(gift?.isActive ?? true);
  const [submitted, setSubmitted] = useState(false);
  const [stocking, setStocking] = useState(false);

  const nameError = submitted && name.en.trim() === '' ? t('admin.gifts.nameRequired') : null;
  const costError = submitted && pointCost === '' ? t('app.required') : null;
  const limitError = submitted && limitMode === 'limited' && (limitCount === '' || limitCount < 1) ? t('admin.gifts.limit.required') : null;

  const submit = () => {
    setSubmitted(true);
    if (name.en.trim() === '' || pointCost === '') return;
    if (limitMode === 'limited' && (limitCount === '' || limitCount < 1)) return;
    const input: GiftInput = {
      name,
      description: description.en.trim() === '' ? null : description,
      pointCost,
      isActive,
      perEmployeeLimit: limitMode === 'limited' && limitCount !== '' ? limitCount : null,
      ...(gift === null ? { initialStock: initialStock === '' ? 0 : initialStock } : {}),
    };
    save.mutate(input, {
      onSuccess: (saved) => {
        notifySuccess(gift === null ? t('admin.gifts.created') : t('admin.gifts.saved'));
        if (gift === null) onCreated(saved);
      },
    });
  };

  return (
    <Grid templateColumns={{ base: 'minmax(0, 1fr)', xl: 'minmax(0, 1fr) minmax(0, 1fr)' }} gap={{ base: '6', xl: '6' }} alignItems="start">
      <Panel>
        <Form onSubmit={submit}>
          <SectionTitle icon={PencilLine} title={t('admin.gifts.sectionDetails')} compact />
          <LocalizedInput label={t('admin.gifts.fields.name')} required value={name} onChange={setName} error={nameError} />
          <LocalizedInput label={t('admin.gifts.fields.description')} multiline value={description} onChange={setDescription} />
          <Grid templateColumns={{ base: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }} gap="4" alignItems="start">
            <NumberField label={t('admin.gifts.fields.pointCost')} required min={0} value={pointCost} onChange={setPointCost} error={costError} />
            {gift === null ? (
              <NumberField label={t('admin.gifts.fields.initialStock')} min={0} value={initialStock} onChange={setInitialStock} />
            ) : (
              <FormField label={t('admin.gifts.columns.stock')}>
                <Flex align="center" gap="3" minH="10">
                  <Flex align="center" gap="1.5" fontWeight="black" fontSize="lg" fontVariantNumeric="tabular-nums" color={gift.stock === 0 ? 'loss' : undefined}>
                    <Boxes size={18} strokeWidth={2.4} aria-hidden />
                    {format.number(gift.stock)}
                  </Flex>
                  <Button size="xs" variant="outline" onClick={() => setStocking(true)}>
                    {t('admin.gifts.stockTitle')}
                  </Button>
                </Flex>
              </FormField>
            )}
          </Grid>
          <LimitField mode={limitMode} count={limitCount} onModeChange={setLimitMode} onCountChange={setLimitCount} error={limitError} />
          <SwitchField label={t('admin.gifts.fields.isActive')} help={t('admin.gifts.fields.isActiveHelp')} value={isActive} onChange={setIsActive} />
          {save.error && <Notice tone="error" title={errorMessage(save.error)} />}
          <Flex justify="flex-end" gap="2" wrap="wrap">
            <Button variant="outline" onClick={onClose}>
              {t('admin.gifts.backToList')}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {gift === null ? t('admin.gifts.createGift') : t('app.save')}
            </Button>
          </Flex>
        </Form>
      </Panel>

      <Panel>
        <SectionTitle icon={Images} title={t('admin.gifts.images.title')} compact />
        {gift === null ? (
          <Box>
            <Notice tone="info" title={t('admin.gifts.images.afterCreate')} />
          </Box>
        ) : (
          <GiftImagesEditor gift={gift} />
        )}
      </Panel>

      {gift && (
        <Modal opened={stocking} onClose={() => setStocking(false)} title={t('admin.gifts.stockTitle')}>
          <GiftStockForm gift={gift} onDone={() => setStocking(false)} />
        </Modal>
      )}
    </Grid>
  );
}
