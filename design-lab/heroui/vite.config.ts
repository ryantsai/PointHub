import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) },
  },
  server: { port: 5202, strictPort: true, fs: { allow: ['..'] } },
  preview: { port: 5202, strictPort: true },
  build: { outDir: '../dist/heroui', emptyOutDir: true },
});
