import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Fab from '@mui/material/Fab';
import { ThemeProvider, useColorScheme, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import QrCodeScannerRounded from '@mui/icons-material/QrCodeScannerRounded';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { t } from '@shared/strings';
import type { LabState, Scheme } from '@shared/urlState';
import { CheckInDialog } from './components/CheckInDialog';
import { BOTTOM_NAV_HEIGHT, Shell } from './components/Shell';
import { spring } from './motion';
import { useLabData } from './state/useLabData';
import { useLabState } from './state/useLabState';
import { themeForSeason } from './theme/theme';
import { EmployeeView } from './views/EmployeeView';

// The admin dashboard (and with it the chart library) is a separate chunk: employees on phones never
// download it, and it is warmed up in the background so the first switch is still instant.
const loadAdmin = () => import('./views/AdminView');
const AdminView = lazy(() => loadAdmin().then((module) => ({ default: module.AdminView })));

/** Mirrors the URL's scheme into MUI's colour-scheme state (which sets `data-scheme` on <html>). */
function SchemeSync({ scheme }: { scheme: Scheme }) {
  const { mode, setMode } = useColorScheme();
  useLayoutEffect(() => {
    if (mode !== scheme) setMode(scheme);
  }, [mode, scheme, setMode]);
  return null;
}

function Root({ state }: { state: LabState }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('sm'), { noSsr: true });
  const roomy = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const wide = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true });
  const data = useLabData();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const openCheckIn = useCallback(() => setCheckInOpen(true), []);
  const closeCheckIn = useCallback(() => setCheckInOpen(false), []);
  const { view, locale } = state;

  useEffect(() => {
    const timer = window.setTimeout(loadAdmin, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <Shell state={state} desktop={desktop} compact={!roomy}>
        <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
          {view === 'employee' ? (
            <EmployeeView key="employee" state={state} data={data} desktop={desktop} wide={wide} onCheckIn={openCheckIn} />
          ) : (
            <Suspense key="admin" fallback={null}>
              <AdminView state={state} data={data} wide={wide} />
            </Suspense>
          )}
        </AnimatePresence>
      </Shell>

      <AnimatePresence>
        {!desktop && view === 'employee' && (
          <motion.div
            key="fab"
            style={{ position: 'fixed', right: 16, bottom: `calc(${BOTTOM_NAV_HEIGHT + 16}px + env(safe-area-inset-bottom))`, zIndex: theme.zIndex.speedDial }}
            initial={{ scale: 0, rotate: -40, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1, transition: { ...spring.bouncy, delay: 0.5 } }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
          >
            <Fab variant="extended" color="primary" onClick={openCheckIn}>
              <QrCodeScannerRounded />
              {t(locale, 'checkIn')}
            </Fab>
          </motion.div>
        )}
      </AnimatePresence>

      <CheckInDialog open={checkInOpen} onClose={closeCheckIn} locale={locale} />
    </>
  );
}

export function App() {
  const state = useLabState();
  const initialScheme = useRef(state.scheme).current;

  useLayoutEffect(() => {
    document.documentElement.lang = state.locale;
  }, [state.locale]);

  return (
    <ThemeProvider theme={themeForSeason(state.season)} defaultMode={initialScheme} storageManager={null} noSsr>
      <CssBaseline />
      <SchemeSync scheme={state.scheme} />
      <MotionConfig reducedMotion="user">
        <Root state={state} />
      </MotionConfig>
    </ThemeProvider>
  );
}
