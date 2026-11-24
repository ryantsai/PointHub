import './i18n';
import './themes/colorMode'; // puts the colour scheme on <html> before the first paint

import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { queryClient } from './api/queryClient';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LocaleSync } from './components/LocaleSync';
import { ConfirmHost } from './components/ui/ConfirmHost';
import { Toaster } from './components/ui/Toaster';
import { AppThemeProvider } from './themes/AppThemeProvider';
import { enableSmoothThemeChanges, watchTabVisibility } from './themes/runtime';

enableSmoothThemeChanges();
watchTabVisibility();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        {/* reducedMotion="user": people who ask the OS for less motion get fades instead of movement. */}
        <MotionConfig reducedMotion="user">
          <ErrorBoundary>
            <BrowserRouter>
              <LocaleSync>
                <App />
              </LocaleSync>
            </BrowserRouter>
            <ConfirmHost />
            <Toaster />
          </ErrorBoundary>
        </MotionConfig>
      </AppThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
