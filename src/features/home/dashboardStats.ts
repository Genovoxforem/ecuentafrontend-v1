import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface MonthPoint {
  month: number
  monthName: string
  count: number
  amount: number
}

export interface DashboardStatistics {
  total_revenue: number
  currency: string
  invoices: { total: number; paid: number; validated: number; unpaid: number; draft: number }
  customers: { total: number; prospects: number }
  products: { total: number; services: number }
  salesOrders: { total: number; shipped: number }
  chartData: {
    invoicesByMonth: MonthPoint[]
    invoicesByStatus: Array<{ status: number; label: string; count: number; amount: number }>
  }
}

interface DashboardResponse {
  success: boolean
  statistics: DashboardStatistics
}

// GET /api/dashboard/ — confirmed live. Shared by home.queries.ts and
// billing.queries.ts (both need the same invoice/customer/order counts);
// react-query dedupes the actual request across both by this query key.
export function useDashboardStatistics() {
  return useQuery({
    queryKey: ['dashboard', 'statistics'],
    queryFn: async (): Promise<DashboardStatistics> => {
      const { data } = await api.get<DashboardResponse>('/dashboard/')
      return data.statistics
    },
    staleTime: 1000 * 60,
  })
}
