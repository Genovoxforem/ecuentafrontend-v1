import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import type { BankAccountRow } from '../banking/banking.queries'
import {
  parseLegacyHomeDashboard,
  type DashAttention,
  type DashBank,
  type DashInvoiceRow,
  type DashKpi,
  type DashKpiKey,
  type DashQuickAction,
  type DashSide,
  type LegacyHomeDashboard,
} from './mainDashboardParser'

export interface HomeBank {
  id: number | null
  name: string
  amount: number
  currency: string
  // Share of the summed balances, as the classic Bank Details card draws it.
  percent: number
}

// What the dashboard shows — the classic home page's own widgets (see
// mainDashboardParser.ts), whichever source filled them in.
export interface HomeDashboard {
  // 'legacy' = read from the classic dashboard page itself; 'computed' = worked
  // out here from the invoice lists, for users the backend shows no dashboard.
  source: 'legacy' | 'computed'
  cashSession: 'open' | 'closed' | null
  kpis: Partial<Record<Exclude<DashKpiKey, 'other'>, DashKpi>>
  sales: DashSide
  purchase: DashSide
  banks: HomeBank[]
  attention: DashAttention[]
  quickActions: DashQuickAction[]
}

// The classic dashboard's six shortcuts, for the computed fallback (the
// classic page prints the same list for every user).
export const QUICK_ACTIONS: DashQuickAction[] = [
  { label: 'New Sale', href: '/takeposnew/index.php' },
  { label: 'Create Invoice', href: '/compta/facture/card.php?action=create' },
  { label: 'Add Product', href: '/product/card.php?action=create' },
  { label: 'New Purchase', href: '/fourn/facture/card.php?action=create' },
  { label: 'Add Customer', href: '/societe/card.php?action=create' },
  { label: 'ZRA Sync', href: '/custom/zra/zraindex.php' },
]

// GET index.php — for a super-admin this is the classic dashboard page itself
// (one request), with every figure the dashboard shows. index.php redirects any
// other user to userdashboard.php or the POS; that redirect is not followed and
// comes back as null, so the caller can fall back to its own figures. A login
// page means the legacy session is missing — thrown, never turned into an empty
// dashboard.
export async function fetchLegacyHomeDashboard(): Promise<LegacyHomeDashboard | null> {
  const res = await fetch('/index.php?mainmenu=home', { credentials: 'same-origin', redirect: 'manual' })
  if (res.type === 'opaqueredirect') return null
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  return parseLegacyHomeDashboard(html)
}

export function useLegacyHomeDashboard(enabled = true) {
  return useQuery({ queryKey: ['dashboard', 'legacy-home'], queryFn: fetchLegacyHomeDashboard, staleTime: 1000 * 60, enabled })
}

// Bank Details rows. The account list (bank-sidebar-list-ajax.php) carries each
// account's name, currency and exact balance — the classic card prints the same
// sums rounded to an even number, and on some installs without the account names
// (its Account::fetch comes back empty) — so its rows are used when they load,
// and the card's own rows only when they don't. The share is the classic card's:
// balance over the summed balances, never below 0.
export function homeBanks(accounts: BankAccountRow[] | undefined, legacyRows: DashBank[] | undefined, fallbackCurrency: string): HomeBank[] {
  if (accounts) {
    const total = accounts.reduce((sum, a) => sum + a.balance, 0)
    return accounts.map((a) => ({
      id: a.id,
      name: a.label,
      amount: a.balance,
      currency: a.currencyCode || fallbackCurrency,
      percent: total > 0 ? Math.max(0, Math.round((a.balance / total) * 100)) : 0,
    }))
  }
  return (legacyRows ?? []).map((b, i) => ({
    id: b.id,
    name: b.name || `Bank account ${i + 1}`,
    amount: b.amount ?? 0,
    currency: fallbackCurrency,
    percent: b.percent,
  }))
}

export function fromLegacyDashboard(legacy: LegacyHomeDashboard, accounts: BankAccountRow[] | undefined): HomeDashboard {
  const kpis: HomeDashboard['kpis'] = {}
  for (const kpi of legacy.kpis) if (kpi.key !== 'other') kpis[kpi.key] = kpi
  const currency = legacy.kpis.find((k) => k.currency)?.currency || 'ZMW'
  return {
    source: 'legacy',
    cashSession: legacy.cashSession,
    kpis,
    sales: legacy.sales,
    purchase: legacy.purchase,
    banks: homeBanks(accounts, legacy.banks, currency),
    attention: legacy.attention,
    quickActions: legacy.quickActions.length ? legacy.quickActions : QUICK_ACTIONS,
  }
}

// core/fapi/home_dashboard.php: the figures the dashboard's own SQL gives, as JSON with the API key (no session
// cookie). It carries the KPIs, the sales / purchase period totals, the newest 7 invoices of each side, the bank
// balances and the attention list. It has no donut, order / quotation tiles, period charts or country map, so those
// stay with the classic page (or the computed fallback) and this answer only fills what they lack.
export interface FapiHomeDashboard {
  currency: string
  kpis: DashKpi[]
  sales: { last7: DashInvoiceRow[] }
  purchase: { last7: DashInvoiceRow[] }
  attention: DashAttention[]
}

export function useFapiHomeDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'fapi-home'],
    queryFn: () => fapiGet<FapiHomeDashboard>('/core/fapi/home_dashboard.php'),
    staleTime: 1000 * 60,
    retry: false,
  })
}

// Fills a dashboard from the home_dashboard.php answer: the newest invoices where the page shows none ("No sales yet"
// on the scraped page while the table has rows), and, for the computed fallback, the exact unpaid / ZRA-signed KPIs
// and the attention list the invoice lists cannot give. A dashboard read from the classic page keeps its own figures.
export function withFapiHome(base: HomeDashboard, f: FapiHomeDashboard | undefined): HomeDashboard {
  if (!f) return base
  const fill = (side: HomeDashboard['sales'], rows: DashInvoiceRow[] | undefined) => (side.last7.length === 0 && rows?.length ? { ...side, last7: rows } : side)
  const next: HomeDashboard = { ...base, sales: fill(base.sales, f.sales?.last7), purchase: fill(base.purchase, f.purchase?.last7) }
  if (base.source !== 'computed') return next
  const kpis = { ...base.kpis }
  for (const k of f.kpis ?? []) {
    if ((k.key === 'unpaid' || k.key === 'zraSigned') && k.value !== null) kpis[k.key] = { ...k, label: kpis[k.key]?.label ?? k.label, trend: k.trend ?? null, spark: k.spark ?? [] }
  }
  return { ...next, kpis, attention: f.attention?.length ? f.attention : base.attention }
}
