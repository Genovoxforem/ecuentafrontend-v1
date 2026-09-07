import { useState } from 'react'
import { FileText, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// payroll/payslip.php's own table is server-rendered PHP over
// llx_payroll_paid_payments (real query, read directly — no JSON API), and
// its "View" payslip detail comes from a second HTML-fragment endpoint
// (ajax_search2.php). Beyond not scraping either: llx_payroll_paid_payments
// is only ever populated by payroll/ajax.php?savePayment (Make Payment's
// write) — deliberately left unbuilt there since its own formula chains
// attendance + advance/loan + allowances + PAYE in a way that can't be
// reproduced honestly (see MakePaymentForm.tsx). So this table has no real
// rows to show either way; a "View" payslip modal would have nothing that
// could ever open it, so it isn't built here.
export function GeneratePayslipForm() {
  const [month, setMonth] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')

  function handleSearch() {
    setError('')
    if (!month) return setError('Select a month.')
    setHasSearched(true)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileText size={20} className="text-brand" /> Generate Payslip
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/payslip.php</code>. Its table reads real paid-payment records, but those are only ever created
          by Make Payment's write — deliberately left unbuilt there since its formula can't be reproduced honestly (see Make Payment's own banner) — so this
          list has no rows to show, and there's no "View" payslip to open.
        </p>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-danger mb-1">Select Month *</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Select Entity *</label>
            <input value="Master entity" disabled className={`w-full ${inputCls} cursor-not-allowed opacity-70`} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleSearch} className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setMonth('')
                setHasSearched(false)
                setError('')
              }}
              className="h-9 rounded-md border border-input-border px-4 text-sm font-medium text-text-muted hover:bg-surface-hover"
            >
              Clear
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
      </Card>

      {hasSearched && (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Employee Name</th>
                  <th className="font-medium px-3 py-2">Month</th>
                  <th className="font-medium px-3 py-2">Date Of Paid</th>
                  <th className="font-medium px-3 py-2">Salary Type</th>
                  <th className="font-medium px-3 py-2">Basic Salary</th>
                  <th className="font-medium px-3 py-2">Net Salary</th>
                  <th className="font-medium px-3 py-2">Paid Amount</th>
                  <th className="font-medium px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-text-faint italic">
                    No Data Available In Table
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
