// WCAG check for the derived seasonal palettes. Run with: node scripts/contrast.ts
// (dev aid only; not part of the app bundle)
import { seasons } from '../../shared/seasons.ts';
import { accentScale, brandScale, contrast, heroStops, mix, neutralScale } from '../src/theme/palette.ts';

const green = { 700: '#116932', 300: '#86efac' };
const red = { 700: '#991919', 300: '#fca5a5' };

let failures = 0;
const check = (label: string, fg: string, bg: string, min = 4.5) => {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${ratio.toFixed(2).padStart(5)}  ${label}  (${fg} on ${bg})`);
};

for (const s of seasons) {
  const B = brandScale(s.primary);
  const A = accentScale(s.accent);
  const N = neutralScale(s.primary);
  const H = heroStops(s.gradient);
  console.log(`\n${s.key}  brand600=${B[600]} accent400=${A[400]}`);
  for (const mode of ['light', 'dark'] as const) {
    const L = mode === 'light';
    const bg = L ? N[50]! : N[950]!;
    const panel = L ? '#ffffff' : N[925]!;
    const subtle = L ? N[100]! : N[900]!;
    const muted = L ? N[200]! : N[850]!;
    console.log(` ${mode}`);
    check('fg on bg', L ? N[950]! : N[50]!, bg);
    check('fg.muted on bg', L ? N[600]! : N[400]!, bg);
    check('fg.muted on panel', L ? N[600]! : N[400]!, panel);
    check('fg.muted on bg.subtle', L ? N[600]! : N[400]!, subtle);
    check('fg.muted on bg.muted', L ? N[600]! : N[400]!, muted);
    check('brand.contrast on brand.solid', '#ffffff', B[600]!);
    check('brand.fg on panel', L ? B[700]! : B[300]!, panel);
    check('brand.fg on bg', L ? B[700]! : B[300]!, bg);
    check('brand.fg on brand.subtle', L ? B[700]! : B[300]!, L ? B[100]! : B[950]!);
    check('brand.fg on brand.muted', L ? B[700]! : B[300]!, L ? B[200]! : B[900]!);
    check('accent.contrast on accent.solid', A[950]!, A[400]!);
    check('accent.fg on panel', L ? A[800]! : A[300]!, panel);
    check('accent.fg on accent.subtle', L ? A[800]! : A[300]!, L ? A[100]! : A[950]!);
    check('accent.fg on accent.muted', L ? A[800]! : A[300]!, L ? A[200]! : A[900]!);
    check('gain on panel', L ? green[700] : green[300], panel);
    check('loss on panel', L ? red[700] : red[300], panel);
    check('gain on bg.subtle', L ? green[700] : green[300], subtle);
    check('loss on bg.subtle', L ? red[700] : red[300], subtle);
    check('focus ring vs bg (3:1)', L ? B[500]! : B[400]!, bg, 3);
    check('border.emphasized control vs panel (informational)', L ? N[300]! : N[700]!, panel, 1);
  }
  console.log(' hero');
  check('white on hero.from', '#ffffff', H.from);
  check('white on hero.via', '#ffffff', H.via);
  check('white on hero tray (via + 22% black)', '#ffffff', mix(H.via, '#000000', 0.22));
  check('white 85% on hero.via', mix(H.via, '#ffffff', 0.85), H.via);
  check('white 85% on hero.from', mix(H.from, '#ffffff', 0.85), H.from);
  check('brand.fg(700) on white CTA', B[700]!, '#ffffff');
  check('accent ring vs well (via+35% black) (3:1)', A[400]!, mix(H.via, '#000000', 0.35), 3);
  check('accent ring vs well (from+35% black) (3:1)', A[400]!, mix(H.from, '#000000', 0.35), 3);
}
console.log(failures ? `\n${failures} failing pairs` : '\nall pairs pass');
