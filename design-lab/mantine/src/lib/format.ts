import type { Locale } from '@shared/data';
import { formatNumber } from '@shared/strings';

export const intlLocale = (locale: Locale) => (locale === 'zh-Hant' ? 'zh-TW' : locale);

/** "+120" / "−80": explicit sign with a real minus, digits grouped for the locale. */
export const signed = (locale: Locale, amount: number) => `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${formatNumber(locale, Math.abs(amount))}`;

export const formatTime = (locale: Locale, iso: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const formatDay = (locale: Locale, date: Date) => new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', day: 'numeric' }).format(date);

export const formatShare = (locale: Locale, value: number) =>
  new Intl.NumberFormat(intlLocale(locale), { style: 'percent', maximumFractionDigits: 0 }).format(value);

/** Compact axis ticks: 12K / 1.2万 */
export const formatCompact = (locale: Locale, value: number) =>
  new Intl.NumberFormat(intlLocale(locale), { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  // CJK names: family name glyph; Latin names: two initials.
  return /[぀-ヿ㐀-鿿]/.test(first) ? first.slice(0, 1) : (first.slice(0, 1) + (parts[1]?.slice(0, 1) ?? '')).toUpperCase();
};
