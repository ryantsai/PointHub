import { ChakraProvider } from '@chakra-ui/react';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { readState } from '@shared/urlState';
import { App } from './App';
import { applyLabState, enableSmoothThemeChanges, watchTabVisibility } from './theme/season';
import { system } from './theme/system';

// Set scheme / season / lang before the first paint so nothing flashes.
applyLabState(readState());
enableSmoothThemeChanges();
watchTabVisibility();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider value={system}>
      {/* "user" keeps opacity fades but drops transform / layout motion for prefers-reduced-motion */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </ChakraProvider>
  </StrictMode>,
);
