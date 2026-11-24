import { I18nProvider, Tabs, Toast } from '@heroui/react';
import { MotionConfig } from 'motion/react';
import type { View } from '@shared/urlState';
import { writeState } from '@shared/urlState';
import { Aurora } from './components/Aurora';
import { ControlBar } from './components/ControlBar';
import { useStore } from './lib/store';
import { useDocumentTheme, useLabState } from './lib/theme';
import { AdminView } from './views/AdminView';
import { EmployeeView } from './views/EmployeeView';

const ariaLocale = { en: 'en-US', ja: 'ja-JP', 'zh-Hant': 'zh-TW' } as const;

export default function App() {
  const state = useLabState();
  const store = useStore();
  useDocumentTheme(state);

  return (
    // React Aria ships ja-JP / zh-TW strings for its own labels (clear search, select, …)
    <I18nProvider locale={ariaLocale[state.locale]}>
      {/* prefers-reduced-motion: Motion drops transforms and layout animation, keeps quick fades */}
      <MotionConfig reducedMotion="user">
        <Aurora season={state.season} />
        <Tabs
          className="relative z-10 gap-0"
          selectedKey={state.view}
          onSelectionChange={(key) => writeState({ view: key as View })}
        >
          <ControlBar state={state} />
          <Tabs.Panel className="mt-0 p-0" id="employee">
            <EmployeeView locale={state.locale} store={store} />
          </Tabs.Panel>
          <Tabs.Panel className="mt-0 p-0" id="admin">
            <AdminView locale={state.locale} store={store} />
          </Tabs.Panel>
        </Tabs>
        <Toast.Provider placement="bottom" />
      </MotionConfig>
    </I18nProvider>
  );
}
