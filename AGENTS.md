# eCuenta Frontend — Architecture Guide

## Overview

React 19 SPA frontend for the eCuenta/Dolibarr ERP backend. The app talks to a
legacy PHP backend (Dolibarr) that returns HTML pages for most "card" views —
the frontend parses that HTML into structured data and renders it natively.

## Tech Stack

- **React 19** + **TypeScript** (strict)
- **Vite 7** (dev server + build)
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **@tanstack/react-query 5** (server state, caching, mutations)
- **Axios** (HTTP client, same-origin via Vite proxy)
- **Zustand 5** (POS-specific local state)
- **react-router-dom 7** (routing)
- **lucide-react** + **@phosphor-icons/react** (icons)
- **recharts** (charts), **exceljs** (Excel export), **jsbarcode/qrcode** (barcodes)

## Commands

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Type-check (tsc -b) + production build
npm run lint         # oxlint
npm run test         # vitest run (single pass)
npm run test:watch   # vitest watch mode
npx tsc --noEmit     # Type-check only (no output files)
```

## Project Structure

```
src/
  api/              # Shared API layer
    axios.ts        #   Axios instance (same-origin, token auth)
    backends.ts     #   VITE_BACKEND_URL resolution, asset URL helper
    queryClient.ts  #   React Query client (retry, staleTime, error reporting)
  app/              # App shell, route prefetching
  features/         # Feature modules (one per domain area)
    customers/      #   Customers (third-parties), detail tabs, queries
    products/       #   Products, pricing, stock, variants
    invoices/       #   Customer invoices
    salesOrders/    #   Sales orders
    quotations/     #   Quotations/proposals
    vendors/        #   Vendors (supplier third-parties)
    warehouses/     #   Warehouses, inventory, shipments
    zra/            #   ZRA (Zimbabwe tax authority) integration
    ...             #   30+ feature folders total
  modules/          # Cross-cutting modules (auth, etc.)
  pos/              # Point of Sale (separate sub-app, mostly JSX/JS)
    services/       #   POS-specific API layer (fetch-based, not axios)
    stores/         #   Zustand stores
    features/       #   POS feature modules (cash, tables, reports, etc.)
    layouts/        #   POS layout (PosSidebar, etc.)
  shared/           # Shared components, error reporting, nav
    components/     #   UI primitives, ErrorBoundary, layout (Sidebar, Navbar)
    nav/            #   App menu configuration
    errorReporter.ts #  Centralized error reporting (pluggable)
  routes.ts         # All route paths (ROUTES constant)
  App.tsx           # Root component, router setup, providers
  main.tsx          # Entry point, global error handlers
```

## Key Patterns

### Data Flow

1. **List pages**: React Query hooks fetch JSON from `/api/*` endpoints →
   render native tables with pagination (max 100 rows/page).
2. **Detail pages**: React Query hooks fetch the legacy HTML page via
   `fetchLegacyDocument()` → parse with a feature-specific parser
   (e.g. `orderCardParser.ts`) → render native React components.
3. **Mutations**: React Query mutations POST to API endpoints →
   invalidate related queries on success.

### Legacy HTML Parsing

Many backend "card" pages (orders, invoices, products, customers) only have
HTML endpoints. The pattern:
- `fetchLegacyDocument(url)` in `src/shared/legacyHtmlFetch.ts` fetches the page
- Feature-specific parsers (e.g. `productCardParser.ts`) extract structured data
  using `DOMParser`
- Parsed data is typed and consumed by React components

### Code Splitting

- **Routes**: All route components are `React.lazy()` loaded (see `App.tsx`)
- **Detail page tabs**: Non-default tabs are extracted to `*DetailTabs.tsx`
  files and lazy-loaded via `Suspense` (ProductDetail, CustomerDetail,
  OrderDetail, QuotationDetail)
- **Vendor chunks**: recharts, exceljs, jsbarcode/qrcode split via
  `vite.config.ts` `manualChunks`
- **POS modals**: CashDeskModal, ReportsModal, RoomsModal, TablesModal are
  lazy-loaded in `PosSidebar.jsx`

### Route Prefetching

Sidebar nav items prefetch their target route's chunk on `mouseenter`
(see `src/app/routePrefetch.ts` + `Sidebar.tsx` / `ModernSidebar.tsx`).

### Error Reporting

All errors funnel through `src/shared/errorReporter.ts`:
- `ErrorBoundary.componentDidCatch` → `reportError()`
- `QueryCache.onError` → `reportError()`
- `window.unhandledrejection` → `reportError()`
- Default reporter: `console.error` in dev. Swap via `setErrorReporter()` for
  Sentry/external service in production.

### Performance Optimizations

- **useDeferredValue**: Search/filter inputs in list components defer filtering
  to keep typing responsive (ThirdPartyList, InvoicesList, OrdersList, ProductsList)
- **React Query**: 30s default staleTime, 3 retries with exponential backoff,
  per-query overrides for reference data (10min) and user lists (1h)
- **Vite proxy**: Rewrites `Referer`/`Origin` headers to match backend URL,
  avoiding CSRF rejection (see `proxyConfig()` in `vite.config.ts`)

## Configuration

### Environment Variables

- `VITE_BACKEND_URL`: Backend URL (e.g. `http://172.16.5.10/dolibarr`)
  Required — the app throws if not set.

### Vite Dev Server Proxy

`vite.config.ts` defines ~37 proxy entries that forward `/api/*`, `/productos/*`,
`/commande/*`, etc. to the backend. The `proxyConfig()` helper rewrites
`Referer` and `Origin` headers to match the backend's origin, which is required
to bypass Dolibarr's CSRF protection.

## POS Sub-App

The POS (`src/pos/`) is a largely separate module:
- Uses **fetch** (not axios) for API calls — `src/pos/services/axios.js`
- Uses **Zustand** for state — `src/pos/stores/`
- Mostly **JSX/JS** files (not TSX/TS) — migration to TypeScript is planned
- Lazy-loaded modals for cash desk, reports, rooms, tables

## Testing

- **Vitest** + **@testing-library/react** + **jsdom**
- Run: `npm test` (single pass) or `npm run test:watch`
- Test files: `*.test.ts(x)` or `src/test/` directory
