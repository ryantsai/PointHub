// Builds every design alternative into design-lab/dist/<slug>/ and writes the gallery to dist/index.html.
// Usage: node build-all.mjs [--install]   (--install runs `npm ci` in each design first)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const designs = JSON.parse(readFileSync(join(root, 'designs.json'), 'utf8'));
const install = process.argv.includes('--install');
const run = (cwd, args) => spawnSync('npm', args, { cwd, stdio: 'inherit', shell: true }).status === 0;

const built = [];
for (const design of designs) {
  const folder = join(root, design.slug);
  if (!existsSync(join(folder, 'package.json'))) { console.warn(`- ${design.slug}: not scaffolded, skipped`); continue; }
  console.log(`\n=== ${design.slug} (${design.kit}) ===`);
  if (install && !run(folder, ['ci'])) { console.error(`! ${design.slug}: npm ci failed`); continue; }
  if (!run(folder, ['run', 'build'])) { console.error(`! ${design.slug}: build failed`); continue; }
  built.push(design);
}

mkdirSync(join(root, 'dist'), { recursive: true });
const gallery = readFileSync(join(root, 'gallery', 'index.html'), 'utf8').replace('/*DESIGNS*/[]', JSON.stringify(built));
writeFileSync(join(root, 'dist', 'index.html'), gallery);
console.log(`\nGallery written with ${built.length} of ${designs.length} designs: ${built.map((d) => d.slug).join(', ') || '(none)'}`);
process.exit(built.length === designs.length ? 0 : 1);
