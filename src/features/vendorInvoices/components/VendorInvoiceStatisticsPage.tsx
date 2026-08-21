import { useMemo, useState } from 'react'
import { PieChart } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { formatMoney } from '../../../utils/format'
import { useVendorInvoices } from '../vendorInvoices.queries'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none appearance-none'

function pctChange(current: number, previous: number) {
  if (!previous) return 0
  return Math.round(((current - previous) / previous) * 100)
}

// Real GET /api/purchase-invoices/ data (see vendorInvoices.queries.ts),
// grouped client-side by year/month — mirrors the customer-side
// InvoiceStatisticsPage.tsx exactly (mode=supplier equivalent of that
// mode=customer legacy screen), since this backend has no per-month stats
// endpoint of its own for either side.
export function VendorInvoiceStatisticsPage() {
  const { data } = useVendorInvoices('all')
  const [thirdParty, setThirdParty] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))

  const rows = useMemo(() => data?.items ?? [], [data])
  const thirdPartyOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.thirdPartyName).filter((n): n is string => Boolean(n)))).map((n) => ({ value: n, label: n })),
    [rows],
  )
  const filteredRows = useMemo(() => (thirdParty ? rows.filter((r) => r.thirdPartyName === thirdParty) : rows), [rows, thirdParty])

  const byYear = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>()
    for (const r of filteredRows) {
      const y = r.invoiceDate?.slice(0, 4)
      if (!y) continue
      const cur = map.get(y) ?? { count: 0, amount: 0 }
      cur.count += 1
      cur.amount += r.amountTtc
      map.set(y, cur)
    }
    return map
  }, [filteredRows])

  const years = useMemo(() => Array.from(byYear.keys()).sort().reverse(), [byYear])
  const current = byYear.get(year) ?? { count: 0, amount: 0 }
  const previous = byYear.get(String(Number(year) - 1)) ?? { count: 0, amount: 0 }
  const avgAmount = current.count ? current.amount / current.count : 0
  const prevAvg = previous.count ? previous.amount / previous.count : 0

  const byMonthCount = useMemo(() => {
    const counts = Array(12).fill(0)
    for (const r of filteredRows) {
      if (r.invoiceDate?.slice(0, 4) === year) counts[new Date(r.invoiceDate).getMonth()] += 1
    }
    return counts
  }, [filteredRows, year])

  const byMonthAmount = useMemo(() => {
    const amounts = Array(12).fill(0)
    for (const r of filteredRows) {
      if (r.invoiceDate?.slice(0, 4) === year) amounts[new Date(r.invoiceDate).getMonth()] += r.amountTtc
    }
    return amounts
  }, [filteredRows, year])

  const maxCount = Math.max(1, ...byMonthCount)
  const maxAmount = Math.max(1, ...byMonthAmount)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PieChart size={20} className="text-brand" /> Statistics
      </h2>

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-56">
            <label className="block text-xs text-text-faint mb-1">Third-party</label>
            <SearchableSelect value={thirdParty} onChange={setThirdParty} options={thirdPartyOptions} placeholder="All third parties" />
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
              {(years.length ? years : [year]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2">Year</th>
              <th className="font-medium py-2 text-right">No. Of Invoices</th>
              <th className="font-medium py-2 text-right">%</th>
              <th className="font-medium py-2 text-right">Total Amount</th>
              <th className="font-medium py-2 text-right">%</th>
              <th className="font-medium py-2 text-right">Average Amount</th>
              <th className="font-medium py-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 text-brand font-medium">{year}</td>
              <td className="py-2 text-right tabular-nums">{current.count}</td>
              <td className="py-2 text-right tabular-nums text-success">{pctChange(current.count, previous.count)}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(current.amount)}</td>
              <td className="py-2 text-right tabular-nums text-success">{pctChange(current.amount, previous.amount)}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(avgAmount)}</td>
              <td className="py-2 text-right tabular-nums text-success">{pctChange(avgAmount, prevAvg)}</td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-sm font-semibold text-brand mb-3">No. of invoices per month</h3>
            <div className="flex items-end gap-2 h-40 border-l border-b border-border pl-2 pb-1">
              {MONTHS.map((m, i) => (
                <div key={m} className="flex-1 flex flex-col items-center justify-end h-full" title={`${m}: ${byMonthCount[i]}`}>
                  <span className="text-[10px] text-text-muted mb-0.5">{byMonthCount[i] > 0 ? byMonthCount[i] : ''}</span>
                  <div className="w-full bg-brand rounded-t-sm" style={{ height: byMonthCount[i] === 0 ? 0 : `${Math.max(4, (byMonthCount[i] / maxCount) * 100)}%` }} />
                  <span className="text-[10px] text-text-faint mt-1">{m}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-brand mb-3">Amount of invoices by month (net of tax)</h3>
            <div className="flex items-end gap-2 h-40 border-l border-b border-border pl-2 pb-1">
              {MONTHS.map((m, i) => (
                <div key={m} className="flex-1 flex flex-col items-center justify-end h-full" title={`${m}: ${formatMoney(byMonthAmount[i])}`}>
                  <div className="w-full bg-violet-500 rounded-t-sm" style={{ height: byMonthAmount[i] === 0 ? 0 : `${Math.max(4, (byMonthAmount[i] / maxAmount) * 100)}%` }} />
                  <span className="text-[10px] text-text-faint mt-1">{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
