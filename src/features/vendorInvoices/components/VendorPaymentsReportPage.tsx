import { useMemo, useState } from 'react'
import { FileBarChart2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney, formatDateTimeAmPm } from '../../../utils/format'
import { usePurchasePayments } from '../vendorPayments.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none appearance-none'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Real GET /api/purchase-payments/ data (see vendorPayments.queries.ts),
// grouped client-side by month/year — mirrors the customer-side
// PaymentsReportPage.tsx exactly (see that file's own comment): this
// backend has no per-period report endpoint of its own (the legacy page's
// "Create" button actually generates a PDF via pdf_paiement_fourn.class.php,
// which has no REST equivalent), so the same real rows the Vendor Payments
// list already fetches are grouped here instead.
export function VendorPaymentsReportPage() {
  const { data, isLoading } = usePurchasePayments()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [applied, setApplied] = useState({ month: now.getMonth(), year: now.getFullYear() })

  const rows = useMemo(() => data?.items ?? [], [data])
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const d = new Date(r.paymentDate)
        return !Number.isNaN(d.getTime()) && d.getMonth() === applied.month && d.getFullYear() === applied.year
      }),
    [rows, applied],
  )
  const total = filtered.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileBarChart2 size={20} className="text-brand" /> Payments reports for {applied.year}
      </h2>

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectCls}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setApplied({ month, year })} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            Create
          </button>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-4 py-3">
        <span className="text-sm text-text-muted">
          Total paid in {MONTHS[applied.month]} {applied.year}
        </span>
        <span className="text-lg font-bold text-text!">{formatMoney(total)} ZMW</span>
      </div>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Ref.Payment</th>
              <th className="font-medium px-4 py-2.5">Date</th>
              <th className="font-medium px-4 py-2.5">Third-Party</th>
              <th className="font-medium px-4 py-2.5">Type</th>
              <th className="font-medium px-4 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-text-faint italic">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3 text-brand font-medium">{r.ref}</td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTimeAmPm(r.paymentDate)}</td>
                  <td className="px-4 py-3 text-text!">{r.thirdPartyName || '-'}</td>
                  <td className="px-4 py-3 text-text-muted">{r.paymentTypeLabel || '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text!">{formatMoney(r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
