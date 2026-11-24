import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { applyToDocument, readState } from './lib/lab-state';
import { installSeasonStyles } from './lib/season-style';

// Theme first, so the very first paint is already in the right season / scheme / language.
installSeasonStyles();
applyToDocument(readState());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Colour transitions are switched on after the first frames, so the initial theme does not animate in.
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.setAttribute('data-ready', '')));
