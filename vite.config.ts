import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), 'VITE_')
const BACKEND_URL = env.VITE_BACKEND_URL?.replace(/\/$/, '') || (process.env.NODE_ENV === 'test' ? 'http://localhost' : '')
if (!BACKEND_URL) throw new Error('VITE_BACKEND_URL is not configured')

// Paths the existing PHP/Dolibarr backend owns on its own origin — kept as
// one list so the dev proxy below and the generated production .htaccess
// (see htaccessPlugin) can never drift apart from each other.
const BACKEND_OWNED_PATHS = [
  '/api',
  '/custom',
  '/takeposnew',
  '/takepos',
  '/index.php',
  '/quicklinks_ajax.php',
  '/accountancy',
  '/product',
  '/variants',
  '/projet',
  '/categories',
  '/comm',
  '/core',
  '/societe',
  '/productinfo',
  '/admin',
  '/contrat',
  '/contact',
  '/commande',
  '/compta',
  '/fichinter',
  '/userprofile',
  '/expensereport',
  '/expedition',
  '/fourn',
  '/supplier_proposal',
  '/reception',
  '/user',
  '/payroll',
  '/loan',
  '/expense',
  '/ticket',
  '/kitchen',
  '/adherents',
  '/asset',
] as const

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

// Dolibarr's main.inc.php CSRF check compares the request's Referer/Origin
// against the server's own URL — the Vite dev proxy (changeOrigin: true)
// rewrites the Host header to match the backend, but leaves Referer/Origin
// pointing at localhost:5173, so POSTs to session-cookie-authenticated
// endpoints (societe/api/list.php, etc.) get rejected with "Access refused
// by CSRF protection". This spreads a configure() hook across every proxy
// entry that overwrites those two headers with the backend's own origin.
function proxyConfig(target: string) {
  return {
    target,
    changeOrigin: true,
    // Dolibarr's CSRF check compares Referer/Origin against the server's own
    // URL. changeOrigin only rewrites Host — Referer/Origin still point at
    // localhost:5173, so POSTs get rejected. headers adds them to every
    // proxied request, overriding whatever the browser sent.
    headers: {
      Referer: `${target}/`,
      Origin: target,
    },
    configure(proxy: { on: (event: string, handler: (...args: unknown[]) => void) => void }) {
      proxy.on('proxyReq', (proxyReq: { setHeader: (name: string, value: string) => void }, req: { headers: Record<string, string> }) => {
        // Belt-and-suspenders: headers above should already cover this, but
        // some http-proxy versions only apply `headers` to the initial
        // request, not upgraded/websocket ones. This ensures every request
        // gets the correct Referer/Origin.
        proxyReq.setHeader('Referer', `${target}/`)
        proxyReq.setHeader('Origin', target)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    htaccessPlugin(),
    // Generates dist/stats.html on every build — open it in a browser to
    // see a treemap of every chunk and its modules. Only runs in build
    // mode (dev server ignores it).
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Splits heavy vendor libraries into their own chunks so they're
        // loaded once and cached across route navigations, instead of being
        // bundled into whichever route chunk first imports them. recharts
        // (~57 KB) is only needed on dashboard/statistics pages, exceljs
        // (~250 KB) only on export pages, qrcode+jsbarcode only on
        // product/barcode pages. Without this, a user visiting /customers
        // could download exceljs bundled into a shared chunk they never use.
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-excel': ['exceljs'],
          'vendor-barcode': ['jsbarcode', 'qrcode'],
        },
      },
    },
  },
  server: {
    // Local dev only: forwards the app's relative "/api" and "/custom/*"
    // calls to the backend configured via VITE_BACKEND_URL in .env.local
    // (see .env.example) — that's the one place to change to
    // switch backends now. Requests stay same-origin from the browser's
    // point of view (it only ever talks to this dev server), so this is
    // also what avoids CORS.
    //
    // "/takeposnew" and "/takepos" are POS's own legacy, session-cookie-based
    // endpoints (src/pos/features/tables|reports|cart/services/*.php calls) —
    // they need the same same-origin treatment as /api, or the DOLSESSID
    // cookie Dolibarr sets on them never gets sent back.
    proxy: {
      '/api': proxyConfig(BACKEND_URL),
      // Regex, not a plain string: Vite/http-proxy-middleware matches plain
      // string keys by simple prefix, so a bare '/custom' also swallowed the
      // app's own /customers, /customers/create, /customers/:id,
      // /customer-groups, /customers/tags routes on direct navigation or a
      // hard refresh (never on in-app SPA clicks, since React Router
      // intercepts those before any request — that's why this went
      // unnoticed). Anchored to match only /custom or /custom/... .
      '^/custom(/|$)': proxyConfig(BACKEND_URL),
      '/takeposnew': proxyConfig(BACKEND_URL),
      '/takepos': proxyConfig(BACKEND_URL),
      // Dolibarr's own classic login controller — see legacySession.ts. This
      // app has no route of its own at this path, so carving it out here is
      // safe the same way '/custom' and '/takeposnew' already are.
      '^/index\\.php$': proxyConfig(BACKEND_URL),
      // Real AJAX handler behind the legacy "New Warehouse" quick-create
      // form (POST type=savewarehouse, INSERT INTO llx_entrepot — confirmed
      // by reading quicklinks_ajax.php directly) — a root-level PHP file
      // this app has no route of its own at, same as index.php above.
      '^/quicklinks_ajax\\.php$': proxyConfig(BACKEND_URL),
      // Real generated-document download links (FormFile::getDocumentsLink()'s
      // own href target, e.g. the Quotations list's per-row PDF download
      // icon) — a root-level PHP file this app has no route of its own at,
      // same as index.php above.
      '^/document\\.php$': proxyConfig(BACKEND_URL),
      // Legacy accounting/bookkeeping reports (Ledger, Journals) have no
      // REST API — generalLedger.queries.ts fetches these PHP-rendered pages
      // directly (same-origin, DOLSESSID-cookie-authenticated via
      // legacySession.ts) and parses the HTML client-side. See
      // ledgerHtmlParser.ts.
      '/accountancy': proxyConfig(BACKEND_URL),
      // Warehouse stats (Shipments/Receptions/Inventories/Reservations
      // counts) have no REST API either — same client-side scrape pattern,
      // see warehouseHtmlParser.ts. Regex-anchored for the same reason as
      // '/custom' above: a bare '/product' string also prefix-matched this
      // app's own /products/*, /products (productArea), etc. routes.
      '^/product(/|$)': proxyConfig(BACKEND_URL),
      // Variant attributes list (variants/list.php) — same no-REST-API
      // scrape pattern, lives outside /product so it needs its own rule.
      // No React route starts with /variants, so a plain prefix is safe,
      // but anchored anyway to match the rest of this list.
      '^/variants(/|$)': proxyConfig(BACKEND_URL),
      // Generic import wizard (Sales > Settings > Import Customers/Vendors)
      // — imports/import.php's Step 1 dataset list is scraped for its real
      // datatoimport codes (see importsHtmlParser.ts), and Step 2's
      // "Download Empty Example" links go straight to the real
      // imports/emptyexample.php file-generator endpoint, same as the
      // legacy page itself does. No REST API exists for either. No React
      // route starts with /imports, so a plain prefix is safe.
      '^/imports(/|$)': proxyConfig(BACKEND_URL),
      // Projects/Leads module (projet/*.php) and its tag/category creation
      // (categories/card.php?type=6) and vendor-proposal statistics
      // (comm/propal/stats/*) — same no-REST-API scrape pattern, see
      // projects.queries.ts, tasks.queries.ts, and friends. No React route
      // starts with /projet, /categories, or /comm, so a plain prefix is
      // safe, but anchored anyway to match the rest of this list.
      '^/projet(/|$)': proxyConfig(BACKEND_URL),
      '^/categories(/|$)': proxyConfig(BACKEND_URL),
      '^/comm(/|$)': proxyConfig(BACKEND_URL),
      // UOM Settings tab (core/ajax/uom_manage.php) — a real, already-JSON
      // Dolibarr AJAX endpoint (list/create/update/delete conversions), no
      // scraping needed, just same-origin session-cookie auth like the rest
      // of this list. No React route starts with /core, so a plain prefix
      // is safe, but anchored anyway to match the rest of this list.
      '^/core(/|$)': proxyConfig(BACKEND_URL),
      // Third-party (Customer/Prospect/Supplier) list — societe/api/list.php
      // is a real, working, session-cookie-authenticated JSON endpoint (a
      // separate namespace from /api/*, unaffected by that namespace's gaps
      // on this backend) — see societeListParser.ts. No React route starts
      // with /societe, so a plain prefix is safe, but anchored anyway to
      // match the rest of this list.
      '^/societe(/|$)': proxyConfig(BACKEND_URL),
      // Product hero-header actions (Delete/Duplicate) — productinfo/api/
      // product_api.php, a real JSON CRUD API in the same vein as
      // societe/api/*, unrelated to the old /api/products/ namespace. No
      // React route starts with /productinfo, so a plain prefix is safe,
      // but anchored anyway to match the rest of this list.
      '^/productinfo(/|$)': proxyConfig(BACKEND_URL),
      // Legacy dictionary pages (admin/dict.php?id=N) — no REST endpoint
      // exists for these on this backend (/customers/lookups/ 404s), but
      // the real PHP admin pages themselves are live and session-cookie
      // authenticated like every other legacy-scrape source in this app —
      // see legacyDictionaryParser.ts. No React route starts with /admin,
      // so a plain prefix is safe, but anchored anyway to match the rest
      // of this list.
      '^/admin(/|$)': proxyConfig(BACKEND_URL),
      // Contract-Follow / Customer tab action buttons (societe/api/
      // contracts.php + customer.php) return real legacy URLs for creating
      // contracts/orders/invoices/job cards — contrat, commande, compta, and
      // fichinter aren't otherwise proxied yet, so linking to any of those
      // 404'd in dev until now (production doesn't need this, see the
      // comment above BACKEND_OWNED_PATHS — same origin there already).
      '^/contrat(/|$)': proxyConfig(BACKEND_URL),
      // Standalone Contacts/Addresses module (contact/contacts-addresses-
      // list-ajax.php) — distinct from /contrat (Contracts) above and
      // unrelated to the frontend's own /contacts React route (singular vs
      // plural, and anchored with (/|$) so the two never collide).
      '^/contact(/|$)': proxyConfig(BACKEND_URL),
      '^/commande(/|$)': proxyConfig(BACKEND_URL),
      '^/compta(/|$)': proxyConfig(BACKEND_URL),
      '^/fichinter(/|$)': proxyConfig(BACKEND_URL),
      // Real per-user Permissions/User-info API (userprofile/api/*), found
      // by watching userprofile/index.php?id=X's own network traffic — see
      // userPermissions.queries.ts.
      '^/userprofile(/|$)': proxyConfig(BACKEND_URL),
      // User Groups (list + real create) — user/group/user-groups-sidebarlist-
      // ajax.php (real DataTables JSON, id/name/date_creation) and
      // user/group/ajax_group.php (real create_group action, no CSRF token
      // check server-side) — see userGroupsAndTags.queries.ts. No React
      // route starts with bare /user (this app's own routes use
      // /users-dashboard), so a plain prefix is safe, but anchored anyway.
      '^/user(/|$)': proxyConfig(BACKEND_URL),
      // Payroll — attendance_rip_ajax.php (real JSON read, Date Wise
      // Attendance) and saveAttendance.php (real JSON write, Mark
      // Attendance — its own hasRight() check is commented out server-side,
      // a real live bug reported not fixed per frontend-only scope) — see
      // payrollAttendance.queries.ts. No React route starts with bare
      // /payroll (this app's own route is /payroll-dashboard), so a plain
      // prefix is safe, but anchored anyway.
      '^/payroll(/|$)': proxyConfig(BACKEND_URL),
      // Banking — loan/loan-sidebar-list-ajax.php (real JSON, Loan List) —
      // see banking.queries.ts. No React route starts with /loan, so a
      // plain prefix is safe, but anchored anyway.
      '^/loan(/|$)': proxyConfig(BACKEND_URL),
      // Expenses — expense/ajax/expense_list.php (real JSON, Expense
      // Reports list) and expense/api/expense_types.php (real JSON dropdown
      // feed) — see expenses.queries.ts. This app's own routes all use
      // /expenses (plural), so a plain /expense (singular) prefix is safe,
      // but anchored anyway.
      '^/expense(/|$)': proxyConfig(BACKEND_URL),
      // Tickets — ticket/ticket_list_ajax.php and ticket/ticket_stats_ajax.php
      // (real JSON, permission-checked) — see tickets.queries.ts. This
      // app's own routes all use /tickets (plural), so a plain /ticket
      // (singular) prefix is safe, but anchored anyway.
      '^/ticket(/|$)': proxyConfig(BACKEND_URL),
      // Kitchen — kitchen/order_ajax_list.php (real JSON, Kitchen/Beverage
      // Orders) — see kitchen.queries.ts. This app's own Kitchen routes are
      // all hyphenated (/kitchen-dashboard, /kitchen-beverage-orders,
      // /kitchen-create-order), never /kitchen/..., so a plain prefix here
      // is safe, but anchored anyway.
      '^/kitchen(/|$)': proxyConfig(BACKEND_URL),
      // Members — adherents/ajax/ajax_adherents_list.php (real JSON,
      // restrictedArea()-checked) — see members.queries.ts. This app's own
      // Members routes all use /members (not /adherents), so a plain
      // prefix here is safe, but anchored anyway.
      '^/adherents(/|$)': proxyConfig(BACKEND_URL),
      // Fixed Assets — asset/assets-sidebar-list-ajax.php (real JSON, but
      // no permission check and thin — only 4 columns) — see
      // fixedAssets.queries.ts. This app's own Fixed Assets routes all use
      // /fixed-assets, so a plain /asset (singular) prefix is safe, but
      // anchored anyway.
      '^/asset(/|$)': proxyConfig(BACKEND_URL),
      // Real Purchase Invoice / Landed Cost Invoice / User dropdown options
      // for the Landed Cost create page (expensereport/landedcostbilled.php)
      // — see warehouseHtmlParser.ts's parseLandedCostFormOptions.
      '^/expensereport(/|$)': proxyConfig(BACKEND_URL),
      // Sales Order Detail's "Shipments - Delivery Receipts" tab
      // (expedition/shipment.php?id=X) — same no-REST-API scrape pattern as
      // the rest of orderCardParser.ts. No React route starts with
      // /expedition, so a plain prefix is safe, but anchored anyway to
      // match the rest of this list.
      '^/expedition(/|$)': proxyConfig(BACKEND_URL),
      // Third-Party Detail's native "Vendor" tab (societe/api/supplier.php)
      // links out to the real fourn/commande and fourn/purchase create
      // pages for its "Create Order"/"Create Invoice Or Credit Note"
      // buttons — see CustomerDetail.tsx's VendorTab.
      '^/fourn(/|$)': proxyConfig(BACKEND_URL),
      // Same tab's "Create A Price Request" button.
      '^/supplier_proposal(/|$)': proxyConfig(BACKEND_URL),
      // Purchase Order Detail's "Item Receipts" tab links to each real
      // reception record (reception/card.php?id=X, Reception::getNomUrl())
      // — no React route starts with /reception, so a plain prefix is
      // safe, but anchored anyway to match the rest of this list.
      '^/reception(/|$)': proxyConfig(BACKEND_URL),
    },
  },
})
