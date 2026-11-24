import type { Locale } from '@shared/data';
import { formatNumber, formatPercent } from '@shared/strings';

/** "+1,280" / "−80" with a real minus sign. */
export const signed = (locale: Locale, amount: number): string =>
  `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${formatNumber(locale, Math.abs(amount))}`;

/** The shared percent formatter always shows a sign (it is made for deltas); a share needs none. */
export const share = (locale: Locale, ratio: number): string => formatPercent(locale, ratio).replace(/^[+＋]/, '');

/** Avatar fallback text: "TL" for "Taylor Lin", "林" for "林 泰樂". */
export const initials = (name: string): string => {
  const parts = name.split(/[\s・]+/).filter(Boolean);
  const first = Array.from(parts[0] ?? '')[0] ?? '';
  // CJK names: the family name alone reads better than two full-width glyphs squeezed in a circle
  if (/[぀-ヿ㐀-鿿]/.test(first)) return first;
  return parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toUpperCase();
};
