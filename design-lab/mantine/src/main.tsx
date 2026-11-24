import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerColorProperties } from './theme/transitions';

registerColorProperties();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
