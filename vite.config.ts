import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
