import { Box, Input, SegmentGroup, Textarea } from '@chakra-ui/react';
import { useState } from 'react';
import type { Locale, LocalizedText } from '../api/types';
import { useLocale } from '../i18n/hooks';
import { LOCALE_LABELS, LOCALES } from '../i18n/locale';
import { FormField } from './ui/fields';

const FIELD: Record<Locale, keyof LocalizedText> = { en: 'en', ja: 'ja', 'zh-Hant': 'zhHant' };

interface LocalizedInputProps {
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  error?: string | null;
  required?: boolean;
  multiline?: boolean;
}

/**
 * One field, three languages. English is the required fallback; the other two are optional.
 * A dot on the language tab marks languages that already have text.
 */
export function LocalizedInput({ label, value, onChange, error, required, multiline }: LocalizedInputProps) {
  const uiLocale = useLocale();
  const [selected, setSelected] = useState<Locale | null>(null);
  // Start on English when it is still empty (it is the required one), otherwise on the UI language.
  const locale = selected ?? (value.en.trim() === '' ? 'en' : uiLocale);
  const field = FIELD[locale];
  const fieldLabel = `${label} (${LOCALE_LABELS[locale]})`;

  const update = (text: string) => onChange({ ...value, [field]: field === 'en' ? text : text === '' ? null : text });

  return (
    <FormField label={label} required={required} error={error}>
      <Box w="full">
        <SegmentGroup.Root size="xs" mb="2" value={locale} onValueChange={(details) => details.value && setSelected(details.value as Locale)} aria-label={label}>
          <SegmentGroup.Indicator />
          {LOCALES.map((code) => (
            <SegmentGroup.Item key={code} value={code} lang={code}>
              <SegmentGroup.ItemText>
                {LOCALE_LABELS[code]}
                {(value[FIELD[code]] ?? '').trim() !== '' ? ' •' : ''}
              </SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          ))}
        </SegmentGroup.Root>
        {multiline ? (
          <Textarea aria-label={fieldLabel} lang={locale} rows={3} resize="vertical" value={value[field] ?? ''} onChange={(event) => update(event.currentTarget.value)} />
        ) : (
          <Input aria-label={fieldLabel} lang={locale} value={value[field] ?? ''} onChange={(event) => update(event.currentTarget.value)} />
        )}
      </Box>
    </FormField>
  );
}
