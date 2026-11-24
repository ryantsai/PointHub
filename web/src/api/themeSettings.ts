import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { keys } from './keys';
import type { ThemeSettings, ThemeSettingsInput } from './types';

/** Seasonal theme settings (system admin): mode, forced theme, skipped festivals and the computed calendar. */
export function useThemeSettings() {
  return useQuery({
    queryKey: keys.themeSettings,
    queryFn: () => api.get<ThemeSettings>('/api/admin/site/theme'),
  });
}

export function useSaveThemeSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ThemeSettingsInput) => api.put<ThemeSettings>('/api/admin/site/theme', input),
    onSuccess: (settings) => {
      qc.setQueryData(keys.themeSettings, settings);
      // The live theme comes from the site config: refetching it re-themes the app at once.
      void qc.invalidateQueries({ queryKey: keys.siteConfig });
    },
  });
}
