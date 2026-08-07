import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { BACKEND_URLS, ACTIVE_BACKEND } from './src/api/backends.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Local dev only: forwards the app's relative "/api" and "/custom/*"
    // calls to whichever backend is selected in src/api/backends.ts — that
    // one file is the single place to change to switch backends. Requests
    // stay same-origin from the browser's point of view (it only ever
    // talks to this dev server), so this is also what avoids CORS.
    proxy: {
      '/api': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      '/custom': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
    },
  },
})
