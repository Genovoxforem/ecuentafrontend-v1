import { useState } from 'react'
import { ChartPie } from 'lucide-react'
import { SalesStatsPage } from '../../../shared/components/dashboard/SalesStatsPage'
import { useOrderStats } from '../orderStats.queries'

export function OrderStatistics() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const { data: stats, isLoading } = useOrderStats(Number(year))
  return <SalesStatsPage icon={ChartPie} title="Order's Statistics" entityLabel="Orders" stats={stats} isLoading={isLoading} year={year} onYearChange={setYear} />
}
