// App chrome: top bar with the control bar, a navigation rail from tablet width up and a bottom
// navigation bar on phones. Both navigations share one definition per view.
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Drawer from '@mui/material/Drawer';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import CardGiftcardRounded from '@mui/icons-material/CardGiftcardRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import EventRounded from '@mui/icons-material/EventRounded';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import KeyRounded from '@mui/icons-material/KeyRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import StarsRounded from '@mui/icons-material/StarsRounded';
import { motion } from 'motion/react';
import { t } from '@shared/strings';
import type { StringKey } from '@shared/strings';
import type { LabState, View } from '@shared/urlState';
import { spring } from '../motion';
import { easing } from '../theme/theme';
import { ControlBar } from './ControlBar';
import { Lobed } from './Shapes';

export const RAIL_WIDTH = 96;
export const BOTTOM_NAV_HEIGHT = 80;

type NavItem = { id: string; labelKey: StringKey; icon: ReactNode; inert?: boolean };

/** `id` doubles as the id of the section the item scrolls to. */
export const navItems: Record<View, NavItem[]> = {
  employee: [
    { id: 'home', labelKey: 'balance', icon: <StarsRounded /> },
    { id: 'events', labelKey: 'events', icon: <EventRounded /> },
    { id: 'gifts', labelKey: 'gifts', icon: <CardGiftcardRounded /> },
    { id: 'activity', labelKey: 'recentActivity', icon: <HistoryRounded /> },
  ],
  admin: [
    { id: 'dashboard', labelKey: 'dashboard', icon: <DashboardRounded /> },
    { id: 'approvals', labelKey: 'approvals', icon: <FactCheckRounded /> },
    { id: 'ledger', labelKey: 'ledger', icon: <ReceiptLongRounded /> },
    { id: 'stock', labelKey: 'giftsAdmin', icon: <Inventory2Rounded /> },
    { id: 'employees', labelKey: 'employees', icon: <GroupsRounded />, inert: true },
    { id: 'apiKeys', labelKey: 'apiKeys', icon: <KeyRounded />, inert: true },
  ],
};

/** The section last asked for through the navigation; breaks ties in the scroll spy. */
let requested: string | null = null;

/** Which section is currently under the top bar (falls back to the first). */
function useScrollSpy(ids: string[]): string {
  const key = ids.join(',');
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const list = key.split(',');
    let frame = 0;
    const measure = () => {
      frame = 0;
      const tops = list.flatMap((id) => {
        const node = document.getElementById(id);
        return node ? [{ id, top: node.getBoundingClientRect().top }] : [];
      });
      // At the very bottom the last sections cannot reach the top bar: take the lowest visible one.
      const atBottom = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const reached = tops.filter((s) => s.top <= (atBottom ? window.innerHeight - 120 : 140));
      let current = list[0];
      if (reached.length) {
        const lowest = Math.max(...reached.map((s) => s.top));
        // Sections that sit side by side share a top: prefer the one the user asked for.
        const tied = reached.filter((s) => lowest - s.top <= 8);
        current = (tied.find((s) => s.id === requested) ?? tied[0]).id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [key]);
  return ids.includes(active) ? active : ids[0];
}

function goTo(id: string) {
  requested = id;
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
}

/** Icon on the Material 3 active-indicator pill; the pill slides between items. */
function NavIcon({ icon, selected, layoutId }: { icon: ReactNode; selected: boolean; layoutId: string }) {
  return (
    <Box className="ph-nav-icon" sx={{ position: 'relative', width: 60, height: 32, display: 'grid', placeItems: 'center', borderRadius: '999px' }}>
      {selected && (
        <Box component={motion.span} layoutId={layoutId} transition={spring.spatial} sx={{ position: 'absolute', inset: 0, borderRadius: '999px', bgcolor: 'tonal.secondaryContainer' }} />
      )}
      <Box component="span" sx={{ position: 'relative', display: 'grid', color: selected ? 'tonal.onSecondaryContainer' : 'inherit' }}>
        {icon}
      </Box>
    </Box>
  );
}

function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <Lobed lobes={8} depth={0.07} size={size} sx={{ position: 'absolute', color: 'primary.main', transition: `transform 600ms ${easing.emphasized}`, '*:hover > &': { transform: 'rotate(45deg)' } }} />
      <StarsRounded sx={{ position: 'relative', color: 'primary.contrastText', fontSize: size * 0.5 }} />
    </Box>
  );
}

