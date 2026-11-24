// Per-render context: locale helpers + the active palette, so leaf components never touch the URL.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Locale, LocalizedText } from '@shared/data';
import { pick } from '@shared/data';
import type { Season } from '@shared/seasons';
import { formatDateTime, formatNumber, formatPercent, t, type StringKey } from '@shared/strings';
import type { Palette } from './theme';

export type Lab = {
  locale: Locale;
  season: Season;
  palette: Palette;
  tr: (key: StringKey, vars?: Record<string, string | number>) => string;
  num: (value: number) => string;
  /** Signed amount with a real minus sign, e.g. +50 / −80. */
  signed: (value: number) => string;
  date: (iso: string) => string;
  percent: (value: number) => string;
  text: (value: LocalizedText) => string;
};

const LabContext = createContext<Lab | null>(null);

export function LabProvider({ locale, season, palette, children }: { locale: Locale; season: Season; palette: Palette; children: ReactNode }) {
  const value = useMemo<Lab>(
    () => ({
      locale,
      season,
      palette,
      tr: (key, vars) => t(locale, key, vars),
      num: (n) => formatNumber(locale, n),
      signed: (n) => `${n < 0 ? '−' : '+'}${formatNumber(locale, Math.abs(n))}`,
      date: (iso) => formatDateTime(locale, iso),
      percent: (n) => formatPercent(locale, n),
      text: (value) => pick(value, locale),
    }),
    [locale, season, palette],
  );
  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab(): Lab {
  const lab = useContext(LabContext);
  if (!lab) throw new Error('useLab must be used inside <LabProvider>');
  return lab;
}
