import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { useDashboardStatistics } from './dashboardStats'

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
    purchases_count: number
    purchases_amount: number
  }
  zra: {
    signedInvoices: StatWithTrend
    totalSale: StatWithTrend
    totalTax: StatWithTrend
  }
  banks: Array<{ id: string | number; label: string; balance: number }>
  salesBreakdown: BreakdownStat
  purchaseBreakdown: BreakdownStat
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
  salesByCurrency: Array<{ currency: string; total: number }>
}

const zeroStat = (value = 0): StatWithTrend => ({ value, lastYear: 0, percent: 0, up: true })

// Confirmed against api/invoices/index.php on the real backend — see
// invoices.queries.ts for the full field-by-field notes.
interface RawInvoice {
  id: number
  ref: string
  date: string
  thirdparty_name: string
  total_ttc: number
  statut: 0 | 1 | 2 | 3
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

// GET /api/dashboard/ + /api/invoices/ — confirmed live. There's no ZRA,
// banking, purchase invoice, or per-currency breakdown endpoint on this
// backend, so those sections stay honestly zero/empty rather than
// inventing numbers.
export function useDashboardSummary() {
  const { data: stats } = useDashboardStatistics()
  return useQuery({
    queryKey: ['home', 'dashboard', !!stats],
    enabled: !!stats,
    queryFn: async (): Promise<DashboardSummary> => {
      if (!stats) throw new Error('unreachable')
      const { data: invoicesData } = await api.get<InvoicesResponse>('/invoices/', { params: { status: 'all' } })
      const monthPoints = stats.chartData?.invoicesByMonth ?? []
      const months = monthPoints.map((p) => `${yearFromMonthName(p.monthName)}-${pad2(p.month)}`)
      const monthly = monthPoints.map((p, i) => ({ ym: months[i], income: p.amount, sales_count: p.count, customers: 0 }))
      const dateStart = months[0] ? `${months[0]}-01` : `${new Date().getFullYear()}-01-01`

      const [draftStatus, unpaidStatus, paidStatus] = stats.chartData?.invoicesByStatus ?? []
      const salesBreakdown: BreakdownStat = {
        draft_count: draftStatus?.count ?? stats.invoices?.draft ?? 0,
        validated_count: (unpaidStatus?.count ?? 0) + (paidStatus?.count ?? stats.invoices?.paid ?? 0),
        total_amount: (draftStatus?.amount ?? 0) + (unpaidStatus?.amount ?? 0) + (paidStatus?.amount ?? 0),
        paid_amount: paidStatus?.amount ?? 0,
      }

      const invoiceRows = invoicesData.invoices ?? []
      const todayIso = new Date().toISOString().slice(0, 10)
      const todayRows = invoiceRows.filter((r) => r.date.slice(0, 10) === todayIso)
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
          // No purchase-invoice endpoint on this backend.
          purchases_count: 0,
          purchases_amount: 0,
        },
        // No ZRA e-invoicing gateway endpoint on this backend.
        zra: { signedInvoices: zeroStat(), totalSale: zeroStat(), totalTax: zeroStat() },
        // No banking endpoint on this backend.
        banks: [],
        salesBreakdown,
        // No purchase-invoice endpoint on this backend.
        purchaseBreakdown: { draft_count: 0, validated_count: 0, total_amount: 0, paid_amount: 0 },
        monthly,
        months,
        period: { dateStart },
        legacyCounts: {
          salesOrders: zeroStat(stats.salesOrders?.total ?? 0),
          // No contract/proposal endpoint on this backend.
          contracts: zeroStat(),
          shipments: zeroStat(stats.salesOrders?.shipped ?? 0),
          quotationsCount: 0,
        },
        recentSales,
        salesByCurrency: stats.total_revenue > 0 ? [{ currency: stats.currency, total: stats.total_revenue }] : [],
      }
    },
    staleTime: 1000 * 60,
  })
}
