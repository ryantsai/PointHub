import { Suspense, lazy, useEffect, useLayoutEffect } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ControlBar } from '@/components/app/control-bar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { applyToDocument, useLabState } from '@/lib/lab-state';
import { StoreProvider } from '@/lib/store';
import { EmployeeView } from '@/views/employee';

// The admin dashboard carries the chart library, so it is a separate chunk: employees on a phone
// never download Recharts. It is warmed up shortly after load so the view switch stays instant.
const loadAdmin = () => import('@/views/admin');
const AdminView = lazy(() => loadAdmin().then((module) => ({ default: module.AdminView })));

export function App() {
  const state = useLabState();

  // <html> carries .dark, data-season and lang, so portalled popups (select, tooltip) follow too.
  useLayoutEffect(() => applyToDocument(state), [state]);

  useEffect(() => {
    const id = window.setTimeout(() => void loadAdmin(), 1500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    // reducedMotion="user": with prefers-reduced-motion, transforms and layout animations are
    // dropped and only opacity fades remain.
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={350}>
        <StoreProvider>
          <div className="flex min-h-dvh flex-col">
            <ControlBar state={state} />
            {/* Old view fades out quickly; the new one runs its own staggered entrance. */}
            <AnimatePresence mode="wait">
              <motion.main
                key={state.view}
                exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }}
                className="flex-1"
              >
                <Suspense fallback={null}>
                  {state.view === 'admin' ? (
                    <AdminView locale={state.locale} />
                  ) : (
                    <EmployeeView locale={state.locale} season={state.season} />
                  )}
                </Suspense>
              </motion.main>
            </AnimatePresence>
          </div>
        </StoreProvider>
      </TooltipProvider>
    </MotionConfig>
  );
}
