// WCAG check for the derived palettes of every theme. Dev aid, not part of the bundle.
// Run from web/:  node scripts/contrast.ts     (Node 24 runs TypeScript directly)
// Run it after adding a theme or touching palette.ts / the role table in system.ts.
import { THEME_COLORS } from '../src/themes/colors.ts';
import { accentScale, brandScale, contrast, heroStops, mix, neutralScale } from '../src/themes/palette.ts';

// Chakra's green/red 700 and 300, used for signed amounts (`gain` / `loss`).
const green = { 700: '#116932', 300: '#86efac' };
const red = { 700: '#991919', 300: '#fca5a5' };

let failures = 0;
const verbose = process.argv.includes('--verbose');
const check = (theme: string, label: string, fg: string, bg: string, min = 4.5) => {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failures++;
  if (!ok || verbose) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${ratio.toFixed(2).padStart(5)}  ${theme}: ${label}  (${fg} on ${bg}, needs ${min})`);
};

for (const theme of THEME_COLORS) {
  const B = brandScale(theme.primary);
  const A = accentScale(theme.accent);
  const N = neutralScale(theme.neutralTint ?? theme.primary, theme.neutralChroma ?? 1);
  const H = heroStops(theme.gradient);
  console.log(`${theme.key.padEnd(17)} brand.500=${B[500]} brand.600=${B[600]} accent.400=${A[400]} hero=${H.from}→${H.via}`);
  for (const mode of ['light', 'dark'] as const) {
    const L = mode === 'light';
    const t = `${theme.key}/${mode}`;
    // The steps below mirror `roles` in src/themes/system.ts.
    const bg = L ? N[50]! : N[950]!;
    const panel = L ? '#ffffff' : N[925]!;
    const subtle = L ? N[100]! : N[900]!;
    const muted = L ? N[200]! : N[850]!;
    const fg = L ? N[950]! : N[50]!;
    const fgMuted = L ? N[600]! : N[400]!;
    const brandFg = L ? B[700]! : B[300]!;
    const accentFg = L ? A[800]! : A[300]!;
    check(t, 'fg on bg', fg, bg);
    check(t, 'fg.muted on bg', fgMuted, bg);
    check(t, 'fg.muted on panel', fgMuted, panel);
    check(t, 'fg.muted on bg.subtle', fgMuted, subtle);
    check(t, 'fg.muted on bg.muted', fgMuted, muted);
    check(t, 'white on brand.solid', '#ffffff', B[600]!);
    check(t, 'brand.fg on panel', brandFg, panel);
    check(t, 'brand.fg on bg', brandFg, bg);
    check(t, 'brand.fg on brand.subtle', brandFg, L ? B[100]! : B[950]!);
    check(t, 'brand.fg on brand.muted', brandFg, L ? B[200]! : B[900]!);
    check(t, 'accent.contrast on accent.solid', A[950]!, A[400]!);
    check(t, 'accent.fg on panel', accentFg, panel);
    check(t, 'accent.fg on accent.subtle', accentFg, L ? A[100]! : A[950]!);
    check(t, 'accent.fg on accent.muted', accentFg, L ? A[200]! : A[900]!);
    check(t, 'gain on panel', L ? green[700] : green[300], panel);
    check(t, 'loss on panel', L ? red[700] : red[300], panel);
    check(t, 'gain on bg.subtle', L ? green[700] : green[300], subtle);
    check(t, 'loss on bg.subtle', L ? red[700] : red[300], subtle);
    check(t, 'focus ring vs bg (3:1)', L ? B[600]! : B[400]!, bg, 3);
  }
  const t = `${theme.key}/hero`;
  check(t, 'white on hero.from', '#ffffff', H.from);
  check(t, 'white on hero.via', '#ffffff', H.via);
  check(t, 'white on hero tray (via + 22% black)', '#ffffff', mix(H.via, '#000000', 0.22));
  check(t, 'accent ring vs well (via + 40% black) (3:1)', A[400]!, mix(H.via, '#000000', 0.4), 3);
  check(t, 'accent ring vs well (from + 40% black) (3:1)', A[400]!, mix(H.from, '#000000', 0.4), 3);
}
console.log(failures ? `\n${failures} failing pairs` : '\nall pairs pass');
process.exitCode = failures ? 1 : 0;
