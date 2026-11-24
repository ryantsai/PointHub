import type { Locale, TransactionType } from '@shared/data';
import { formatNumber, type StringKey } from '@shared/strings';

/** +1,280 / −80 with a real minus sign; numbers only, so no translation needed. */
export const formatSigned = (locale: Locale, value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(locale, Math.abs(value))}`;

export const typeKey = (type: TransactionType): StringKey => `type_${type}`;

/** First visible character of a name, for avatar fallbacks (works for Latin and CJK names). */
export const initial = (name: string) => Array.from(name.trim())[0] ?? '';

export const pad2 = (n: number) => String(n).padStart(2, '0');
