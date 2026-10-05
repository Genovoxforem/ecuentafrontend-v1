import { useMemo } from 'react'
import { useInvoicesSummary, type InvoiceRow } from '../invoices/invoices.queries'
import { useVendorInvoices, type VendorInvoiceRow } from '../vendorInvoices/vendorInvoices.queries'
import { useDashboardStatistics } from './dashboardStats'
import { useZraSummary } from '../zra/zra.queries'
import { useContractsSummary } from '../contracts/contracts.queries'
import { useCustomersSummary } from '../customers/customers.queries'
import { useUnreconciledEntriesTotal, type BankAccountRow } from '../banking/banking.queries'
import { homeBanks, QUICK_ACTIONS, type HomeDashboard } from './home.queries'
import type { DashAttention, DashCountry, DashInvoiceRow, DashKpi, DashPeriodSeries, DashSide } from './mainDashboardParser'

// The dashboard for a user the backend shows no dashboard page to (index.php
// sends everyone but a super-admin to userdashboard.php or the POS — see
// fetchLegacyHomeDashboard). Worked out from the same invoice lists the Sales
// and Purchase Invoices pages read, with the classic page's definitions where
// the lists carry what they need: today's sales = validated or paid standard
// invoices dated today, unpaid = validated standard invoices not yet paid,
// Completed/Started/Draft = paid/validated/draft. The lists have no invoice
// type column; a credit note is told apart by its negative total. Figures the
// lists cannot give (quotations, ZRA warnings, low stock, purchase countries)
// are left out rather than guessed.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CURRENCY = 'ZMW'
const pad2 = (n: number) => String(n).padStart(2, '0')
const localIso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

interface Movement {
  id: number
  ref: string
  date: string
  party: string
  partyId: number | null
  amount: number
  // Dolibarr fk_statut: 0 draft, 1 validated (not paid / started), 2 paid, 3 abandoned.
  statut: number
  statusLabel: string
  // Backend card address, only ever turned into a React route (resolveLegacyRoute).
  href: string
}

function fromInvoice(r: InvoiceRow): Movement {
  return {
    id: r.id,
    ref: r.ref,
    date: r.invoiceDate,
    party: r.thirdParty,
    partyId: r.socid,
    amount: r.amountInclTax,
    statut: r.rawStatut,
    statusLabel: r.statusLabel || r.status,
    href: `/compta/facture/card.php?facid=${r.id}`,
  }
}

const VENDOR_STATUS = ['Draft', 'Not paid', 'Paid', 'Abandoned']

function fromVendorInvoice(r: VendorInvoiceRow): Movement | null {
  if (!r.id) return null
  return {
    id: r.id,
    ref: r.ref,
    date: r.invoiceDate ?? '',
    party: r.thirdPartyName ?? '',
    partyId: r.thirdPartyId,
    amount: r.amountTtc,
    statut: r.statusCode,
    statusLabel: VENDOR_STATUS[r.statusCode] ?? '',
    href: `/fourn/facture/card.php?facid=${r.id}`,
  }
}

const sum = (rows: Movement[]) => rows.reduce((total, r) => total + r.amount, 0)
const isStandard = (r: Movement) => r.amount >= 0
const isValidated = (r: Movement) => r.statut === 1 || r.statut === 2

// Badge number of the classic status badge, for the status colour.
function badgeCode(r: Movement): number {
  if (r.statut === 0) return 0
  if (r.statut === 2) return 6
  if (r.statut === 3) return 9
  return /started/i.test(r.statusLabel) ? 3 : 1
}

function dailySeries(rows: Movement[], days: number): DashPeriodSeries {
  const series: DashPeriodSeries = { labels: [], income: [], sales: [], orders: [], customers: [] }
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date()
    day.setDate(day.getDate() - i)
    const dayRows = rows.filter((r) => r.date === localIso(day))
    series.labels.push(`${pad2(day.getDate())} ${MONTHS[day.getMonth()]}`)
    series.income.push(sum(dayRows))
    series.sales.push(dayRows.length)
    series.orders.push(0)
    series.customers.push(0)
  }
  return series
}

