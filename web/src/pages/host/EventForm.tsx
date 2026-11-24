import { Button, Flex, Grid } from '@chakra-ui/react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useSaveEvent } from '../../api/host';
import type { ApprovalMode, CheckInMode, EventDetail, EventInput, LocalizedText } from '../../api/types';
import { LocalizedInput } from '../../components/LocalizedInput';
import { DateTimeField, NumberField, RadioField, SelectField, SwitchField, TextField } from '../../components/ui/fields';
import { Notice } from '../../components/ui/Notice';
import { useErrorMessage } from '../../i18n/hooks';
import { notifySuccess } from '../../lib/notify';
import { useFormState } from '../../lib/useFormState';

const APPROVAL_MODES: ApprovalMode[] = ['manual', 'autoApproveRoster', 'autoApproveAll'];
const CHECK_IN_MODES: CheckInMode[] = ['static', 'rotating'];
const EMPTY_TEXT: LocalizedText = { en: '', ja: null, zhHant: null };

type FormValues = {
  title: LocalizedText;
  description: LocalizedText;
  location: string;
  /** ISO instants, as the API speaks them. */
  startsAt: string | null;
  endsAt: string | null;
  points: number | '';
  approvalMode: ApprovalMode;
  checkInMode: CheckInMode;
  rosterOnly: boolean;
  maxParticipants: number | '';
};

const hasTranslation = (text: LocalizedText) => Boolean(text.ja?.trim() || text.zhHant?.trim());

function toFormValues(event: EventDetail | null): FormValues {
  return {
    title: event?.title ?? EMPTY_TEXT,
    description: event?.description ?? EMPTY_TEXT,
    location: event?.location ?? '',
    startsAt: event?.startsAt ?? null,
    endsAt: event?.endsAt ?? null,
    points: event?.points ?? 10,
    approvalMode: event?.approvalMode ?? 'manual',
    checkInMode: event?.checkInMode ?? 'static',
    rosterOnly: event?.rosterOnly ?? false,
    maxParticipants: event?.maxParticipants ?? '',
  };
}

interface EventFormProps {
  /** `null` creates a new event. */
  event: EventDetail | null;
  onSaved: (event: EventDetail) => void;
  onCancel: () => void;
}

const TWO_COLUMNS = { base: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' };

export function EventForm({ event, onSaved, onCancel }: EventFormProps) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const save = useSaveEvent(event?.id ?? null);

  const form = useFormState<FormValues>({
    initialValues: toFormValues(event),
    validate: {
      title: (value) => (value.en.trim() === '' ? t('host.validation.titleRequired') : null),
      description: (value) => (value.en.trim() === '' && hasTranslation(value) ? t('host.validation.descriptionEnglish') : null),
      startsAt: (value) => (value ? null : t('app.required')),
      endsAt: (value, values) =>
        !value ? t('app.required') : values.startsAt && !dayjs(value).isAfter(dayjs(values.startsAt)) ? t('host.validation.endAfterStart') : null,
      points: (value) => (value === '' ? t('app.required') : null),
    },
  });

  const submit = form.onSubmit((values) => {
    if (!values.startsAt || !values.endsAt || values.points === '') return; // ruled out by the validation above
    const input: EventInput = {
      title: values.title,
      description: values.description.en.trim() === '' ? null : values.description,
      location: values.location.trim() === '' ? null : values.location.trim(),
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      points: values.points,
      approvalMode: values.approvalMode,
      checkInMode: values.checkInMode,
      rosterOnly: values.rosterOnly,
      maxParticipants: values.maxParticipants === '' ? null : values.maxParticipants,
    };
    save.mutate(input, {
      onSuccess: (saved) => {
        notifySuccess(t('host.saved'));
        onSaved(saved);
      },
    });
  });

  return (
    <form onSubmit={submit} noValidate>
      <Flex direction="column" gap="5">
        <LocalizedInput label={t('host.fields.title')} required {...form.field('title')} />
        <LocalizedInput label={t('host.fields.description')} multiline {...form.field('description')} />
        <TextField label={t('host.fields.location')} {...form.field('location')} />
        <Grid templateColumns={TWO_COLUMNS} gap="4">
          <DateTimeField label={t('host.fields.startsAt')} required {...form.field('startsAt')} />
          <DateTimeField label={t('host.fields.endsAt')} required min={form.values.startsAt ?? undefined} {...form.field('endsAt')} />
        </Grid>
        <Grid templateColumns={TWO_COLUMNS} gap="4">
          <NumberField label={t('host.fields.points')} help={t('host.fields.pointsHelp')} required min={0} {...form.field('points')} />
          <NumberField label={t('host.fields.maxParticipants')} help={t('host.fields.maxParticipantsHelp')} min={1} {...form.field('maxParticipants')} />
        </Grid>
        <RadioField
          label={t('host.fields.checkInMode')}
          data={CHECK_IN_MODES.map((mode) => ({ value: mode, label: t(`checkInMode.${mode}`), help: t(`checkInModeHelp.${mode}`) }))}
          {...form.field('checkInMode')}
        />
        <SelectField
          label={t('host.fields.approvalMode')}
          help={t(`approvalModeHelp.${form.values.approvalMode}`)}
          data={APPROVAL_MODES.map((mode) => ({ value: mode, label: t(`approvalMode.${mode}`) }))}
          value={form.values.approvalMode}
          onChange={(value) => value && form.setFieldValue('approvalMode', value)}
        />
        <SwitchField label={t('host.fields.rosterOnly')} help={t('host.fields.rosterOnlyHelp')} {...form.field('rosterOnly')} />
        {save.error && <Notice tone="error" title={errorMessage(save.error)} />}
        <Flex justify="flex-end" gap="2" wrap="wrap" pb="1">
          <Button variant="outline" onClick={onCancel}>
            {t('app.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {event ? t('app.save') : t('host.createEvent')}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
