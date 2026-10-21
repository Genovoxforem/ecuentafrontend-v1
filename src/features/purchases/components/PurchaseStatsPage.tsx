import { useMemo, useState } from 'react'
import { ChartPie } from 'lucide-react'
import { SalesStatsPage, type SalesStatsFilters } from '../../../shared/components/dashboard/SalesStatsPage'
import { useVendorOptions } from '../../customers/customerOptions'
import { useThirdPartyFormOptions } from '../../customers/thirdPartyOptions.queries'
import { usePurchaseSeriesStats } from '../seriesStats'

// Statistics by month / year for a purchase document type (vendor invoices, vendor proposals): the
// classic page's filters (third-party, third-party type, vendor category, created by) on the JSON series.
export function PurchaseStatsPage({ base, title, entityLabel }: { base: string; title: string; entityLabel: string }) {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [socid, setSocid] = useState('')
  const [typentId, setTypentId] = useState('')
  const [categId, setCategId] = useState('')
  const [userid, setUserid] = useState('')
  const [status, setStatus] = useState('')

  const { data: vendors } = useVendorOptions()
  const { data: options } = useThirdPartyFormOptions()
  const { data: stats, isLoading, refetch } = usePurchaseSeriesStats(base, Number(year), { socid, userid, typentId, categId })

  const vendorOptions = useMemo(() => (vendors ?? []).map((v) => ({ value: v.id, label: v.name })), [vendors])
  const filters: SalesStatsFilters = {
    thirdParty: { value: socid, onChange: setSocid, options: vendorOptions },
    thirdPartyType: { value: typentId, onChange: setTypentId, options: options?.thirdPartyTypes ?? [] },
    category: { value: categId, onChange: setCategId, options: options?.vendorCategories ?? [] },
    createdBy: { value: userid, onChange: setUserid, options: options?.salesReps ?? [] },
    // The statistics endpoints take no status filter.
    status: { value: status, onChange: setStatus, options: [] },
  }

  return <SalesStatsPage icon={ChartPie} title={title} entityLabel={entityLabel} stats={stats} isLoading={isLoading} year={year} onYearChange={setYear} filters={filters} onRefresh={() => refetch()} />
}
