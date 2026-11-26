import { Badge, Box, Button, Center, Flex, Grid, RadioCard, Switch, Text, Timeline } from '@chakra-ui/react';
import dayjs from 'dayjs';
import { CalendarDays, CalendarRange, Eye, Palette, Pin, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSaveThemeSettings, useThemeSettings } from '../../api/themeSettings';
import type { ThemeKey, ThemeMode, ThemeSettings, ThemeWindow } from '../../api/types';
import { Page } from '../../components/Page';
import { ErrorBlock, LoadingBlock } from '../../components/states';
import { Eyebrow, SectionTitle } from '../../components/ui/bits';
import { HeroPanel } from '../../components/ui/HeroPanel';
import { Notice } from '../../components/ui/Notice';
import { Panel } from '../../components/ui/Panel';
import { ThemeSprite } from '../../components/ui/ThemeSprite';
import { useErrorMessage, useLocale } from '../../i18n/hooks';
import { openConfirm } from '../../lib/confirm';
import { itemVariants, springs } from '../../lib/motion';
import { notifySuccess } from '../../lib/notify';
import { exitThemePreview, previewThemeKey } from '../../themes/preview';
import { getTheme, THEMES, type ThemeDefinition } from '../../themes/registry';

const FESTIVALS = THEMES.filter((theme) => theme.key !== 'default');

/** Day-level formatting for the `YYYY-MM-DD` dates of the festival calendar (site time zone, no clock time). */
function useDayFormat() {
  const locale = useLocale();
  return useMemo(() => {
    const full = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
    const short = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    const toDate = (day: string) => dayjs(day).toDate();
    return {
      full: (day: string) => full.format(toDate(day)),
      range: (from: string, to: string) => (from === to ? short.format(toDate(from)) : short.formatRange(toDate(from), toDate(to))),
    };
  }, [locale]);
}

/** The theme's own colours, straight from the registry: this is a picture of another theme, not UI chrome. */
function ThemeArt({ theme, size = 56, scale = 2 }: { theme: ThemeDefinition; size?: number; scale?: number }) {
  return (
    <Center
      aria-hidden
      flexShrink={0}
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="l2"
      style={{ backgroundImage: `linear-gradient(140deg, ${theme.gradient[0]}, ${theme.gradient[1]} 70%, ${theme.gradient[2]} 130%)` }}
    >
      <ThemeSprite theme={theme} scale={scale} />
    </Center>
  );
}

function Swatches({ theme }: { theme: ThemeDefinition }) {
  return (
    <Flex gap="1" aria-hidden>
      {[theme.primary, theme.accent].map((color) => (
        <Box key={color} boxSize="3.5" borderRadius="full" borderWidth="2px" borderColor="bg.panel" boxShadow="0 0 0 1px {colors.border.emphasized}" style={{ backgroundColor: color }} />
      ))}
    </Flex>
  );
}

function PreviewButton({ theme, dirty }: { theme: ThemeDefinition; dirty: boolean }) {
  const { t } = useTranslation();
  const name = t(`themes.${theme.id}`);
  // The current path, not a bare `?theme=`: a relative link would resolve against <base href> (the app root).
  const href = `${window.location.pathname}?theme=${theme.key}`;
  const current = previewThemeKey === theme.key;
  return (
    <Button asChild size="xs" variant={current ? 'subtle' : 'ghost'} aria-label={`${t('admin.themes.preview')}: ${name}`} title={t('admin.themes.previewHint')}>
      {/* A plain link: the preview is read once at page load (themes/preview.ts), so it needs a reload. */}
      <a
        href={href}
        onClick={(event) => {
          if (!dirty) return;
          event.preventDefault();
          openConfirm({
            title: t('admin.themes.previewUnsavedTitle'),
            children: <Text fontSize="sm">{t('admin.themes.previewUnsavedBody')}</Text>,
            labels: { confirm: t('admin.themes.preview'), cancel: t('app.cancel') },
            onConfirm: () => window.location.assign(href),
          });
        }}
      >
        <Eye aria-hidden />
        {current ? t('admin.themes.previewing') : t('admin.themes.preview')}
      </a>
    </Button>
  );
}

