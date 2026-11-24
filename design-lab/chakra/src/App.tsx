import { Box } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { seasonByKey } from '@shared/seasons';
import { ControlBar } from './components/ControlBar';
import { useLabState } from './state/useLabState';
import { useStore } from './state/useStore';
import { applyLabState } from './theme/season';
import { EmployeeView } from './views/employee/EmployeeView';

// The admin dashboard carries the chart library, so it is its own chunk: employees on phones never
// download it, and it is warmed up in idle time so the view switch stays instant.
const loadAdmin = () => import('./views/admin/AdminView');
const AdminView = lazy(() => loadAdmin().then((m) => ({ default: m.AdminView })));

export function App() {
  const state = useLabState();
  // One store for both views, so a gift redeemed as an employee is missing from the admin's stock.
  const store = useStore();

  // Scheme, season and language live on <html>; Chakra's conditions and semantic tokens do the rest.
  useLayoutEffect(() => applyLabState(state), [state]);

  useEffect(() => {
    const id = window.setTimeout(loadAdmin, 1200);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Box minH="100dvh">
      <ControlBar state={state} />
      <AnimatePresence mode="wait">
        <motion.main
          key={state.view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
          transition={{ duration: 0.2 }}
        >
          {state.view === 'admin' ? (
            <Suspense fallback={null}>
              <AdminView locale={state.locale} store={store} />
            </Suspense>
          ) : (
            <EmployeeView locale={state.locale} season={seasonByKey(state.season)} store={store} />
          )}
        </motion.main>
      </AnimatePresence>
    </Box>
  );
}
