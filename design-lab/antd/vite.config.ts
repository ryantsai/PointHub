import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    port: 5204,
    strictPort: true,
    fs: { allow: ['..'] },
  },
  preview: { port: 5204, strictPort: true },
  build: {
    outDir: '../dist/antd',
    emptyOutDir: true,
  },
});
