import { useCallback, useRef, useState, type FormEvent } from 'react';

type Errors<T> = Partial<Record<keyof T, string>>;
type Validators<T> = { [K in keyof T]?: (value: T[K], values: T) => string | null | undefined };

interface Options<T> {
  initialValues: T;
  /** Per-field rules, run on submit and again on every change once a submit has failed. */
  validate?: Validators<T>;
}

/**
 * Small form state: plain React state plus per-field validation. Replaces @mantine/form.
 *
 *   const form = useFormState({ initialValues: { name: '' }, validate: { name: (v) => (v.trim() ? null : t('app.required')) } });
 *   <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
 *     <TextField label="Name" {...form.field('name')} />
 *
 * `field(name)` returns `{ value, onChange(value), error }`, which is what every wrapper in components/ui/fields takes.
 */
export function useFormState<T extends Record<string, unknown>>({ initialValues, validate }: Options<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Errors<T>>({});
  const initial = useRef(initialValues);
  const submitted = useRef(false);

  const runValidation = useCallback(
    (next: T): Errors<T> => {
      const found: Errors<T> = {};
      if (!validate) return found;
      for (const key of Object.keys(validate) as (keyof T)[]) {
        const message = validate[key]?.(next[key], next);
        if (message) found[key] = message;
      }
      return found;
    },
    [validate],
  );

  const setFieldValue = useCallback(
    <K extends keyof T>(name: K, value: T[K]) => {
      setValues((previous) => ({ ...previous, [name]: value }));
      if (submitted.current) setErrors(runValidation({ ...values, [name]: value }));
    },
    [runValidation, values],
  );

  const field = <K extends keyof T>(name: K) => ({
    value: values[name],
    onChange: (value: T[K]) => setFieldValue(name, value),
    error: errors[name],
  });

  /** Wrap the submit handler: it only runs when every rule passes. Works as `<form onSubmit>` or a click handler. */
  const onSubmit = (handler: (values: T) => void) => (event?: FormEvent) => {
    event?.preventDefault();
    submitted.current = true;
    const found = runValidation(values);
    setErrors(found);
    if (Object.keys(found).length === 0) handler(values);
  };

  const reset = useCallback(() => {
    submitted.current = false;
    setValues(initial.current);
    setErrors({});
  }, []);

  /** For server-side `validation_failed` answers: `form.setErrors({ name: message })`. */
  return { values, errors, setValues, setFieldValue, setErrors, field, onSubmit, reset };
}
