import { Box, Button, Flex, Grid, Input, SegmentGroup, Text } from '@chakra-ui/react';
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
import { MAX_PER_EMPLOYEE_LIMIT } from '../../lib/gifts';
import { notifySuccess } from '../../lib/notify';
import { GiftImagesEditor } from './GiftImagesEditor';
import { GiftStockForm } from './GiftStockForm';
import { Form } from './parts';

const EMPTY_TEXT: LocalizedText = { en: '', ja: null, zhHant: null };

type LimitMode = 'none' | 'limited';

type LimitProblem = 'required' | 'invalid' | 'tooLarge';

/**
 * Reads what was typed as a per-person limit: any whole number from 1 up. Full-width digits (Japanese and
 * Chinese keyboards) count as digits; 0, negative numbers, decimals and anything else are refused, not rounded.
 */
function parseLimit(text: string): { value: number } | { problem: LimitProblem } {
  const digits = text.normalize('NFKC').trim();
  if (digits === '') return { problem: 'required' };
  if (!/^\d+$/.test(digits)) return { problem: 'invalid' };
  const value = Number(digits);
  if (value < 1) return { problem: 'invalid' };
  if (value > MAX_PER_EMPLOYEE_LIMIT) return { problem: 'tooLarge' };
  return { value };
}

interface LimitFieldProps {
  mode: LimitMode;
  /** The number as typed. */
  count: string;
  onModeChange: (mode: LimitMode) => void;
  onCountChange: (count: string) => void;
  onCountBlur: () => void;
  error: string | null;
}

/** "No limit" or a number: how many of this gift one person may claim in total. */
function LimitField({ mode, count, onModeChange, onCountChange, onCountBlur, error }: LimitFieldProps) {
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
            {/* A plain text box, not a stepper: 250 is typed as easily as 2, and a wrong value gets a message instead of being silently changed. */}
            <Input
              w="32"
              value={count}
              onChange={(event) => onCountChange(event.currentTarget.value)}
              onBlur={onCountBlur}
              inputMode="numeric"
              autoComplete="off"
              fontVariantNumeric="tabular-nums"
              aria-label={t('admin.gifts.limit.count')}
            />
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
  const [limitText, setLimitText] = useState(String(gift?.perEmployeeLimit ?? 1));
  const [limitTouched, setLimitTouched] = useState(false);
  const [isActive, setIsActive] = useState(gift?.isActive ?? true);
  const [submitted, setSubmitted] = useState(false);
  const [stocking, setStocking] = useState(false);

  const nameError = submitted && name.en.trim() === '' ? t('admin.gifts.nameRequired') : null;
  const costError = submitted && pointCost === '' ? t('app.required') : null;
  const limit = limitMode === 'limited' ? parseLimit(limitText) : { value: null };
  const limitError = 'problem' in limit && (submitted || limitTouched) ? t(`admin.gifts.limit.${limit.problem}`, { max: format.number(MAX_PER_EMPLOYEE_LIMIT) }) : null;

  const submit = () => {
    setSubmitted(true);
    if (name.en.trim() === '' || pointCost === '') return;
    if ('problem' in limit) return;
    const input: GiftInput = {
      name,
      description: description.en.trim() === '' ? null : description,
      pointCost,
      isActive,
      perEmployeeLimit: limit.value,
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
          <LimitField mode={limitMode} count={limitText} onModeChange={setLimitMode} onCountChange={setLimitText} onCountBlur={() => setLimitTouched(true)} error={limitError} />
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
