import { ActionIcon, Button, Menu, SegmentedControl, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconCheck, IconLanguage, IconMoonStars, IconSunHigh } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Locale } from '@shared/data';
import { type SeasonKey, seasons } from '@shared/seasons';
import { locales, t } from '@shared/strings';
import { type LabState, type View, writeState } from '@shared/urlState';
import classes from './ControlBar.module.css';

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" className={classes.mark}>
      <rect width="34" height="34" rx="11" fill="url(#mx-mark)" />
      <rect x="13" y="6.500" width="8" height="2.600" rx="1.300" fill="#fff" />
      <rect x="13" y="24.900" width="8" height="2.600" rx="1.300" fill="#fff" />
      <path d="M17 9.800c5.200 0 8.200 3.300 8.200 7.200s-3 7.200-8.200 7.200-8.200-3.300-8.200-7.200 3-7.200 8.200-7.200Z" fill="#fff" />
      <path
        d="M17 10.500v13M12.600 11.800c-1.300 3.200-1.300 7.200 0 10.400M21.400 11.800c1.300 3.200 1.300 7.200 0 10.400"
        stroke="var(--mx-g2)"
        strokeWidth="1.300"
        strokeLinecap="round"
        fill="none"
      />
      <defs>
        <linearGradient id="mx-mark" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--mx-g1)" />
          <stop offset="1" stopColor="var(--mx-g2)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ControlBar({ state }: { state: LabState }) {
  const { locale } = state;
  const { setColorScheme } = useMantineColorScheme();
  const dark = state.scheme === 'dark';
  const currentLocale = locales.find((l) => l.code === locale) ?? locales[0];

  return (
    <header className={classes.bar}>
      <div className={classes.inner}>
        <div className={classes.brand}>
          <LogoMark />
          <span className={classes.name}>{t(locale, 'appName')}</span>
        </div>

        <SegmentedControl
          className={classes.view}
          aria-label={`${t(locale, 'viewEmployee')} / ${t(locale, 'viewAdmin')}`}
          size="sm"
          value={state.view}
          onChange={(value) => writeState({ view: value as View })}
          data={[
            { value: 'employee', label: t(locale, 'viewEmployee') },
            { value: 'admin', label: t(locale, 'viewAdmin') },
          ]}
        />

        <div className={classes.language}>
          <SegmentedControl
            visibleFrom="md"
            aria-label={t(locale, 'language')}
            size="sm"
            value={locale}
            onChange={(value) => writeState({ locale: value as Locale })}
            data={locales.map((l) => ({ value: l.code, label: <span lang={l.code}>{l.label}</span> }))}
          />
          <Menu position="bottom-start" radius="lg" shadow="lg" withinPortal>
            <Menu.Target>
              <Button
                hiddenFrom="md"
                variant="default"
                size="sm"
                px="sm"
                leftSection={<IconLanguage size={17} stroke={1.8} />}
                aria-label={`${t(locale, 'language')}: ${currentLocale.label}`}
              >
                {currentLocale.label}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{t(locale, 'language')}</Menu.Label>
              {locales.map((l) => (
                <Menu.Item
                  key={l.code}
                  lang={l.code}
                  onClick={() => writeState({ locale: l.code })}
                  rightSection={l.code === locale ? <IconCheck size={16} /> : null}
                  aria-current={l.code === locale ? 'true' : undefined}
                >
                  {l.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </div>

        <SegmentedControl
          className={classes.season}
          aria-label={t(locale, 'theme')}
          size="sm"
          value={state.season}
          onChange={(value) => writeState({ season: value as SeasonKey })}
          data={seasons.map((s) => ({
            value: s.key,
            label: (
              <Tooltip label={t(locale, s.nameKey)} position="bottom">
                <span className={classes.seasonOption}>
                  <span className={classes.seasonEmoji} aria-hidden="true">
                    {s.emoji}
                  </span>
                  <span className={classes.seasonName}>{t(locale, s.nameKey)}</span>
                </span>
              </Tooltip>
            ),
          }))}
        />

        <Tooltip label={t(locale, 'colorScheme')} position="bottom-end">
          <ActionIcon
            className={classes.scheme}
            variant="default"
            size={36}
            aria-label={t(locale, 'colorScheme')}
            aria-pressed={dark}
            onClick={() => setColorScheme(dark ? 'light' : 'dark')}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={dark ? 'moon' : 'sun'}
                className={classes.schemeIcon}
                initial={{ rotate: -70, scale: 0.4, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 70, scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {dark ? <IconMoonStars size={18} stroke={1.8} /> : <IconSunHigh size={18} stroke={1.8} />}
              </motion.span>
            </AnimatePresence>
          </ActionIcon>
        </Tooltip>
      </div>
    </header>
  );
}
