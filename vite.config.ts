import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
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

// Paths the existing PHP/Dolibarr backend owns on its own origin — kept as
// one list so the dev proxy below and the generated production .htaccess
// (see htaccessPlugin) can never drift apart from each other.
const BACKEND_OWNED_PATHS = ['/api', '/custom', '/takeposnew', '/takepos', '/index.php', '/accountancy', '/product', '/variants', '/projet', '/categories', '/comm', '/core', '/societe', '/productinfo', '/admin'] as const

// Production deploys this build's dist/ output onto the backend's own
// origin (e.g. https://demo1.ecuenta.online), alongside its existing PHP
// routes — see the deployment notes for the required Apache/vhost wiring.
// That makes every request genuinely same-origin (not proxied — there is
// no separate origin to proxy *to*), so the only thing still needed at the
// static-file level is this: React Router client-side routes need an
// index.html fallback, or a hard refresh/direct link to e.g.
// /customer-groups 404s (Apache looks for a literal file at that path by
// default). BACKEND_OWNED_PATHS are excluded from that fallback so
// requests to /api/*, /custom/*, etc. keep falling through to the real PHP
// files already sitting there instead of being swallowed by the SPA
// fallback.
function htaccessPlugin(): Plugin {
  return {
    name: 'generate-production-htaccess',
    apply: 'build',
    closeBundle() {
      const excludeFromSpaFallback = BACKEND_OWNED_PATHS.map((p) => p.replace('.', '\\.').replace(/^\//, '')).join('|')

      const htaccess = `# Auto-generated at build time by vite.config.ts — do not hand-edit.
# This file assumes dist/ is deployed onto the backend's own origin
# (alongside its existing /api, /custom, /takeposnew, /takepos, index.php
# routes) rather than a separate origin — see the deployment notes for the
# required web-server wiring. Same-origin means no proxying is needed here
# at all; this only adds React Router's SPA fallback.
#
# Without this, a hard refresh or direct link/bookmark to any in-app route
# (e.g. /customer-groups) 404s, since Apache looks for a literal file at
# that path by default. Falls back to index.html for anything that isn't a
# real file on disk and isn't one of the backend's own routes above; real
# assets (JS/CSS/images) and the backend's own PHP routes still resolve
# normally, untouched.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_URI} !^/(${excludeFromSpaFallback})
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`
      const outDir = path.resolve(import.meta.dirname, 'dist')
      fs.writeFileSync(path.join(outDir, '.htaccess'), htaccess)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), htaccessPlugin()],
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
      // Legacy accounting/bookkeeping reports (Ledger, Journals) have no
      // REST API — generalLedger.queries.ts fetches these PHP-rendered pages
      // directly (same-origin, DOLSESSID-cookie-authenticated via
      // legacySession.ts) and parses the HTML client-side. See
      // ledgerHtmlParser.ts.
      '/accountancy': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      // Warehouse stats (Shipments/Receptions/Inventories/Reservations
      // counts) have no REST API either — same client-side scrape pattern,
      // see warehouseHtmlParser.ts. Regex-anchored for the same reason as
      // '/custom' above: a bare '/product' string also prefix-matched this
      // app's own /products/*, /products (productArea), etc. routes.
      '^/product(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      // Variant attributes list (variants/list.php) — same no-REST-API
      // scrape pattern, lives outside /product so it needs its own rule.
      // No React route starts with /variants, so a plain prefix is safe,
      // but anchored anyway to match the rest of this list.
      '^/variants(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      // Generic import wizard (Sales > Settings > Import Customers/Vendors)
      // — imports/import.php's Step 1 dataset list is scraped for its real
      // datatoimport codes (see importsHtmlParser.ts), and Step 2's
      // "Download Empty Example" links go straight to the real
      // imports/emptyexample.php file-generator endpoint, same as the
      // legacy page itself does. No REST API exists for either. No React
      // route starts with /imports, so a plain prefix is safe.
      '^/imports(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      // Projects/Leads module (projet/*.php) and its tag/category creation
      // (categories/card.php?type=6) and vendor-proposal statistics
      // (comm/propal/stats/*) — same no-REST-API scrape pattern, see
      // projects.queries.ts, tasks.queries.ts, and friends. No React route
      // starts with /projet, /categories, or /comm, so a plain prefix is
      // safe, but anchored anyway to match the rest of this list.
      '^/projet(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      '^/categories(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      '^/comm(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      // UOM Settings tab (core/ajax/uom_manage.php) — a real, already-JSON
      // Dolibarr AJAX endpoint (list/create/update/delete conversions), no
      // scraping needed, just same-origin session-cookie auth like the rest
      // of this list. No React route starts with /core, so a plain prefix
      // is safe, but anchored anyway to match the rest of this list.
      '^/core(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      // Third-party (Customer/Prospect/Supplier) list — societe/api/list.php
      // is a real, working, session-cookie-authenticated JSON endpoint (a
      // separate namespace from /api/*, unaffected by that namespace's gaps
      // on this backend) — see societeListParser.ts. No React route starts
      // with /societe, so a plain prefix is safe, but anchored anyway to
      // match the rest of this list.
      '^/societe(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      // Product hero-header actions (Delete/Duplicate) — productinfo/api/
      // product_api.php, a real JSON CRUD API in the same vein as
      // societe/api/*, unrelated to the old /api/products/ namespace. No
      // React route starts with /productinfo, so a plain prefix is safe,
      // but anchored anyway to match the rest of this list.
      '^/productinfo(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
      // Legacy dictionary pages (admin/dict.php?id=N) — no REST endpoint
      // exists for these on this backend (/customers/lookups/ 404s), but
      // the real PHP admin pages themselves are live and session-cookie
      // authenticated like every other legacy-scrape source in this app —
      // see legacyDictionaryParser.ts. No React route starts with /admin,
      // so a plain prefix is safe, but anchored anyway to match the rest
      // of this list.
      '^/admin(/|$)': { target: BACKEND_URLS[ACTIVE_BACKEND], changeOrigin: true },
    },
  },
})
