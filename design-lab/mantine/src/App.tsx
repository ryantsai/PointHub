import { useEffect, useMemo } from 'react';
import { MantineProvider } from '@mantine/core';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { seasonByKey } from '@shared/seasons';
import { ControlBar } from './components/ControlBar';
import { Particles } from './components/Particles';
import { intlLocale } from './lib/format';
import { useAdminStore, useEmployeeStore } from './state/stores';
import { useLabState } from './state/useLabState';
import { urlColorSchemeManager } from './theme/colorSchemeManager';
import { buildResolver, buildTheme } from './theme/seasonTheme';
import { enableColorTransitions } from './theme/transitions';
import { AdminView } from './views/admin/AdminView';
import { EmployeeView } from './views/employee/EmployeeView';

const colorSchemeManager = urlColorSchemeManager();

export function App() {
  const state = useLabState();
  const season = seasonByKey(state.season);

  // The season becomes a Mantine theme (palette + primaryColor) and a set of CSS variables;
  // MantineProvider swaps both at runtime when the URL changes.
  const theme = useMemo(() => buildTheme(season, state.locale), [season, state.locale]);
  const resolver = useMemo(() => buildResolver(season), [season]);

  const employee = useEmployeeStore();
  const admin = useAdminStore();

  useEffect(() => {
    document.documentElement.lang = intlLocale(state.locale);
  }, [state.locale]);

  // Colour tweening is switched on after the first frames so the initial paint is immediate.
  useEffect(() => {
    let stop = () => {};
    const id = window.setTimeout(() => {
      stop = enableColorTransitions();
    }, 300);
    return () => {
      window.clearTimeout(id);
      stop();
    };
  }, []);

  return (
    <MantineProvider theme={theme} cssVariablesResolver={resolver} colorSchemeManager={colorSchemeManager} defaultColorScheme="light">
      <MotionConfig reducedMotion="user">
        <div className="mx-wash" aria-hidden="true" />
        <Particles kind={season.particles} placement="page" />
        <ControlBar state={state} />
        <AnimatePresence mode="wait" initial>
          {state.view === 'admin' ? (
            <AdminView key="admin" locale={state.locale} season={season} store={admin} gifts={employee.gifts} />
          ) : (
            <EmployeeView key="employee" locale={state.locale} season={season} store={employee} />
          )}
        </AnimatePresence>
      </MotionConfig>
    </MantineProvider>
  );
}
