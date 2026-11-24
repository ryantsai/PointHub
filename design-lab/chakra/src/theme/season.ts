// Runtime side of the theme: reflects the URL state onto <html> so Chakra's conditions pick it up
// (`.dark` for colour mode, `data-season` for the seasonal semantic tokens, `lang` for the CJK font order),
// and makes season / scheme changes a smooth colour transition instead of a flash.
import type { LabState } from '@shared/urlState';
import { system } from './system';

const root = document.documentElement;

export function applyLabState(state: LabState): void {
  root.classList.toggle('dark', state.scheme === 'dark');
  root.classList.toggle('light', state.scheme === 'light');
  root.style.colorScheme = state.scheme;
  root.dataset.season = state.season;
  root.lang = state.locale;
}

// The colour roles are CSS variables on <html>. Registering them as <color> lets the browser interpolate
// them, so one `transition` on the root tweens every button, ring, chart and gradient that reads them.
const animatedRoles = [
  ...['solid', 'fg', 'subtle', 'muted', 'emphasized', 'focusRing', 'border', 'depth'].flatMap((r) => [`colors.brand.${r}`, `colors.accent.${r}`]),
  'colors.accent.contrast',
  ...['from', 'via', 'to'].map((r) => `colors.hero.${r}`),
  ...['bg', 'bg.subtle', 'bg.muted', 'bg.emphasized', 'bg.panel', 'fg', 'fg.muted', 'border', 'border.muted', 'border.emphasized'].map((r) => `colors.${r}`),
];

const varName = (path: string) => /var\((--[^),]+)/.exec(system.token.var(path))?.[1];

export function enableSmoothThemeChanges(): void {
  const names = animatedRoles.map(varName).filter((name): name is string => Boolean(name));
  if (typeof CSS === 'undefined' || !('registerProperty' in CSS)) return;
  for (const name of names) {
    try {
      CSS.registerProperty({ name, syntax: '<color>', inherits: true, initialValue: 'transparent' });
    } catch {
      /* already registered (hot reload) */
    }
  }
  const style = document.createElement('style');
  style.dataset.ph = 'theme-transition';
  // Scoped to [data-ready] so the very first paint does not fade in from the registered initial value.
  style.textContent = `html[data-ready]{transition:${names.map((name) => `${name} 520ms cubic-bezier(0.4,0,0.2,1)`).join(',')}}
@media (prefers-reduced-motion: reduce){html[data-ready]{transition-duration:120ms}}`;
  document.head.appendChild(style);
  requestAnimationFrame(() => requestAnimationFrame(() => root.setAttribute('data-ready', '')));
}

/** Ambient particles are CSS animations; pause them while the tab is hidden. */
export function watchTabVisibility(): void {
  const sync = () => {
    root.dataset.tab = document.hidden ? 'hidden' : 'visible';
  };
  sync();
  document.addEventListener('visibilitychange', sync);
}