/** What is on screen for everyone right now, and what the calendar alone would pick. */
function StatusHero({ settings }: { settings: ThemeSettings }) {
  const { t } = useTranslation();
  const days = useDayFormat();
  const active = getTheme(settings.activeTheme);
  const calendar = getTheme(settings.calendarTheme);
  return (
    <motion.section variants={itemVariants}>
      <HeroPanel p={{ base: '4', md: '5' }}>
        <Flex align="center" gap={{ base: '4', md: '5' }} wrap="wrap">
          <Center boxSize="20" flexShrink={0} borderRadius="l3" bg="rgba(0, 0, 0, 0.28)">
            <ThemeSprite theme={active} scale={4} bob />
          </Center>
          <Box flex="1" minW="220px">
            <Eyebrow color="white" opacity={0.85}>
              {t('admin.themes.activeNow')}
            </Eyebrow>
            <Text fontFamily="heading" fontWeight="extrabold" fontSize={{ base: '2xl', md: '3xl' }} lineHeight="1.15" letterSpacing="-0.02em">
              {t(`themes.${active.id}`)}
            </Text>
            <Text fontWeight="semibold" fontSize="sm" mt="1" opacity={0.92}>
              {settings.mode === 'forced' ? t('admin.themes.statusForced') : t('admin.themes.statusCalendar')}
            </Text>
          </Box>
          <Flex direction="column" gap="1.5" fontSize="sm" fontWeight="semibold" bg="rgba(0, 0, 0, 0.28)" borderRadius="l2" px="4" py="3" minW={{ base: 'full', md: '260px' }}>
            <Flex justify="space-between" gap="4">
              <Text opacity={0.85}>{t('admin.themes.calendarAlone')}</Text>
              <Text fontWeight="extrabold" textAlign="end">
                {t(`themes.${calendar.id}`)}
              </Text>
            </Flex>
            <Flex justify="space-between" gap="4">
              <Text opacity={0.85}>{t('admin.themes.today')}</Text>
              <Text fontWeight="extrabold" textAlign="end" fontVariantNumeric="tabular-nums">
                {days.full(settings.today)}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </HeroPanel>
    </motion.section>
  );
}

function ModeCard({ value, icon, title, description }: { value: ThemeMode; icon: React.ReactNode; title: string; description: string }) {
  return (
    <RadioCard.Item value={value} borderWidth="2px" borderColor="border.emphasized" bg="bg.panel" borderRadius="l2" transition="border-color 160ms, background-color 160ms, box-shadow 160ms" _checked={{ borderColor: 'brand.solid', bg: 'brand.subtle', boxShadow: '0 4px 0 0 {colors.brand.solid}' }}>
      <RadioCard.ItemHiddenInput />
      <RadioCard.ItemControl p="4" gap="3" alignItems="flex-start">
        <Center boxSize="10" flexShrink={0} borderRadius="l2" bg="brand.muted" color="brand.fg">
          {icon}
        </Center>
        <RadioCard.ItemContent>
          <RadioCard.ItemText fontWeight="extrabold" fontSize="md">
            {title}
          </RadioCard.ItemText>
          <RadioCard.ItemDescription fontWeight="medium" color="fg.muted" opacity={1} mt="0.5">
            {description}
          </RadioCard.ItemDescription>
        </RadioCard.ItemContent>
        <RadioCard.ItemIndicator />
      </RadioCard.ItemControl>
    </RadioCard.Item>
  );
}

function sameKeys(a: readonly ThemeKey[], b: readonly ThemeKey[]) {
  return a.length === b.length && a.every((key) => b.includes(key));
}

