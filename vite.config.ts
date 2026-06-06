import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execSync } from 'child_process'

// Build-time injected so each deployed bundle carries a human-readable
// identifier the operator can read off a tablet's footer to know which
// deploy is running there. Falls back to 'dev' when not in a git
// checkout (e.g. some CI configurations). The footer renders these in
// a tiny muted line so customers don't notice.
const gitCommit = (() => {
  try {
    return execSync('git rev-parse --short HEAD', {stdio: ['ignore', 'pipe', 'ignore']})
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
})();
const buildDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_COMMIT__: JSON.stringify(gitCommit),
    __APP_BUILD_DATE__: JSON.stringify(buildDate),
  },
  // Bind on all interfaces so an in-restaurant tablet on the same Wi-Fi
  // can reach the dev server. Vite defaults to 127.0.0.1 — without
  // this the tablet's WebView (host configured via EXPO_PUBLIC_MENU_HOST
  // in TabletMenuApp/.env) gets a connection refused. The actual LAN
  // IP is printed in Vite's startup banner. Loopback (localhost /
  // 127.0.0.1) still works for desktop testing.
  server: {
    host: true,
  },
})
