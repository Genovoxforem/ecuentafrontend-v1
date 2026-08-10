import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { BACKEND_URLS, resolveActiveBackend } from './src/api/backends.ts'

// Node-side env resolution for the dev proxy target below — import.meta.env
// isn't populated while Vite is loading this config file (that injection
// only applies to code Vite bundles for the browser), so this uses Vite's
// own loadEnv() instead of backends.ts's getActiveBackend(). The mode value
// only affects which .env.[mode] file also gets read; .env.local (what this
// project actually uses to switch backends) is mode-agnostic and always
// loaded regardless.
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), 'VITE_')
const ACTIVE_BACKEND = resolveActiveBackend(env.VITE_ACTIVE_BACKEND)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Local dev only: forwards the app's relative "/api" and "/custom/*"
    // calls to whichever backend is selected via VITE_ACTIVE_BACKEND in
    // .env.local (see .env.example) — that's the one place to change to
    // switch backends now. Requests stay same-origin from the browser's
    // point of view (it only ever talks to this dev server), so this is
    // also what avoids CORS.
    //
    // "/takeposnew" and "/takepos" are POS's own legacy, session-cookie-based
    // endpoints (src/pos/features/tables|reports|cart/services/*.php calls) —
    // they need the same same-origin treatment as /api, or the DOLSESSID
    // cookie Dolibarr sets on them never gets sent back.
    proxy: {
      '/api': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      // Regex, not a plain string: Vite/http-proxy-middleware matches plain
      // string keys by simple prefix, so a bare '/custom' also swallowed the
      // app's own /customers, /customers/create, /customers/:id,
      // /customer-groups, /customers/tags routes on direct navigation or a
      // hard refresh (never on in-app SPA clicks, since React Router
      // intercepts those before any request — that's why this went
      // unnoticed). Anchored to match only /custom or /custom/... .
      '^/custom(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      '/takeposnew': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      '/takepos': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      // Dolibarr's own classic login controller — see legacySession.ts. This
      // app has no route of its own at this path, so carving it out here is
      // safe the same way '/custom' and '/takeposnew' already are.
      '^/index\\.php$': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
    },
  },
})
