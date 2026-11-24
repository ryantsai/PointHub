import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev: Vite serves the SPA on :5173 and proxies /api and /uploads (gift pictures) to the ASP.NET Core API on :5180,
// so the auth cookie stays same-origin. `host: true` lets phones on the LAN open scanned QR links.
// Set POINTHUB_API_URL to point the proxy at another API instance.
const apiTarget = process.env.POINTHUB_API_URL ?? 'http://localhost:5180';
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      '/api': { target: apiTarget },
      '/uploads': { target: apiTarget },
    },
  },
  build: {
    outDir: 'dist',
  },
});
