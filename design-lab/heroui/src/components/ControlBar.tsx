import { ListBox, Select, Switch, Tabs, ToggleButton, ToggleButtonGroup, Tooltip } from '@heroui/react';
import { Languages, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import type { Locale } from '@shared/data';
import type { SeasonKey } from '@shared/seasons';
import { seasons } from '@shared/seasons';
import { locales, t } from '@shared/strings';
import type { LabState } from '@shared/urlState';
import { writeState } from '@shared/urlState';
import { Emoji } from './ui';

/**
 * The four lab controls. They only ever write to the URL hash; the app re-renders from `hashchange`,
 * so the gallery can drive the same state from outside. Rendered inside <Tabs>, which owns the view.
 */
export function ControlBar({ state }: { state: LabState }) {
  const { locale, season, scheme } = state;

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="glass-bar mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2.5 rounded-[26px] px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2.5 pe-1">
          <span aria-hidden className="logo-orb size-7 shrink-0 rounded-full" />
          <span className="text-[15px] font-semibold tracking-tight">{t(locale, 'appName')}</span>
        </div>

        {/* keyed by locale: the container measures overflow once, and label widths change with the language */}
        <Tabs.ListContainer key={locale} className="control-tabs ms-auto md:ms-2">
          <Tabs.List aria-label={t(locale, 'appName')}>
            <Tabs.Tab id="employee" className="gap-1.5 px-3 whitespace-nowrap sm:px-4">
              <UserRound aria-hidden className="size-4 shrink-0" />
              {t(locale, 'viewEmployee')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="admin" className="gap-1.5 px-3 whitespace-nowrap sm:px-4">
              <ShieldCheck aria-hidden className="size-4 shrink-0" />
              {t(locale, 'viewAdmin')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <div className="flex w-full items-center gap-1.5 sm:gap-2 md:ms-auto md:w-auto md:gap-3">
          <Select
            aria-label={t(locale, 'language')}
            className="min-w-0 flex-1 md:w-40 md:flex-none"
            value={locale}
            variant="secondary"
            onChange={(key) => {
              if (key != null) writeState({ locale: key as Locale });
            }}
          >
            <Select.Trigger className="w-full items-center gap-2 ps-2.5 sm:ps-3">
              <Languages aria-hidden className="hidden size-4 shrink-0 text-muted min-[400px]:block" />
              <Select.Value className="truncate" />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {locales.map((item) => (
                  <ListBox.Item key={item.code} id={item.code} textValue={item.label}>
                    {item.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <ToggleButtonGroup
            aria-label={t(locale, 'theme')}
            disallowEmptySelection
            selectedKeys={[season]}
            selectionMode="single"
            size="sm"
            onSelectionChange={(keys) => {
              const [key] = [...keys];
              if (key != null) writeState({ season: key as SeasonKey });
            }}
          >
            {seasons.map((item, index) => (
              <Tooltip key={item.key}>
                <ToggleButton isIconOnly aria-label={t(locale, item.nameKey)} id={item.key}>
                  {index > 0 && <ToggleButtonGroup.Separator />}
                  <Emoji className="text-[15px]">{item.emoji}</Emoji>
                </ToggleButton>
                <Tooltip.Content>{t(locale, item.nameKey)}</Tooltip.Content>
              </Tooltip>
            ))}
          </ToggleButtonGroup>

          <Tooltip>
            <Switch
              aria-label={t(locale, 'colorScheme')}
              isSelected={scheme === 'dark'}
              onChange={(isDark) => writeState({ scheme: isDark ? 'dark' : 'light' })}
            >
              <Switch.Control>
                <Switch.Thumb>
                  <Switch.Icon>
                    {scheme === 'dark' ? <Moon className="size-3" /> : <Sun className="size-3" />}
                  </Switch.Icon>
                </Switch.Thumb>
              </Switch.Control>
            </Switch>
            <Tooltip.Content>{t(locale, 'colorScheme')}</Tooltip.Content>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
