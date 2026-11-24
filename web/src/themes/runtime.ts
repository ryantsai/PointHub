// Runtime side of the theme system: makes theme and scheme changes a colour tween instead of a flash, and
// tells CSS when the tab is hidden so decorative animations can pause.
import { system } from './system';

const root = document.documentElement;

// The colour roles are CSS variables on <html>. Registering them as <color> lets the browser interpolate
// them, so one `transition` on the root tweens every button, ring and gradient that reads them.
const animatedRoles = [
  ...['solid', 'fg', 'subtle', 'muted', 'emphasized', 'focusRing', 'border', 'depth', '300', '400', '500'].flatMap((r) => [
    `colors.brand.${r}`,
    `colors.accent.${r}`,
  ]),
  'colors.accent.contrast',
  ...['from', 'via', 'to'].map((r) => `colors.hero.${r}`),
  ...['bg', 'bg.subtle', 'bg.muted', 'bg.emphasized', 'bg.panel', 'fg', 'fg.muted', 'border', 'border.muted', 'border.emphasized'].map(
    (r) => `colors.${r}`,
  ),
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
  if (document.querySelector('style[data-ph="theme-transition"]')) return;
  const style = document.createElement('style');
  style.dataset.ph = 'theme-transition';
  // Scoped to [data-ready] so the very first paint does not fade in from the registered initial value.
  style.textContent = `html[data-ready]{transition:${names.map((name) => `${name} 520ms cubic-bezier(0.4,0,0.2,1)`).join(',')}}
@media (prefers-reduced-motion: reduce){html[data-ready]{transition-duration:120ms}}`;
  document.head.appendChild(style);
  requestAnimationFrame(() => requestAnimationFrame(() => root.setAttribute('data-ready', '')));
}

export function watchTabVisibility(): void {
  const sync = () => {
    root.dataset.tab = document.hidden ? 'hidden' : 'visible';
  };
  sync();
  document.addEventListener('visibilitychange', sync);
}
