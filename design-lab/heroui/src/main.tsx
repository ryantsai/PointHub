import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { readState } from '@shared/urlState';
import App from './App';
import { applyTheme } from './lib/theme';
import './styles.css';

// Set scheme / season on <html> before the first paint so nothing tweens in from the defaults.
applyTheme(readState());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
