import { useState } from 'react'
import { ChartPie } from 'lucide-react'
import { SalesStatsPage } from '../../../shared/components/dashboard/SalesStatsPage'
import { useQuotationStats } from '../quotationStats.queries'

export function QuotationStatistics() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const { data: stats, isLoading } = useQuotationStats(Number(year))
  return <SalesStatsPage icon={ChartPie} title="Quotation's Statistics" entityLabel="Quotations" stats={stats} isLoading={isLoading} year={year} onYearChange={setYear} />
}
