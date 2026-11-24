import { Badge, Box, IconButton, Menu, Portal } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { Languages, Moon, Sun, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useMe, useSiteConfig } from '../api/auth';
import { keys } from '../api/keys';
import { saveMyLocale } from '../api/me';
import type { Locale, Me } from '../api/types';
import { useLocale } from '../i18n/hooks';
import { LOCALE_LABELS, LOCALES, rememberLocale } from '../i18n/locale';
import { springs } from '../lib/motion';
import { useActiveTheme } from '../themes/activeTheme';
import { useColorMode } from '../themes/colorMode';
import { exitThemePreview, previewThemeKey } from '../themes/preview';
import { ThemeSprite } from './ui/ThemeSprite';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const { data: me } = useMe();
  const { data: config } = useSiteConfig();
  const qc = useQueryClient();
  const current = useLocale();
  const locales = LOCALES.filter((locale) => !config || config.supportedLocales.includes(locale));

  const change = async (locale: Locale) => {
    rememberLocale(locale);
    await i18n.changeLanguage(locale);
    if (!me) return;
    try {
      await saveMyLocale(locale);
      qc.setQueryData<Me | null>(keys.me, (old) => (old ? { ...old, preferredLocale: locale } : old));
    } catch {
      // Not worth interrupting anyone: the language is already switched and remembered in this browser.
    }
  };

  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <IconButton variant="ghost" colorPalette="gray" size="sm" aria-label={t('app.language')} title={t('app.language')}>
          <Languages aria-hidden />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content borderRadius="l2" borderWidth="2px" borderColor="border" minW="10rem">
            <Menu.RadioItemGroup value={current} onValueChange={(details) => void change(details.value as Locale)}>
              <Menu.ItemGroupLabel>{t('app.language')}</Menu.ItemGroupLabel>
              {locales.map((locale) => (
                <Menu.RadioItem key={locale} value={locale} lang={locale} fontWeight="semibold" borderRadius="l1">
                  {LOCALE_LABELS[locale]}
                  <Menu.ItemIndicator />
                </Menu.RadioItem>
              ))}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

export function ColorSchemeToggle() {
  const { t } = useTranslation();
  const { colorMode, toggleColorMode } = useColorMode();
  const label = colorMode === 'dark' ? t('app.lightMode') : t('app.darkMode');
  return (
    <IconButton variant="ghost" colorPalette="gray" size="sm" aria-label={label} title={label} onClick={toggleColorMode} overflow="hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={colorMode}
          style={{ display: 'inline-flex' }}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={springs.snap}
        >
          {colorMode === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
}

/** Shown while a local `?theme=` preview overrides the site theme: the theme's sprite, its name, and a way out. */
export function ThemePreviewBadge() {
  const { t } = useTranslation();
  const theme = useActiveTheme();
  if (!previewThemeKey) return null;
  return (
    <Badge variant="subtle" colorPalette="brand" size="md" pl="1.5" pr="0.5" gap="1.5" display={{ base: 'none', sm: 'inline-flex' }}>
      <ThemeSprite scale={1} />
      <Box as="span" display={{ base: 'none', lg: 'inline' }}>
        {t('nav.themePreviewing', { name: t(`themes.${theme.id}`) })}
      </Box>
      <IconButton size="2xs" variant="ghost" borderRadius="full" aria-label={t('nav.exitPreview')} title={t('nav.exitPreview')} onClick={exitThemePreview}>
        <X aria-hidden />
      </IconButton>
    </Badge>
  );
}