function yearSeries(rows: Movement[], year: number): DashPeriodSeries {
  const series: DashPeriodSeries = { labels: [...MONTHS], income: [], sales: [], orders: [], customers: [] }
  MONTHS.forEach((_, m) => {
    const prefix = `${year}-${pad2(m + 1)}`
    const monthRows = rows.filter((r) => r.date.startsWith(prefix))
    series.income.push(sum(monthRows))
    series.sales.push(monthRows.length)
    series.orders.push(0)
    series.customers.push(0)
  })
  return series
}

function donut(rows: Movement[]): DashSide['donut'] {
  const slices = [
    { label: 'Completed', count: rows.filter((r) => r.statut === 2).length },
    { label: 'Started', count: rows.filter((r) => r.statut === 1).length },
    { label: 'Draft', count: rows.filter((r) => r.statut === 0).length },
  ]
  const total = Math.max(1, slices.reduce((t, s) => t + s.count, 0))
  return slices.map((s) => ({ ...s, percent: Math.round((s.count / total) * 100) }))
}

function last7(rows: Movement[]): DashInvoiceRow[] {
  return [...rows]
    .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1))
    .slice(0, 7)
    .map((r) => {
      const [y, m, d] = r.date.split('-').map(Number)
      return {
        ref: r.ref,
        id: r.id,
        href: r.href,
        party: r.party,
        partyId: r.partyId,
        amount: r.amount,
        date: y && m && d ? `${pad2(d)} ${MONTHS[m - 1]} ${y}` : r.date,
        status: r.statusLabel,
        statusCode: badgeCode(r),
      }
    })
}

function trend(today: number, yesterday: number): DashKpi['trend'] {
  if (!yesterday) return null
  return { percent: Math.abs(((today - yesterday) / yesterday) * 100), up: today >= yesterday }
}

