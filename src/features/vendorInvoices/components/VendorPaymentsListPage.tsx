import { useMemo, useState } from 'react'
import { Flag } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney, formatDateTimeAmPm } from '../../../utils/format'
import { usePurchasePayments } from '../vendorPayments.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Real GET /api/purchase-payments/ data (see vendorPayments.queries.ts),
// against llx_paiementfourn. Defaults the report period to today, matching
// the legacy "Vendor Payments" page's own default (which genuinely shows
// no rows most days — payments cluster on the dates they were recorded).
export function VendorPaymentsListPage() {
  const { data, isLoading, isError } = usePurchasePayments()
  const [from, setFrom] = useState(todayIso())
  const [to, setTo] = useState(todayIso())
  const [applied, setApplied] = useState({ from: todayIso(), to: todayIso() })

  const rows = useMemo(() => data?.items ?? [], [data])
  const filtered = useMemo(() => {
    const fromDate = new Date(applied.from)
    const toDate = new Date(applied.to)
    toDate.setHours(23, 59, 59, 999)
    return rows.filter((r) => {
      const d = new Date(r.paymentDate)
      return !Number.isNaN(d.getTime()) && d >= fromDate && d <= toDate
    })
  }, [rows, applied])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Flag size={20} className="text-brand" /> Vendor Payments
      </h2>

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-faint mb-1">Report period</label>
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
              <span className="text-text-faint">-</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </div>
          </div>
          <button type="button" onClick={() => setApplied({ from, to })} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            View Report
          </button>
        </div>
      </Card>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Ref.Payment</th>
              <th className="font-medium px-4 py-2.5">Date</th>
              <th className="font-medium px-4 py-2.5">Third-Party</th>
              <th className="font-medium px-4 py-2.5">Type</th>
              <th className="font-medium px-4 py-2.5">Number</th>
              <th className="font-medium px-4 py-2.5">Account</th>
              <th className="font-medium px-4 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-text-faint italic">
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-danger">
                  Could not load vendor payments.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-text-faint italic">
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
                  <td className="px-4 py-3 text-text-muted">{r.paymentReference || '-'}</td>
                  <td className="px-4 py-3 text-text-muted">{r.accountLabel || '-'}</td>
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
