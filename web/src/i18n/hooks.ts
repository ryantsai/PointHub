import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/client';
import type { Locale, LocalizedText } from '../api/types';
import { isLocale, pickLocalized } from './locale';

export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';
}

/** Returns a picker for server-side `LocalizedText`, falling back to English when a translation is missing. */
export function useLocalized() {
  const locale = useLocale();
  return useCallback((text: LocalizedText | null | undefined) => pickLocalized(text, locale), [locale]);
}

/** Locale-aware date and number formatting. */
export function useFormat() {
  const locale = useLocale();
  return useMemo(() => {
    const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
    const number = new Intl.NumberFormat(locale);
    const signed = new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' });
    return {
      dateTime: (iso: string) => dateTime.format(new Date(iso)),
      time: (iso: string) => time.format(new Date(iso)),
      dateRange: (from: string, to: string) => dateTime.formatRange(new Date(from), new Date(to)),
      number: (value: number) => number.format(value),
      signed: (value: number) => signed.format(value),
    };
  }, [locale]);
}

/** Translates an API error code (or any thrown value) into a message for the user. */
export function useErrorMessage() {
  const { t, i18n } = useTranslation();
  return useCallback(
    (error: unknown): string => {
      const code = error instanceof ApiError ? error.code : typeof error === 'string' ? error : 'unknown';
      const key = `errors.${code}`;
      // Codes come from the server, so the key cannot be statically typed.
      return i18n.exists(key) ? t(key as 'errors.unknown') : t('errors.unknown');
    },
    [t, i18n],
  );
}
