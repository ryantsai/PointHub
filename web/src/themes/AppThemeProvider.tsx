import { ChakraProvider } from '@chakra-ui/react';
import { useLayoutEffect, type ReactNode } from 'react';
import { useSiteConfig } from '../api/auth';
import { ActiveThemeContext } from './activeTheme';
import { previewThemeKey } from './preview';
import { getTheme } from './registry';
import { SeasonalEffects } from './SeasonalEffects';
import { system } from './system';

/**
 * Wraps the app in the Arcade design system and selects the theme: the local `?theme=` preview if there is
 * one, otherwise the site's `activeTheme` (an unknown key renders the standard theme).
 * The theme is one attribute on <html>; every colour follows through the semantic tokens and tweens.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { data: config } = useSiteConfig();
  const theme = getTheme(previewThemeKey ?? config?.activeTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme.key;
  }, [theme.key]);

  return (
    <ActiveThemeContext value={theme}>
      <ChakraProvider value={system}>
        <SeasonalEffects effect={theme.effect} />
        {children}
      </ChakraProvider>
    </ActiveThemeContext>
  );
}