function SettingsForm({ settings }: { settings: ThemeSettings }) {
  const { t } = useTranslation();
  const days = useDayFormat();
  const errorMessage = useErrorMessage();
  const save = useSaveThemeSettings();
  const [mode, setMode] = useState<ThemeMode>(settings.mode);
  const [forcedKey, setForcedKey] = useState<ThemeKey>(settings.forcedThemeKey ?? settings.activeTheme);
  const [disabled, setDisabled] = useState<ThemeKey[]>(settings.disabledThemeKeys);

  const dirty = mode !== settings.mode || (mode === 'forced' && forcedKey !== settings.forcedThemeKey) || !sameKeys(disabled, settings.disabledThemeKeys);
  const nextWindow = new Map<ThemeKey, ThemeWindow>();
  for (const entry of settings.calendar) if (!nextWindow.has(entry.themeKey)) nextWindow.set(entry.themeKey, entry);

  const reset = () => {
    setMode(settings.mode);
    setForcedKey(settings.forcedThemeKey ?? settings.activeTheme);
    setDisabled(settings.disabledThemeKeys);
    save.reset();
  };

  const submit = () =>
    save.mutate(
      { mode, forcedThemeKey: mode === 'forced' ? forcedKey : null, disabledThemeKeys: FESTIVALS.map((theme) => theme.key).filter((key) => disabled.includes(key)) },
      { onSuccess: () => notifySuccess(t('admin.themes.saved')) },
    );

  const untilLabel = (entry: ThemeWindow) => {
    const until = dayjs(entry.startsOn).diff(dayjs(settings.today), 'day');
    if (until <= 0) return t('admin.themes.onNow');
    return until === 1 ? t('admin.themes.tomorrow') : t('admin.themes.inDays', { count: until });
  };

  return (
    <>
      <StatusHero settings={settings} />

      {previewThemeKey && (
        <Notice tone="info" title={t('admin.themes.previewNoticeTitle', { name: t(`themes.${getTheme(previewThemeKey).id}`) })}>
          <Flex direction="column" align="flex-start" gap="2">
            {t('admin.themes.previewNoticeBody')}
            <Button size="xs" variant="outline" onClick={exitThemePreview}>
              {t('nav.exitPreview')}
            </Button>
          </Flex>
        </Notice>
      )}

      <motion.section variants={itemVariants}>
        <Flex direction="column" gap="4">
          <SectionTitle icon={Palette} title={t('admin.themes.modeTitle')} />
          <RadioCard.Root value={mode} onValueChange={(details) => details.value && setMode(details.value as ThemeMode)} aria-label={t('admin.themes.modeTitle')}>
            <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' }} gap="3">
              <ModeCard value="calendar" icon={<CalendarDays size={20} strokeWidth={2.4} aria-hidden />} title={t('admin.themes.modeCalendar')} description={t('admin.themes.modeCalendarHelp')} />
              <ModeCard value="forced" icon={<Pin size={20} strokeWidth={2.4} aria-hidden />} title={t('admin.themes.modeForced')} description={t('admin.themes.modeForcedHelp')} />
            </Grid>
          </RadioCard.Root>

          {mode === 'forced' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springs.soft}>
              <RadioCard.Root value={forcedKey} onValueChange={(details) => details.value && setForcedKey(details.value as ThemeKey)} aria-label={t('admin.themes.pickTheme')}>
                <RadioCard.Label fontWeight="bold" mb="1">
                  {t('admin.themes.pickTheme')}
                </RadioCard.Label>
                <Grid templateColumns="repeat(auto-fill, minmax(172px, 1fr))" gap="3">
                  {THEMES.map((theme) => (
                    <Flex key={theme.key} direction="column" gap="1" minW="0">
                      <RadioCard.Item
                        value={theme.key}
                        borderWidth="2px"
                        borderColor="border.emphasized"
                        bg="bg.panel"
                        borderRadius="l2"
                        overflow="hidden"
                        transition="border-color 160ms, box-shadow 160ms, transform 160ms"
                        _hover={{ transform: 'translateY(-2px)' }}
                        _checked={{ borderColor: 'brand.solid', boxShadow: '0 4px 0 0 {colors.brand.solid}' }}
                      >
                        <RadioCard.ItemHiddenInput />
                        <RadioCard.ItemControl flexDirection="column" alignItems="stretch" p="0" gap="0">
                          <Center h="20" aria-hidden style={{ backgroundImage: `linear-gradient(140deg, ${theme.gradient[0]}, ${theme.gradient[1]} 70%, ${theme.gradient[2]} 130%)` }}>
                            <ThemeSprite theme={theme} scale={3} />
                          </Center>
                          <Flex direction="column" gap="2" px="3" py="2.5">
                            <RadioCard.ItemText fontWeight="bold" fontSize="sm" lineHeight="1.3">
                              {t(`themes.${theme.id}`)}
                            </RadioCard.ItemText>
                            <Flex align="center" justify="space-between" gap="2">
                              <Swatches theme={theme} />
                              <RadioCard.ItemIndicator />
                            </Flex>
                          </Flex>
                        </RadioCard.ItemControl>
                      </RadioCard.Item>
                      <Flex justify="flex-end">
                        <PreviewButton theme={theme} dirty={dirty} />
                      </Flex>
                    </Flex>
                  ))}
                </Grid>
              </RadioCard.Root>
            </motion.div>
          )}

          {save.error && <Notice tone="error" title={errorMessage(save.error)} />}
          <Flex align="center" gap="3" wrap="wrap">
            <Button loading={save.isPending} disabled={!dirty} onClick={submit}>
              <Save aria-hidden />
              {t('admin.themes.save')}
            </Button>
            <Button variant="outline" disabled={!dirty || save.isPending} onClick={reset}>
              {t('admin.themes.discard')}
            </Button>
            <Text fontSize="sm" fontWeight="semibold" color={dirty ? 'orange.fg' : 'fg.muted'} role="status">
              {dirty ? t('admin.themes.unsaved') : t('admin.themes.noChanges')}
            </Text>
          </Flex>
        </Flex>
      </motion.section>

      <Grid templateColumns={{ base: 'minmax(0, 1fr)', xl: 'minmax(0, 1.25fr) minmax(0, 1fr)' }} gap={{ base: '6', xl: '6' }} alignItems="start">
        <motion.section variants={itemVariants} style={{ minWidth: 0 }}>
          <Panel>
            <SectionTitle icon={CalendarRange} title={t('admin.themes.festivalsTitle')} compact />
            <Text fontSize="sm" color="fg.muted" fontWeight="medium" mt="-2">
              {mode === 'forced' ? t('admin.themes.festivalsHelpForced') : t('admin.themes.festivalsHelp')}
            </Text>
            <Flex as="ul" listStyleType="none" direction="column">
              <Flex as="li" align="center" gap="3" py="2.5" borderBottomWidth="1px" borderColor="border">
                <ThemeArt theme={THEMES[0]} size={44} />
                <Box flex="1" minW="0">
                  <Text fontWeight="bold" lineHeight="1.3">
                    {t('themes.default')}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                    {t('admin.themes.defaultHelp')}
                  </Text>
                </Box>
                <PreviewButton theme={THEMES[0]} dirty={dirty} />
              </Flex>
              {FESTIVALS.map((theme) => {
                const entry = nextWindow.get(theme.key);
                const skipped = disabled.includes(theme.key);
                const name = t(`themes.${theme.id}`);
                return (
                  <Flex as="li" key={theme.key} align="center" gap="3" py="2.5" borderBottomWidth="1px" borderColor="border" _last={{ borderBottomWidth: 0 }}>
                    <Box opacity={skipped ? 0.45 : 1} filter={skipped ? 'grayscale(1)' : undefined} transition="opacity 200ms, filter 200ms">
                      <ThemeArt theme={theme} size={44} />
                    </Box>
                    <Box flex="1" minW="0">
                      <Flex align="center" gap="2" wrap="wrap">
                        <Text fontWeight="bold" lineHeight="1.3" color={skipped ? 'fg.muted' : undefined} textDecoration={skipped ? 'line-through' : undefined}>
                          {name}
                        </Text>
                        {skipped && (
                          <Badge size="xs" colorPalette="gray" variant="solid">
                            {t('admin.themes.skipped')}
                          </Badge>
                        )}
                      </Flex>
                      {entry && (
                        <Text fontSize="xs" color="fg.muted" fontWeight="medium" fontVariantNumeric="tabular-nums">
                          {t('admin.themes.windowLine', { date: days.full(entry.festivalDate), range: days.range(entry.startsOn, entry.endsOn) })}
                        </Text>
                      )}
                    </Box>
                    <Box display={{ base: 'none', sm: 'block' }}>
                      <PreviewButton theme={theme} dirty={dirty} />
                    </Box>
                    <Switch.Root
                      checked={!skipped}
                      onCheckedChange={(details) => setDisabled((current) => (details.checked ? current.filter((key) => key !== theme.key) : [...current, theme.key]))}
                      aria-label={t('admin.themes.showFestival', { name })}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </Flex>
                );
              })}
            </Flex>
          </Panel>
        </motion.section>

        <motion.section variants={itemVariants} style={{ minWidth: 0 }}>
          <Panel>
            <SectionTitle icon={CalendarDays} title={t('admin.themes.upcomingTitle')} compact />
            <Text fontSize="sm" color="fg.muted" fontWeight="medium" mt="-2">
              {t('admin.themes.upcomingHelp')}
            </Text>
            <Timeline.Root size="lg" variant="subtle">
              {settings.calendar.map((entry) => {
                const theme = getTheme(entry.themeKey);
                const skipped = disabled.includes(entry.themeKey);
                const running = entry.startsOn <= settings.today && settings.today <= entry.endsOn;
                return (
                  <Timeline.Item key={`${entry.themeKey}-${entry.startsOn}`} opacity={skipped ? 0.6 : 1} transition="opacity 200ms">
                    <Timeline.Connector>
                      <Timeline.Separator borderColor="border.emphasized" />
                      <Timeline.Indicator bg="bg.panel" borderWidth="2px" borderColor={skipped ? 'border.emphasized' : 'brand.muted'} overflow="hidden" filter={skipped ? 'grayscale(1)' : undefined}>
                        <ThemeSprite theme={theme} scale={1} />
                      </Timeline.Indicator>
                    </Timeline.Connector>
                    <Timeline.Content gap="0.5" pb="4">
                      <Flex align="center" gap="2" wrap="wrap">
                        <Timeline.Title fontWeight="bold" textDecoration={skipped ? 'line-through' : undefined}>
                          {t(`themes.${theme.id}`)}
                        </Timeline.Title>
                        {skipped ? (
                          <Badge size="xs" colorPalette="gray" variant="solid">
                            {t('admin.themes.skipped')}
                          </Badge>
                        ) : (
                          <Badge size="xs" colorPalette={running ? 'green' : 'brand'} variant="subtle" fontVariantNumeric="tabular-nums">
                            {untilLabel(entry)}
                          </Badge>
                        )}
                      </Flex>
                      <Timeline.Description fontWeight="medium" color="fg.muted" fontVariantNumeric="tabular-nums">
                        {t('admin.themes.windowLine', { date: days.full(entry.festivalDate), range: days.range(entry.startsOn, entry.endsOn) })}
                      </Timeline.Description>
                    </Timeline.Content>
                  </Timeline.Item>
                );
              })}
            </Timeline.Root>
          </Panel>
        </motion.section>
      </Grid>
    </>
  );
}

/** Seasonal theme: follow the festival calendar or force one theme; skip festivals; see what is coming. */
export function ThemesPage() {
  const { t } = useTranslation();
  const settings = useThemeSettings();
  return (
    <Page title={t('admin.themes.title')} subtitle={t('admin.themes.subtitle')}>
      {settings.isPending && <LoadingBlock />}
      {settings.error && !settings.data && <ErrorBlock error={settings.error} onRetry={() => void settings.refetch()} />}
      {/* Remount after a save, so the form starts again from what the server stored. */}
      {settings.data && <SettingsForm key={`${settings.data.mode}|${settings.data.forcedThemeKey ?? ''}|${settings.data.disabledThemeKeys.join(',')}`} settings={settings.data} />}
    </Page>
  );
}
