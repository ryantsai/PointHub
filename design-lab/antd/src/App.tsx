import { Suspense, lazy, useEffect, useLayoutEffect, useMemo } from 'react';
import { ConfigProvider, Layout } from 'antd';
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';
import zhTW from 'antd/locale/zh_TW';
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react';
import type { Locale } from '@shared/data';
import { seasonByKey } from '@shared/seasons';
import { Brand } from './components/Brand';
import { Preferences, ViewSwitch } from './components/ControlBar';
import { LabProvider } from './lab';
import { useLabData } from './store';
import { buildPalette, buildTheme, cssVars } from './theme';
import { useLabState } from './useLabState';
import { EmployeeView } from './views/EmployeeView';

// The admin console (Table, Menu, Popconfirm…) is the heavy half of antd; employees on phones never
// need it, so it loads as its own chunk and is warmed up in the background once the page is idle.
const loadAdmin = () => import('./views/AdminView');
const AdminView = lazy(() => loadAdmin().then((module) => ({ default: module.AdminView })));

const ANTD_LOCALE = { en: enUS, ja: jaJP, 'zh-Hant': zhTW } as const;
const HTML_LANG: Record<Locale, string> = { en: 'en', ja: 'ja', 'zh-Hant': 'zh-Hant-TW' };

export default function App() {
  const state = useLabState();
  const reduce = useReducedMotion() ?? false;
  const season = seasonByKey(state.season);
  const [data, dispatch] = useLabData();

  const palette = useMemo(() => buildPalette(season, state.scheme), [season, state.scheme]);
  const theme = useMemo(() => buildTheme(palette, state.locale, reduce), [palette, state.locale, reduce]);

  useEffect(() => {
    const id = window.setTimeout(() => void loadAdmin(), 1500);
    return () => window.clearTimeout(id);
  }, []);

  // Our own custom properties live on <html> so antd's portalled popups (select menus, popconfirm) see them too.
  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(cssVars(palette, state.locale))) root.style.setProperty(name, String(value));
    root.style.colorScheme = state.scheme;
    root.dataset.scheme = state.scheme;
    root.dataset.season = state.season;
    root.lang = HTML_LANG[state.locale];
  }, [palette, state.locale, state.scheme, state.season]);

  return (
    <ConfigProvider theme={theme} locale={ANTD_LOCALE[state.locale]}>
      <MotionConfig reducedMotion="user">
        <LabProvider locale={state.locale} season={season} palette={palette}>
          <Layout className="ph-root">
            <Layout.Header className="ph-header">
              <Brand />
              <div className="ph-header-view">
                <ViewSwitch view={state.view} />
              </div>
              <Preferences state={state} />
            </Layout.Header>
            <AnimatePresence mode="wait">
              {state.view === 'admin' ? (
                <Suspense key="admin" fallback={null}>
                  <AdminView data={data} dispatch={dispatch} />
                </Suspense>
              ) : (
                <EmployeeView key="employee" data={data} dispatch={dispatch} />
              )}
            </AnimatePresence>
          </Layout>
        </LabProvider>
      </MotionConfig>
    </ConfigProvider>
  );
}