function todayKpi(key: 'todaySales' | 'todayPurchase', label: string, rows: Movement[]): DashKpi {
  const today = localIso(new Date())
  const yesterday = localIso(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const todayRows = rows.filter((r) => r.date === today)
  const n = todayRows.length
  return {
    key,
    label,
    value: sum(todayRows),
    currency: CURRENCY,
    meta: `${n} invoice${n === 1 ? '' : 's'} today`,
    trend: trend(sum(todayRows), sum(rows.filter((r) => r.date === yesterday))),
    spark: [],
  }
}

export function useComputedHomeDashboard(accounts: BankAccountRow[] | undefined) {
  const stats = useDashboardStatistics()
  const invoices = useInvoicesSummary()
  const vendorInvoices = useVendorInvoices('all')
  const zra = useZraSummary()
  const contracts = useContractsSummary()
  const customers = useCustomersSummary()
  const unmatched = useUnreconciledEntriesTotal()

  const data = useMemo((): HomeDashboard | undefined => {
    if (!invoices.data || !vendorInvoices.data) return undefined
    const year = new Date().getFullYear()
    const sales = invoices.data.rows.map(fromInvoice)
    const purchases = vendorInvoices.data.items.map(fromVendorInvoice).filter((r): r is Movement => r !== null)
    const validatedSales = sales.filter((r) => isStandard(r) && isValidated(r))
    const validatedPurchases = purchases.filter((r) => isStandard(r) && isValidated(r))
    const salesYear = yearSeries(validatedSales, year)
    const purchaseYear = yearSeries(validatedPurchases, year)
    const unpaid = sales.filter((r) => isStandard(r) && r.statut === 1)

    // Sales by country: each validated invoice of the year under its customer's country.
    const countryOf = new Map((customers.data?.customers ?? []).flatMap((c) => (c.id === null ? [] : [[c.id, { name: c.country, code: c.countryCode ?? '' }] as const])))
    const byCountry = new Map<string, DashCountry>()
    for (const r of validatedSales) {
      if (!r.date.startsWith(String(year)) || r.partyId === null) continue
      const country = countryOf.get(r.partyId)
      if (!country?.name) continue
      const entry = byCountry.get(country.name) ?? { code: country.code.toLowerCase(), name: country.name, amount: 0, percent: 0 }
      entry.amount += r.amount
      byCountry.set(country.name, entry)
    }
    const countries = [...byCountry.values()].sort((a, b) => b.amount - a.amount).slice(0, 6)
    const countriesTotal = countries.reduce((t, c) => t + c.amount, 0)
    for (const c of countries) c.percent = countriesTotal > 0 ? Math.round((c.amount / countriesTotal) * 100) : 0

    const zraSigned = zra.data?.details.find((d) => d.category === 'Sales Invoices')?.succeeded
    const attention: DashAttention[] = []
    if (unpaid.length > 0) {
      attention.push({
        title: `${unpaid.length} unpaid invoice${unpaid.length > 1 ? 's' : ''}`,
        sub: `${CURRENCY} ${sum(unpaid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding`,
        count: unpaid.length,
        href: '/compta/facture/list.php?search_status=1',
        variant: 'warning',
      })
    }
    if (unmatched.data) {
      attention.push({
        title: `${unmatched.data} unmatched bank transaction${unmatched.data > 1 ? 's' : ''}`,
        sub: 'Awaiting reconciliation',
        count: unmatched.data,
        href: '/compta/bank/list.php',
        variant: 'info',
      })
    }

    return {
      source: 'computed',
      cashSession: null,
      kpis: {
        todaySales: todayKpi('todaySales', "Today's Sales", validatedSales),
        todayPurchase: todayKpi('todayPurchase', "Today's Purchase", validatedPurchases),
        unpaid: {
          key: 'unpaid',
          label: 'Unpaid Invoices',
          value: sum(unpaid),
          currency: CURRENCY,
          meta: `${unpaid.length} invoice${unpaid.length === 1 ? '' : 's'} outstanding`,
          trend: null,
          spark: [],
        },
        ...(zraSigned !== undefined
          ? { zraSigned: { key: 'zraSigned' as const, label: 'ZRA Signed Invoices', value: zraSigned, currency: '', meta: 'Signed by ZRA', trend: null, spark: [] } }
          : {}),
      },
      sales: {
        donut: donut(sales),
        tiles: [
          ...(stats.data ? [{ label: 'Sales Orders', value: stats.data.salesOrders?.total ?? 0 }] : []),
          ...(contracts.data ? [{ label: 'Contracts', value: contracts.data.totalContracts }] : []),
        ],
        summary: [
          { label: 'Income', value: salesYear.income.reduce((t, v) => t + v, 0), currency: CURRENCY, trend: null },
          { label: 'Sales', value: salesYear.sales.reduce((t, v) => t + v, 0), currency: '', trend: null },
        ],
        periods: { week: dailySeries(validatedSales, 7), month: dailySeries(validatedSales, 30), year: salesYear },
        last7: last7(sales),
        countries,
        markers: [],
        lines: [],
      },
      purchase: {
        donut: donut(purchases),
        tiles: [],
        summary: [
          { label: 'Expenses', value: purchaseYear.income.reduce((t, v) => t + v, 0), currency: CURRENCY, trend: null },
          { label: 'Purchases', value: purchaseYear.sales.reduce((t, v) => t + v, 0), currency: '', trend: null },
        ],
        periods: { week: dailySeries(validatedPurchases, 7), month: dailySeries(validatedPurchases, 30), year: purchaseYear },
        last7: last7(purchases),
        countries: [],
        markers: [],
        lines: [],
      },
      banks: homeBanks(accounts, undefined, CURRENCY),
      attention,
      quickActions: QUICK_ACTIONS,
    }
  }, [invoices.data, vendorInvoices.data, stats.data, zra.data, contracts.data, customers.data, unmatched.data, accounts])

  return { data, isError: invoices.isError || vendorInvoices.isError, error: invoices.error ?? vendorInvoices.error }
}
