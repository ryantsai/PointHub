import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': dir('../shared'),
      '@': dir('./src'),
    },
  },
  server: { port: 5203, strictPort: true, fs: { allow: ['..'] } },
  preview: { port: 5203, strictPort: true },
  build: { outDir: '../dist/shadcn', emptyOutDir: true },
});
