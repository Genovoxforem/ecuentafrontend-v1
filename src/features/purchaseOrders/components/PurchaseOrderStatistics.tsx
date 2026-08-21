import { useState } from 'react'
import { ChartPie } from 'lucide-react'
import { SalesStatsPage } from '../../../shared/components/dashboard/SalesStatsPage'
import { usePurchaseOrderStats } from '../purchaseOrderStats.queries'

export function PurchaseOrderStatistics() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const { data: stats, isLoading } = usePurchaseOrderStats(Number(year))
  return <SalesStatsPage icon={ChartPie} title="Purchase order statistics" entityLabel="Orders" stats={stats} isLoading={isLoading} year={year} onYearChange={setYear} />
}
