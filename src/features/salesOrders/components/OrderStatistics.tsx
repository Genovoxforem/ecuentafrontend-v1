import { ChartPie } from 'lucide-react'
import { SalesStatsPage } from '../../../shared/components/dashboard/SalesStatsPage'

export function OrderStatistics() {
  return <SalesStatsPage icon={ChartPie} title="Order's Statistics" entityLabel="Orders" />
}
