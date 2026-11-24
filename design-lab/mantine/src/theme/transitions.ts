// Season / scheme changes swap CSS variables. Plain custom properties cannot interpolate, so the
// colour variables (Mantine's generated palette ones and the Matsuri tokens) are registered as
// typed `<color>` properties; a transition on :root then tweens every colour on the page at once.
import { MX_TOKENS } from './seasonTheme';

const SHADES = Array.from({ length: 10 }, (_, i) => String(i));
const VARIANTS = ['filled', 'filled-hover', 'light', 'light-hover', 'light-color', 'outline', 'outline-hover', 'text'];

const names: string[] = [...MX_TOKENS, ...['brand', 'accent'].flatMap((c) => [...SHADES, ...VARIANTS].map((s) => `--mantine-color-${c}-${s}`))];

let registered = false;

export function registerColorProperties(): void {
  if (registered || typeof CSS === 'undefined' || !('registerProperty' in CSS)) return;
  registered = true;
  for (const name of names) {
    try {
      CSS.registerProperty({ name, syntax: '<color>', inherits: true, initialValue: 'transparent' });
    } catch {
      // already registered (hot reload) – nothing to do
    }
  }
}

/** Turns the :root colour transition on. Called after first paint so the page does not fade in from transparent. */
export function enableColorTransitions(): () => void {
  if (!registered) return () => {};
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const apply = () => {
    root.style.transition = query.matches ? '' : names.map((n) => `${n} 650ms cubic-bezier(0.4, 0, 0.2, 1)`).join(', ');
  };
  apply();
  query.addEventListener('change', apply);
  return () => {
    query.removeEventListener('change', apply);
    root.style.transition = '';
  };
}
