import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe, useSiteConfig } from '../api/auth';
import { hasLocalePreference } from '../i18n/locale';

/**
 * Picks the starting language: the signed-in employee's saved preference, else the stored/browser language
 * (handled by i18next's detector), else the site default.
 */
export function LocaleSync({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const { data: me } = useMe();
  const { data: config } = useSiteConfig();
  const preferred = me?.preferredLocale ?? null;
  const siteDefault = config?.defaultLocale ?? null;

  useEffect(() => {
    if (preferred) void i18n.changeLanguage(preferred);
  }, [i18n, preferred]);

  useEffect(() => {
    if (!preferred && siteDefault && !hasLocalePreference()) void i18n.changeLanguage(siteDefault);
  }, [i18n, preferred, siteDefault]);

  return children;
}
