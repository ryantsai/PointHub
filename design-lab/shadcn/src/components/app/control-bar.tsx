import { AnimatePresence, motion } from 'motion/react';
import { LanguagesIcon, MoonIcon, SunIcon } from 'lucide-react';
import type { Locale } from '@shared/data';
import { seasons, seasonByKey, type SeasonKey } from '@shared/seasons';
import { locales, t } from '@shared/strings';
import type { LabState, View } from '@shared/urlState';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { writeState } from '@/lib/lab-state';
import { EASE, layoutSpring } from '@/lib/motion';

const VIEWS: { value: View; key: 'viewEmployee' | 'viewAdmin' }[] = [
  { value: 'employee', key: 'viewEmployee' },
  { value: 'admin', key: 'viewAdmin' },
];

export function ControlBar({ state }: { state: LabState }) {
  const { view, locale, season, scheme } = state;
  const current = seasonByKey(season);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-(--bar-h) max-w-[90rem] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 md:flex-nowrap md:py-0">
        {/* wordmark */}
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid size-6 place-items-center rounded-[5px] bg-foreground text-background">
            <span className="size-2 rounded-full bg-primary" />
          </span>
          <span className="text-[0.9375rem] font-semibold tracking-tight">{t(locale, 'appName')}</span>
        </div>

        {/* Employee / Admin: the pill is one element that slides between the two options. */}
        <ToggleGroup
          value={[view]}
          onValueChange={(next) => {
            const value = next[0] as View | undefined;
            if (value) writeState({ view: value });
          }}
          spacing={0}
          aria-label={`${t(locale, 'viewEmployee')} / ${t(locale, 'viewAdmin')}`}
          className="ml-auto rounded-lg border border-border bg-muted/60 p-0.5 md:ml-4"
        >
          {VIEWS.map((option) => {
            const active = option.value === view;
            return (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                size="sm"
                className="relative h-7 rounded-[5px]! px-3 text-muted-foreground hover:bg-transparent aria-pressed:bg-transparent aria-pressed:text-background"
              >
                {active && (
                  <motion.span
                    layoutId="view-pill"
                    transition={layoutSpring}
                    className="absolute inset-0 rounded-[5px] bg-foreground"
                  />
                )}
                <span className="relative">{t(locale, option.key)}</span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto">
          <Select value={locale} onValueChange={(value) => value && writeState({ locale: value as Locale })}>
            <SelectTrigger size="sm" aria-label={t(locale, 'language')} className="min-w-0 flex-1 bg-card md:w-36 md:flex-none">
              <LanguagesIcon className="text-muted-foreground" />
              <SelectValue>{(value: Locale) => locales.find((l) => l.code === value)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false}>
              <SelectGroup>
                {locales.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={season} onValueChange={(value) => value && writeState({ season: value as SeasonKey })}>
            <SelectTrigger size="sm" aria-label={t(locale, 'theme')} className="min-w-0 flex-1 bg-card md:w-44 md:flex-none">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
              <SelectValue>
                {() => (
                  <span className="truncate">
                    {current.emoji} {t(locale, current.nameKey)}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false}>
              <SelectGroup>
                {seasons.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    <span aria-hidden>{s.emoji}</span>
                    {t(locale, s.nameKey)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={t(locale, 'colorScheme')}
                  aria-pressed={scheme === 'dark'}
                  onClick={() => writeState({ scheme: scheme === 'dark' ? 'light' : 'dark' })}
                  className="shrink-0 overflow-hidden bg-card"
                />
              }
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={scheme}
                  initial={{ y: 14, opacity: 0, rotate: -40 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: -14, opacity: 0, rotate: 40 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="grid place-items-center"
                >
                  {scheme === 'dark' ? <MoonIcon /> : <SunIcon />}
                </motion.span>
              </AnimatePresence>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t(locale, 'colorScheme')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