function NavRail({ state, active }: { state: LabState; active: string }) {
  const { view, locale } = state;
  return (
    <Drawer
      variant="permanent"
      slotProps={{ paper: { component: 'nav', 'aria-label': t(locale, 'appName') } as object }}
      sx={{
        width: RAIL_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: RAIL_WIDTH, border: 0, bgcolor: 'background.default', alignItems: 'center', py: 1.5, gap: 0.5, overflowX: 'hidden' },
      }}
    >
      <Box sx={{ height: 56, display: 'grid', placeItems: 'center', mb: 1.5 }}>
        <BrandMark />
      </Box>
      {navItems[view].map((item) => {
        const selected = item.id === active;
        return (
          <ButtonBase
            key={item.id}
            disabled={item.inert}
            aria-current={selected ? 'page' : undefined}
            onClick={() => goTo(item.id)}
            sx={{
              width: RAIL_WIDTH - 8,
              py: 0.75,
              flexDirection: 'column',
              gap: 0.5,
              borderRadius: '16px',
              color: selected ? 'text.primary' : 'text.secondary',
              '&.Mui-disabled': { opacity: 0.55 },
              '&:hover .ph-nav-icon': { bgcolor: 'action.hover' },
              '& .MuiSvgIcon-root': { transition: `transform 300ms ${easing.emphasized}` },
              '&:hover .MuiSvgIcon-root': { transform: 'scale(1.12)' },
              '&:active .MuiSvgIcon-root': { transform: 'scale(0.92)' },
            }}
          >
            <NavIcon icon={item.icon} selected={selected} layoutId="rail-pill" />
            <Typography component="span" sx={{ fontSize: '0.6875rem', lineHeight: 1.3, fontWeight: selected ? 700 : 600, textAlign: 'center', wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
              {t(locale, item.labelKey)}
            </Typography>
          </ButtonBase>
        );
      })}
    </Drawer>
  );
}

function BottomNav({ state, active }: { state: LabState; active: string }) {
  const { view, locale } = state;
  const items = navItems[view];
  const dense = items.length > 4;
  return (
    <Paper
      component="nav"
      aria-label={t(locale, 'appName')}
      square
      sx={{ position: 'fixed', insetInline: 0, bottom: 0, zIndex: 'appBar', bgcolor: 'tonal.surfaceContainer', pb: 'env(safe-area-inset-bottom)' }}
    >
      <BottomNavigation
        showLabels={!dense}
        value={active}
        onChange={(_, id: string) => goTo(id)}
        sx={{ height: BOTTOM_NAV_HEIGHT, bgcolor: 'transparent', px: 0.5 }}
      >
        {items.map((item) => (
          <BottomNavigationAction
            key={item.id}
            value={item.id}
            disabled={item.inert}
            label={dense ? undefined : t(locale, item.labelKey)}
            aria-label={t(locale, item.labelKey)}
            aria-current={item.id === active ? 'page' : undefined}
            icon={<NavIcon icon={item.icon} selected={item.id === active} layoutId="bottom-pill" />}
            sx={{
              minWidth: 0,
              px: 0,
              gap: 0.5,
              color: 'text.secondary',
              '&.Mui-selected': { color: 'text.primary' },
              '&.Mui-disabled': { opacity: 0.5 },
              '& .ph-nav-icon': dense ? { width: 48 } : {},
              '& .MuiBottomNavigationAction-label, & .MuiBottomNavigationAction-label.Mui-selected': { fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.2 },
              '&.Mui-selected .MuiBottomNavigationAction-label': { fontWeight: 700 },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

export function Shell({ state, desktop, compact, children }: { state: LabState; desktop: boolean; compact: boolean; children: ReactNode }) {
  const { view, locale } = state;
  const active = useScrollSpy(navItems[view].filter((item) => !item.inert).map((item) => item.id));
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 8 });

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      {desktop && <NavRail state={state} active={active} />}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            bgcolor: scrolled ? 'tonal.surfaceContainer' : 'background.default',
            color: 'text.primary',
            transition: `background-color 300ms ${easing.emphasized}`,
          }}
        >
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, sm: 72 }, px: { xs: 1.5, sm: 3, lg: 4 }, gap: 1, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              {!desktop && <BrandMark size={36} />}
              <Typography variant="h5" component="p" noWrap sx={{ display: { xs: 'none', md: 'block' }, letterSpacing: '-0.01em' }}>
                {t(locale, 'appName')}
              </Typography>
            </Box>
            <ControlBar state={state} compact={compact} />
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ flex: 1, minWidth: 0, pb: desktop ? 6 : `${BOTTOM_NAV_HEIGHT + 104}px` }}>
          {children}
        </Box>
      </Box>
      {!desktop && <BottomNav state={state} active={active} />}
    </Box>
  );
}
