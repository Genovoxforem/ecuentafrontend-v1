import { useState } from 'react'
import { FileText, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

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
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  function handleSearch() {
    setError('')
    if (!month) return setError('Select a month.')
    setHasSearched(true)
    setPage(1)
  }
  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  return (
    // -m-6/-mx-6/-top-6: same sticky-header pattern as ManualShiftAttendanceForm.tsx /
    // StickyFormShell.tsx — sticky's offset is measured from the scrolling ancestor's
    // padding edge, so the negative offsets compensate for AppShell main's own p-6 inset.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileText size={20} className="text-brand" /> Generate Payslip
        </h2>

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">payroll/payslip.php</code>. Its table reads real paid-payment records, but those are only ever created
            by Make Payment's write — deliberately left unbuilt there since its formula can't be reproduced honestly (see Make Payment's own banner) — so
            this list has no rows to show, and there's no "View" payslip to open.
          </p>
        </Card>

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
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {hasSearched && (
        <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4">
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
              <select
                value={perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                className="ml-auto text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
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
        </div>
      )}

      {hasSearched && <ListPagination page={page} perPage={perPage} total={0} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
