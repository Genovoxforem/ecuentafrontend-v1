import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { useDashboardStatistics } from './dashboardStats'
import { useZraSummary } from '../zra/zra.queries'
import { useBankAccountsList } from '../banking/banking.queries'
import { useContractsSummary } from '../contracts/contracts.queries'
import { useCustomersSummary } from '../customers/customers.queries'

export interface StatWithTrend {
  value: number
  lastYear: number
  percent: number
  up: boolean
}

interface BreakdownStat {
  draft_count: number
  validated_count: number
  total_amount: number
  paid_amount: number
}

export interface DashboardSummary {
  today: {
    invoices_count: number
    sales_amount: number
    refund_amount: number
    purchases_count: number
    purchases_amount: number
    // Real, computed from the same invoice rows filtered to yesterday's
    // date — used for "vs Yesterday" trend badges. No purchase-invoice
    // endpoint on this backend, so there's no yesterday figure for
    // purchases either (purchases_amount is always 0 above).
    sales_amount_yesterday: number
    refund_amount_yesterday: number
  }
  zra: {
    signedInvoices: StatWithTrend
    totalSale: StatWithTrend
    totalTax: StatWithTrend
  }
  banks: Array<{ id: string | number; label: string; balance: number }>
  customers: { total: number; prospects: number; local: number; abroad: number }
  // Real per-country customer counts (grouped from each customer's own
  // `country` field), sorted descending — not sales-by-country: no invoice
  // on this backend carries a country or a customer id to join against, so
  // a real revenue-per-country figure isn't derivable (see
  // useDashboardSummary's header comment).
  customersByCountry: Array<{ country: string; count: number }>
  salesBreakdown: BreakdownStat
  purchaseBreakdown: BreakdownStat
  // Real sum of credit-note invoices (type=2), shown negative — see
  // useDashboardSummary for why this can't come from the dashboard stats
  // endpoint (its invoicesByStatus[].amount is always 0 server-side).
  totalRefund: number
  monthly: Array<{ ym: string; income: number; sales_count: number; customers: number }>
  months: string[]
  period: { dateStart: string }
  legacyCounts: {
    salesOrders: StatWithTrend
    contracts: StatWithTrend
    shipments: StatWithTrend
    quotationsCount: number
  }
  recentSales: Array<{
    id: string | number
    ref: string | null
    datef: string | null
    company_name: string
    total_ttc: number
    fk_statut: 0 | 1 | 2 | 3
  }>
}

const zeroStat = (value = 0): StatWithTrend => ({ value, lastYear: 0, percent: 0, up: true })

// Confirmed against api/invoices/index.php on the real backend — see
// invoices.queries.ts for the full field-by-field notes. type: 0 = standard
// invoice, 2 = credit note (Dolibarr convention) — confirmed live, used to
// separate salesBreakdown from totalRefund below.
interface RawInvoice {
  id: number
  ref: string
  date: string
  thirdparty_name: string
  total_ttc: number
  statut: 0 | 1 | 2 | 3
  type: number
}

interface InvoicesResponse {
  success: boolean
  invoices: RawInvoice[]
}

