import { Box, Button, Center, Flex, IconButton, Menu, Portal, SegmentGroup, Text, VisuallyHidden } from '@chakra-ui/react';
import { ChevronDown, Languages, Moon, Star, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Locale } from '@shared/data';
import { seasons, type SeasonKey } from '@shared/seasons';
import { locales, t } from '@shared/strings';
import type { LabState, View } from '@shared/urlState';
import { springs } from '../motion';
import { setLabState } from '../state/useLabState';

/** View / language / season / scheme. Everything writes to the URL hash; the app re-renders from it. */
export function ControlBar({ state }: { state: LabState }) {
  const { view, locale, season, scheme } = state;

  return (
    <Box
      as="header"
      position={{ base: 'static', md: 'sticky' }}
      top="0"
      zIndex="sticky"
      bg="bg.panel"
      borderBottomWidth="2px"
      borderColor="border"
    >
      <Flex maxW="1440px" mx="auto" px={{ base: '4', md: '6' }} py="2.5" align="center" justify="space-between" columnGap="3" rowGap="2.5" wrap="wrap">
        <Flex align="center" gap={{ base: '3', md: '5' }} flex={{ base: '1 1 100%', md: '0 1 auto' }} justify="space-between" minW="0">
          <Flex align="center" gap="2.5" minW="0">
            <Center
              aria-hidden
              boxSize="9"
              flexShrink={0}
              borderRadius="l2"
              bg="brand.solid"
              color="accent.solid"
              boxShadow="0 3px 0 0 {colors.brand.depth}"
              transform="rotate(-6deg)"
            >
              <Star size={18} fill="currentColor" strokeWidth={0} />
            </Center>
            <Text as="span" fontFamily="heading" fontWeight="extrabold" fontSize="lg" letterSpacing="-0.02em">
              {t(locale, 'appName')}
            </Text>
          </Flex>

          <SegmentGroup.Root
            size="sm"
            value={view}
            onValueChange={(e) => e.value && setLabState({ view: e.value as View })}
            aria-label={`${t(locale, 'viewEmployee')} / ${t(locale, 'viewAdmin')}`}
          >
            <SegmentGroup.Indicator />
            <SegmentGroup.Items
              items={[
                { value: 'employee', label: t(locale, 'viewEmployee') },
                { value: 'admin', label: t(locale, 'viewAdmin') },
              ]}
            />
          </SegmentGroup.Root>
        </Flex>

        <Flex align="center" gap={{ base: '2', md: '3' }} flex={{ base: '1 1 100%', md: '0 1 auto' }} justify={{ base: 'space-between', md: 'flex-end' }}>
          <SegmentGroup.Root
            size="sm"
            value={season}
            onValueChange={(e) => e.value && setLabState({ season: e.value as SeasonKey })}
            aria-label={t(locale, 'theme')}
          >
            <SegmentGroup.Indicator />
            {seasons.map((s) => (
              <SegmentGroup.Item key={s.key} value={s.key} title={t(locale, s.nameKey)} px={{ base: '2.5', sm: '3', xl: '3.5' }}>
                <SegmentGroup.ItemText display="inline-flex" alignItems="center" gap="1.5">
                  <span aria-hidden>{s.emoji}</span>
                  <Box as="span" aria-hidden display={{ base: 'none', xl: 'inline' }}>
                    {t(locale, s.nameKey)}
                  </Box>
                  <VisuallyHidden>{t(locale, s.nameKey)}</VisuallyHidden>
                </SegmentGroup.ItemText>
                <SegmentGroup.ItemHiddenInput />
              </SegmentGroup.Item>
            ))}
          </SegmentGroup.Root>

          <Flex align="center" gap="2">
            <Menu.Root positioning={{ placement: 'bottom-end' }}>
              <Menu.Trigger asChild>
                <Button variant="outline" size="sm" aria-label={t(locale, 'language')} px={{ base: '2.5', sm: '3.5' }}>
                  <Languages aria-hidden />
                  {locales.find((l) => l.code === locale)?.label}
                  <Box as="span" display={{ base: 'none', sm: 'inline-flex' }}>
                    <ChevronDown aria-hidden size={16} />
                  </Box>
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content borderRadius="l2" borderWidth="2px" borderColor="border" minW="10rem">
                    <Menu.RadioItemGroup value={locale} onValueChange={(e) => setLabState({ locale: e.value as Locale })}>
                      <Menu.ItemGroupLabel>{t(locale, 'language')}</Menu.ItemGroupLabel>
                      {locales.map((l) => (
                        <Menu.RadioItem key={l.code} value={l.code} lang={l.code} fontWeight="semibold" borderRadius="l1">
                          {l.label}
                          <Menu.ItemIndicator />
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioItemGroup>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>

            <IconButton
              variant="outline"
              size="sm"
              aria-label={t(locale, 'colorScheme')}
              title={t(locale, 'colorScheme')}
              aria-pressed={scheme === 'dark'}
              onClick={() => setLabState({ scheme: scheme === 'dark' ? 'light' : 'dark' })}
              overflow="hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={scheme}
                  style={{ display: 'inline-flex' }}
                  initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
                  transition={springs.snap}
                >
                  {scheme === 'dark' ? <Moon aria-hidden /> : <Sun aria-hidden />}
                </motion.span>
              </AnimatePresence>
            </IconButton>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}
