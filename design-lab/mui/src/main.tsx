import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { readState } from '@shared/urlState';
import { App } from './App';

// Set the page language before first paint so the right CJK font stack is used from frame one.
document.documentElement.lang = readState().locale;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
