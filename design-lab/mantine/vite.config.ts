import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const shared = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@shared': shared } },
  server: { port: 5201, strictPort: true, fs: { allow: ['..'] } },
  preview: { port: 5201, strictPort: true },
  build: { outDir: '../dist/mantine', emptyOutDir: true },
});
