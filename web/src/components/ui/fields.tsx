// Form controls. Every field takes `value`, `onChange(value)` (the value, not the event) and `error`, which is
// exactly what `form.field('name')` from lib/useFormState returns – so `<TextField label="…" {...form.field('x')} />`.
import { Box, Checkbox, Field, Input, NativeSelect, NumberInput, RadioGroup, Stack, Switch, Text, Textarea } from '@chakra-ui/react';
import dayjs from 'dayjs';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface FieldChrome {
  label?: ReactNode;
  /** Hint under the control (Mantine's `description`). */
  help?: ReactNode;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
}

/** Label + control + help + error. Use it directly to wrap a custom control; the typed fields below use it. */
export function FormField({ label, help, error, required, disabled, children }: FieldChrome & { children: ReactNode }) {
  return (
    <Field.Root invalid={Boolean(error)} required={required} disabled={disabled}>
      {label && (
        <Field.Label fontWeight="bold">
          {label}
          <Field.RequiredIndicator />
        </Field.Label>
      )}
      {children}
      {help && !error && <Field.HelperText>{help}</Field.HelperText>}
      {error && <Field.ErrorText fontWeight="semibold">{error}</Field.ErrorText>}
    </Field.Root>
  );
}

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'required' | 'disabled'>;

interface TextFieldProps extends FieldChrome, NativeInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TextField({ label, help, error, required, disabled, value, onChange, ...input }: TextFieldProps) {
  return (
    <FormField label={label} help={help} error={error} required={required} disabled={disabled}>
      <Input value={value} onChange={(event) => onChange(event.currentTarget.value)} {...input} />
    </FormField>
  );
}

interface TextAreaFieldProps extends FieldChrome {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  lang?: string;
  'aria-label'?: string;
}

export function TextAreaField({ label, help, error, required, disabled, value, onChange, rows = 3, ...textarea }: TextAreaFieldProps) {
  return (
    <FormField label={label} help={help} error={error} required={required} disabled={disabled}>
      <Textarea value={value} rows={rows} resize="vertical" onChange={(event) => onChange(event.currentTarget.value)} {...textarea} />
    </FormField>
  );
}

interface NumberFieldProps extends FieldChrome {
  /** `''` is an empty field. */
  value: number | '';
  onChange: (value: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

/** Whole numbers with stepper buttons. Out-of-range input is clamped when the field loses focus. */
export function NumberField({ label, help, error, required, disabled, value, onChange, min, max, step = 1, placeholder }: NumberFieldProps) {
  return (
    <FormField label={label} help={help} error={error} required={required} disabled={disabled}>
      <NumberInput.Root
        w="full"
        value={value === '' ? '' : String(value)}
        onValueChange={(details) => onChange(Number.isNaN(details.valueAsNumber) ? '' : details.valueAsNumber)}
        min={min}
        max={max}
        step={step}
        formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
        inputMode="numeric"
        clampValueOnBlur
      >
        <NumberInput.Control />
        <NumberInput.Input placeholder={placeholder} />
      </NumberInput.Root>
    </FormField>
  );
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> extends FieldChrome {
  data: readonly SelectOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** Adds an empty first option with this text; choosing it reports `null`. */
  placeholder?: string;
  'aria-label'?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/** Native select: the platform picker on phones, keyboard-friendly everywhere. */
export function SelectField<T extends string>({ label, help, error, required, disabled, data, value, onChange, placeholder, size, ...rest }: SelectFieldProps<T>) {
  return (
    <FormField label={label} help={help} error={error} required={required} disabled={disabled}>
      <NativeSelect.Root size={size}>
        <NativeSelect.Field value={value ?? ''} onChange={(event) => onChange(event.currentTarget.value === '' ? null : (event.currentTarget.value as T))} {...rest}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {data.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </FormField>
  );
}

interface ToggleProps {
  label: ReactNode;
  help?: ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  error?: string | null;
}

export function SwitchField({ label, help, value, onChange, disabled }: ToggleProps) {
  return (
    <Switch.Root checked={value} onCheckedChange={(details) => onChange(details.checked)} disabled={disabled} alignItems="flex-start">
      <Switch.HiddenInput />
      <Switch.Control mt="0.5" />
      <Switch.Label lineHeight="1.4">
        <Text as="span" fontWeight="bold">
          {label}
        </Text>
        {help && (
          <Text as="span" display="block" fontSize="sm" color="fg.muted" fontWeight="normal" mt="0.5">
            {help}
          </Text>
        )}
      </Switch.Label>
    </Switch.Root>
  );
}

export function CheckboxField({ label, help, value, onChange, disabled }: ToggleProps) {
  return (
    <Checkbox.Root checked={value} onCheckedChange={(details) => onChange(details.checked === true)} disabled={disabled} alignItems="flex-start">
      <Checkbox.HiddenInput />
      <Checkbox.Control mt="0.5" />
      <Checkbox.Label>
        <Text as="span" fontWeight="semibold">
          {label}
        </Text>
        {help && (
          <Text as="span" display="block" fontSize="sm" color="fg.muted" fontWeight="normal">
            {help}
          </Text>
        )}
      </Checkbox.Label>
    </Checkbox.Root>
  );
}

interface RadioFieldProps<T extends string> extends FieldChrome {
  data: readonly (SelectOption<T> & { help?: string })[];
  value: T;
  onChange: (value: T) => void;
}

export function RadioField<T extends string>({ label, help, error, required, disabled, data, value, onChange }: RadioFieldProps<T>) {
  return (
    <FormField label={label} help={help} error={error} required={required} disabled={disabled}>
      <RadioGroup.Root value={value} onValueChange={(details) => details.value && onChange(details.value as T)} disabled={disabled}>
        <Stack gap="2.5">
          {data.map((option) => (
            <RadioGroup.Item key={option.value} value={option.value} alignItems="flex-start">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator mt="0.5" />
              <RadioGroup.ItemText>
                <Text as="span" fontWeight="semibold">
                  {option.label}
                </Text>
                {option.help && (
                  <Text as="span" display="block" fontSize="sm" color="fg.muted" fontWeight="normal">
                    {option.help}
                  </Text>
                )}
              </RadioGroup.ItemText>
            </RadioGroup.Item>
          ))}
        </Stack>
      </RadioGroup.Root>
    </FormField>
  );
}

interface DateTimeFieldProps extends FieldChrome {
  /** ISO 8601 instant (what the API speaks), or null when empty. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** `false` picks a day only; the value is then local midnight of that day. */
  withTime?: boolean;
  /** Earliest allowed moment, ISO. */
  min?: string;
}

/**
 * Date and time in the browser's time zone, backed by the native picker (localised by the browser, good on
 * phones). Replaces `DateTimePicker` / `DateInput` from @mantine/dates.
 */
export function DateTimeField({ label, help, error, required, disabled, value, onChange, withTime = true, min }: DateTimeFieldProps) {
  const pattern = withTime ? 'YYYY-MM-DDTHH:mm' : 'YYYY-MM-DD';
  const toLocal = (iso: string | null | undefined) => (iso && dayjs(iso).isValid() ? dayjs(iso).format(pattern) : '');
  return (
    <FormField label={label} help={help} error={error} required={required} disabled={disabled}>
      <Box w="full">
        <Input
          type={withTime ? 'datetime-local' : 'date'}
          value={toLocal(value)}
          min={toLocal(min) || undefined}
          onChange={(event) => {
            const parsed = dayjs(event.currentTarget.value);
            onChange(event.currentTarget.value !== '' && parsed.isValid() ? parsed.toISOString() : null);
          }}
        />
      </Box>
    </FormField>
  );
}