// "Sep 2025" -> 2025. chartData only gives a short month name + numeric
// month-of-year, so the year has to be parsed back out of the label.
function yearFromMonthName(monthName: string): number {
  return Number(monthName.split(' ')[1]) || new Date().getFullYear()
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

// GET /api/dashboard/ + /api/invoices/ + /api/zra/summary/ — all confirmed
// live (the ZRA one is the same endpoint zra.queries.ts's ZRA Dashboard
// already uses — reused here rather than re-fetched, react-query dedupes
// by its query key). Bank balances reuse the same real
// bank-sidebar-list-ajax.php endpoint the Banking module's account list is
// built on (see banking.queries.ts's useBankAccountsList), and the contract
// count reuses the real contrat/list_ajax.php endpoint the Contracts
// module's own summary is built on (see contracts.queries.ts's
// useContractsSummary), and customersByCountry is grouped from the same
// real per-customer `country` field the Customers module's own list/detail
// pages use (see customers.queries.ts's useCustomersSummary) — there's no
// separate quotations or purchase invoice endpoint on this backend though,
// so those sections stay honestly zero/empty rather than inventing numbers.
export function useDashboardSummary() {
  const { data: stats } = useDashboardStatistics()
  const { data: zraSummary } = useZraSummary()
  const { data: bankAccounts } = useBankAccountsList()
  const { data: contractsSummary } = useContractsSummary()
  const { data: customersSummary } = useCustomersSummary()
  return useQuery({
    queryKey: ['home', 'dashboard', !!stats, !!zraSummary, !!bankAccounts, !!contractsSummary, !!customersSummary],
    enabled: !!stats,
    queryFn: async (): Promise<DashboardSummary> => {
      if (!stats) throw new Error('unreachable')
      // limit: 500 comfortably covers this endpoint's real invoice count
      // (confirmed live, well under 500) — needed because /api/dashboard/'s
      // own invoicesByStatus[].amount is always 0 (a real server-side bug,
      // confirmed live), so salesBreakdown/totalRefund below are computed
      // from these full rows instead of trusting that broken field.
      const { data: invoicesData } = await api.get<InvoicesResponse>('/invoices/', { params: { status: 'all', limit: 500 } })
      const monthPoints = stats.chartData?.invoicesByMonth ?? []
      const months = monthPoints.map((p) => `${yearFromMonthName(p.monthName)}-${pad2(p.month)}`)
      const monthly = monthPoints.map((p, i) => ({ ym: months[i], income: p.amount, sales_count: p.count, customers: 0 }))
      const dateStart = months[0] ? `${months[0]}-01` : `${new Date().getFullYear()}-01-01`

      const invoiceRows = invoicesData.invoices ?? []
      // Credit notes (type=2) are accounted separately as totalRefund, same
      // convention as the reference dashboard (Total Sale Amount vs Total
      // Refund shown as distinct lines) — excluded from salesBreakdown.
      const standardInvoices = invoiceRows.filter((r) => r.type !== 2)
      const creditNotes = invoiceRows.filter((r) => r.type === 2)
      const draftRows = standardInvoices.filter((r) => r.statut === 0)
      const paidRows = standardInvoices.filter((r) => r.statut === 2)
      const validatedRows = standardInvoices.filter((r) => r.statut !== 0)
      const salesBreakdown: BreakdownStat = {
        draft_count: draftRows.length,
        validated_count: validatedRows.length,
        total_amount: standardInvoices.reduce((sum, r) => sum + Number(r.total_ttc ?? 0), 0),
        paid_amount: paidRows.reduce((sum, r) => sum + Number(r.total_ttc ?? 0), 0),
      }
      // "0 - x" rather than "-x": avoids producing -0 when there are no
      // credit notes, which Intl.NumberFormat (fmtMoney) would render as
      // the confusing "-0.00" instead of "0.00".
      const totalRefund = 0 - creditNotes.reduce((sum, r) => sum + Number(r.total_ttc ?? 0), 0)
      const todayIso = new Date().toISOString().slice(0, 10)
      const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const todayRows = standardInvoices.filter((r) => r.date.slice(0, 10) === todayIso)
      const todayRefundRows = creditNotes.filter((r) => r.date.slice(0, 10) === todayIso)
      const yesterdayRows = standardInvoices.filter((r) => r.date.slice(0, 10) === yesterdayIso)
      const yesterdayRefundRows = creditNotes.filter((r) => r.date.slice(0, 10) === yesterdayIso)
      const countryCounts = new Map<string, number>()
      for (const c of customersSummary?.customers ?? []) {
        const country = c.country?.trim()
        if (!country) continue
        countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1)
      }
      const customersByCountry = [...countryCounts.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count)

      const recentSales = [...invoiceRows]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7)
        .map((r) => ({
          id: r.id,
          ref: r.ref,
          datef: r.date,
          company_name: r.thirdparty_name,
          total_ttc: Number(r.total_ttc ?? 0),
          fk_statut: r.statut,
        }))

      return {
        today: {
          invoices_count: todayRows.length,
          sales_amount: todayRows.reduce((sum, r) => sum + Number(r.total_ttc ?? 0), 0),
          refund_amount: 0 - todayRefundRows.reduce((sum, r) => sum + Number(r.total_ttc ?? 0), 0),
          // No purchase-invoice endpoint on this backend.
          purchases_count: 0,
          purchases_amount: 0,
          sales_amount_yesterday: yesterdayRows.reduce((sum, r) => sum + Number(r.total_ttc ?? 0), 0),
          refund_amount_yesterday: 0 - yesterdayRefundRows.reduce((sum, r) => sum + Number(r.total_ttc ?? 0), 0),
        },
        // Real ZRA e-invoicing gateway stats (see zra.queries.ts's
        // useZraSummary) — "signed" here means successfully synced to ZRA,
        // matching that endpoint's own succeeded/succeededAmount fields.
        // No year-over-year trend data on this endpoint, so lastYear/percent
        // stay 0 like the other legacyCounts below.
        zra: zraSummary
          ? {
              signedInvoices: zeroStat(zraSummary.details.find((d) => d.category === 'Sales Invoices')?.succeeded ?? 0),
              totalSale: zeroStat(zraSummary.salesInvoices.succeededAmount),
              totalTax: zeroStat(zraSummary.vatAmount.succeededAmount),
            }
          : { signedInvoices: zeroStat(), totalSale: zeroStat(), totalTax: zeroStat() },
        banks: (bankAccounts ?? []).map((b) => ({ id: b.id, label: b.label, balance: b.balance })),
        // Real live counts from /api/dashboard/'s own customers block — was
        // previously left unused while the "Customers" stat card showed
        // legacyCounts.salesOrders.value instead (a mislabeling bug).
        // local/abroad come from the Customers module's own real summary
        // split (default vs. other country parties).
        customers: {
          total: stats.customers?.total ?? 0,
          prospects: stats.customers?.prospects ?? 0,
          local: customersSummary?.defaultCountryCustomers ?? 0,
          abroad: customersSummary?.otherCountryCustomers ?? 0,
        },
        customersByCountry,
        salesBreakdown,
        totalRefund,
        // No purchase-invoice endpoint on this backend.
        purchaseBreakdown: { draft_count: 0, validated_count: 0, total_amount: 0, paid_amount: 0 },
        monthly,
        months,
        period: { dateStart },
        legacyCounts: {
          salesOrders: zeroStat(stats.salesOrders?.total ?? 0),
          contracts: zeroStat(contractsSummary?.totalContracts ?? 0),
          shipments: zeroStat(stats.salesOrders?.shipped ?? 0),
          quotationsCount: 0,
        },
        recentSales,
      }
    },
    staleTime: 1000 * 60,
  })
}
