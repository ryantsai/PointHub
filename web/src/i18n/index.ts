import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import 'dayjs/locale/zh-tw';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import type { Locale } from '../api/types';
import { DAYJS_LOCALES, isLocale, LOCALE_STORAGE_KEY, LOCALES, toSupportedLocale } from './locale';
import en from './locales/en.json';
import ja from './locales/ja.json';
import zhHant from './locales/zh-Hant.json';

export type Messages = typeof en;

// Typing every locale as `Messages` makes a missing key in ja/zh-Hant a compile error.
const resources: Record<Locale, { translation: Messages }> = {
  en: { translation: en },
  ja: { translation: ja },
  'zh-Hant': { translation: zhHant },
};

function applyLanguage(language: string) {
  const locale: Locale = isLocale(language) ? language : 'en';
  document.documentElement.lang = locale;
  dayjs.locale(DAYJS_LOCALES[locale]);
}

i18n.on('languageChanged', applyLanguage);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: [...LOCALES],
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React escapes
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: [],
      convertDetectedLanguage: (tag) => toSupportedLocale(tag) ?? tag,
    },
  });

applyLanguage(i18n.resolvedLanguage ?? 'en');

export default i18n;
