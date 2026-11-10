import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// GitHub Pages hosts the site at /relay/. Local dev and `npm start` stay at /.
function siteBase(): string {
  const raw = (process.env.VITE_BASE ?? '/').trim() || '/';
  if (raw === '/') return '/';
  const withLead = raw.startsWith('/') ? raw : `/${raw}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

// GitHub Pages has no SPA server. Routes are hash-based, so in-app links never 404.
// 404.html (a copy of the website) still catches a direct visit to an unknown path.
function spaFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'relay-spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const indexPath = path.resolve(outDir, 'index.html');
      if (fs.existsSync(indexPath)) fs.copyFileSync(indexPath, path.resolve(outDir, '404.html'));
    },
  };
}

// The API server (server/index.ts) runs on :8787 during `npm run dev`; Vite proxies /api to it.
// The booking UI does not call it: quotes, routes and rentals are computed in the browser.
// Two entry points, one app: the website (/) and the phone app (/mobile/, phone-framed on a laptop).
export default defineConfig({
  base: siteBase(),
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: {
    chunkSizeWarningLimit: 4000,
    // The website (/) and the phone app (/mobile/) share all of src/.
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        mobile: fileURLToPath(new URL('./mobile/index.html', import.meta.url)),
      },
    },
  },
});
