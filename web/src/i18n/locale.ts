import type { Locale, LocalizedText } from '../api/types';

export const LOCALES: readonly Locale[] = ['en', 'ja', 'zh-Hant'];
export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', ja: '日本語', 'zh-Hant': '繁體中文' };
/** dayjs locale names, used for date maths and formatting. */
export const DAYJS_LOCALES: Record<Locale, string> = { en: 'en', ja: 'ja', 'zh-Hant': 'zh-tw' };
/** Written only when the user explicitly picks a language, so browser detection keeps working until then. */
export const LOCALE_STORAGE_KEY = 'pointhub.locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Maps a browser language tag (ja-JP, zh-TW, zh-HK, en-GB…) to a supported locale, or null. */
export function toSupportedLocale(tag: string): Locale | null {
  const lower = tag.toLowerCase();
  if (lower === 'en' || lower.startsWith('en-')) return 'en';
  if (lower === 'ja' || lower.startsWith('ja-')) return 'ja';
  // Simplified-Chinese browsers also get Traditional Chinese: closer than English, and the only Chinese we ship.
  if (lower === 'zh' || lower.startsWith('zh-')) return 'zh-Hant';
  return null;
}

/** True when the user chose a language before, or the browser asks for one we support. */
export function hasLocalePreference(): boolean {
  try {
    if (isLocale(localStorage.getItem(LOCALE_STORAGE_KEY))) return true;
  } catch {
    // storage blocked: fall through to the browser languages
  }
  return navigator.languages.some((tag) => toSupportedLocale(tag) !== null);
}

export function rememberLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // storage blocked: the choice still applies for this page load
  }
}

export function pickLocalized(text: LocalizedText | null | undefined, locale: string): string {
  if (!text) return '';
  const value = locale === 'ja' ? text.ja : locale === 'zh-Hant' ? text.zhHant : text.en;
  return value && value.trim() !== '' ? value : text.en;
}
