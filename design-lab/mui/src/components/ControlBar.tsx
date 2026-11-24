// The control bar every design shares: view switch, language, season, light / dark.
// All four write to the URL hash; nothing here keeps its own state.
import { useId, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded';
import BadgeRounded from '@mui/icons-material/BadgeRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import LightModeRounded from '@mui/icons-material/LightModeRounded';
import TranslateRounded from '@mui/icons-material/TranslateRounded';
import { AnimatePresence, motion } from 'motion/react';
import { locales, t } from '@shared/strings';
import { seasonByKey, seasons } from '@shared/seasons';
import type { LabState, View } from '@shared/urlState';
import { ease, spring } from '../motion';
import { setLabState } from '../state/useLabState';

const langTag = { en: 'en', ja: 'ja', 'zh-Hant': 'zh-Hant' } as const;

function PillMenu({ label, icon, current, children, compact }: { label: string; icon: ReactNode; current: string; compact: boolean; children: (close: () => void) => ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const id = useId();
  const open = Boolean(anchor);
  const close = () => setAnchor(null);
  const common = {
    'aria-label': `${label}: ${current}`,
    'aria-haspopup': 'menu' as const,
    'aria-controls': open ? id : undefined,
    'aria-expanded': open ? ('true' as const) : undefined,
    onClick: (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget),
  };
  return (
    <>
      <Tooltip title={label}>
        {compact ? (
          <IconButton {...common} sx={{ width: 40, height: 40, fontSize: '1.25rem' }}>
            {icon}
          </IconButton>
        ) : (
          <Button {...common} variant="tonal" startIcon={icon} sx={{ paddingInline: 2, '& .MuiButton-startIcon': { fontSize: '1.125rem' } }}>
            {current}
          </Button>
        )}
      </Tooltip>
      <Menu id={id} anchorEl={anchor} open={open} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {children(close)}
      </Menu>
    </>
  );
}

export function ControlBar({ state, compact }: { state: LabState; compact: boolean }) {
  const { view, locale, season, scheme } = state;
  const currentSeason = seasonByKey(season);
  const dark = scheme === 'dark';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, minWidth: 0 }}>
      <ToggleButtonGroup
        exclusive
        value={view}
        aria-label={`${t(locale, 'viewEmployee')} / ${t(locale, 'viewAdmin')}`}
        onChange={(_, next: View | null) => next && setLabState({ view: next })}
      >
        {(
          [
            ['employee', 'viewEmployee', <BadgeRounded key="i" fontSize="small" />],
            ['admin', 'viewAdmin', <AdminPanelSettingsRounded key="i" fontSize="small" />],
          ] as const
        ).map(([value, key, icon]) => (
          <ToggleButton key={value} value={value}>
            {view === value && (
              <Box
                component={motion.span}
                layoutId="view-pill"
                transition={spring.spatial}
                sx={{ position: 'absolute', inset: 0, borderRadius: '999px', bgcolor: 'primary.main' }}
              />
            )}
            <Box component="span" sx={{ position: 'relative', display: compact ? 'none' : 'inline-flex' }}>
              {icon}
            </Box>
            <Box component="span" sx={{ position: 'relative' }}>
              {t(locale, key)}
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <PillMenu label={t(locale, 'language')} icon={<TranslateRounded fontSize="inherit" />} current={locales.find((l) => l.code === locale)?.label ?? ''} compact={compact}>
        {(close) =>
          locales.map((l) => (
            <MenuItem
              key={l.code}
              lang={langTag[l.code]}
              selected={l.code === locale}
              onClick={() => {
                setLabState({ locale: l.code });
                close();
              }}
            >
              <Box component="span" sx={{ flex: 1 }}>
                {l.label}
              </Box>
              {l.code === locale && <CheckRounded fontSize="small" />}
            </MenuItem>
          ))
        }
      </PillMenu>

      <PillMenu label={t(locale, 'theme')} icon={<span aria-hidden>{currentSeason.emoji}</span>} current={t(locale, currentSeason.nameKey)} compact={compact}>
        {(close) =>
          seasons.map((s) => (
            <MenuItem
              key={s.key}
              selected={s.key === season}
              onClick={(event) => {
                setLabState({ season: s.key }, event);
                close();
              }}
            >
              <span aria-hidden>{s.emoji}</span>
              <Box component="span" sx={{ flex: 1 }}>
                {t(locale, s.nameKey)}
              </Box>
              <Box aria-hidden sx={{ display: 'flex' }}>
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: s.primary }} />
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: s.accent, ml: -0.75, border: '2px solid', borderColor: 'tonal.surfaceContainer' }} />
              </Box>
            </MenuItem>
          ))
        }
      </PillMenu>

      <Tooltip title={t(locale, 'colorScheme')}>
        <IconButton
          aria-label={t(locale, 'colorScheme')}
          aria-pressed={dark}
          onClick={(event) => setLabState({ scheme: dark ? 'light' : 'dark' }, event)}
          sx={{ width: 40, height: 40, bgcolor: 'tonal.surfaceContainerHigh', overflow: 'hidden' }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={scheme}
              style={{ display: 'grid' }}
              initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.35, ease: ease.emphasized }}
            >
              {dark ? <DarkModeRounded fontSize="small" /> : <LightModeRounded fontSize="small" />}
            </motion.span>
          </AnimatePresence>
        </IconButton>
      </Tooltip>
    </Box>
  );
}
