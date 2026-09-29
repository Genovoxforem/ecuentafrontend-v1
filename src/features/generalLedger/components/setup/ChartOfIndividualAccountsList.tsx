import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, AlertTriangle, Search, Pencil, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { useSubaccounts, useToggleSubaccountReconcilable } from '../../chartOfIndividualAccounts.queries'
import { ROUTES } from '../../../../routes'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

const TYPE_BADGE_CLS: Record<string, string> = {
  Customer: 'text-info-fg',
  Supplier: 'text-brand',
  Vendor: 'text-brand',
  Employee: 'text-violet-500',
}

// accountancy/admin/subaccount.php — real, read-only union of customer/
// supplier/employee subsidiary-ledger accounts (see
// chartOfIndividualAccountsParser.ts's own header comment for the real
// row shape). The Reconcilable toggle is wired to the exact already-
// tokened GET link scraped off each row — not fabricated. Type/Action both
// route to this app's own native CustomerDetail page (by the real socid
// parsed off each row) instead of linking out to the legacy third-party
// card — that page already has a real, working Edit mode
// (useUpdateCustomer), so there was no need to leave the app at all.
export function ChartOfIndividualAccountsList() {
  const { data: rows, isLoading, isError, error, refetch } = useSubaccounts()
  const toggle = useToggleSubaccountReconcilable()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filteredRows = useMemo(() => {
    const all = rows ?? []
    const q = search.trim().toLowerCase()
    return all.filter((r) => {
      if (typeFilter && r.type !== typeFilter) return false
      if (!q) return true
      return r.accountNumber.toLowerCase().includes(q) || r.label.toLowerCase().includes(q)
    })
  }, [rows, search, typeFilter])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Users size={20} className="text-brand" /> Chart Of Individual Accounts Of The Subsidiary Ledger
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-warning-bg/50 border-warning/40">
        <AlertTriangle size={15} className="text-warning-fg mt-0.5 shrink-0" />
        <p className="text-xs text-warning-fg">
          Warning, you can't create directly a sub account, you must create a third party or an user and assign them an accounting code to find them in this list.
        </p>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search account or label…"
              className={`${inputCls} pl-8 w-64`}
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`${inputCls} appearance-none`}>
            <option value="">All types</option>
            <option value="Customer">Customer</option>
            <option value="Supplier">Supplier</option>
            <option value="Employee">Employee</option>
          </select>
          {rows && <span className="ml-auto text-xs text-text-faint">{filteredRows.length.toLocaleString()} accounts</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-3 py-2 whitespace-nowrap">Account Number</th>
                <th className="font-medium px-3 py-2 whitespace-nowrap">Label</th>
                <th className="font-medium px-3 py-2 text-center whitespace-nowrap">Type</th>
                <th className="font-medium px-3 py-2 text-center whitespace-nowrap">Reconcilable</th>
                <th className="font-medium px-3 py-2 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-text-faint">
                    <Loader2 size={16} className="inline animate-spin" /> Loading…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-danger">
                    {error instanceof Error ? error.message : "Couldn't load the list."}{' '}
                    <button type="button" onClick={() => refetch()} className="underline">
                      Retry
                    </button>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-text-faint italic">
                    No Data Available In Table
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => (
                  <tr key={`${r.accountNumber}-${i}`} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-text!">{r.accountNumber}</td>
                    <td className="px-3 py-2 text-text-muted">{r.label}</td>
                    <td className="px-3 py-2 text-center">
                      {r.socid ? (
                        <Link to={ROUTES.customerDetail.replace(':id', r.socid)} className={`hover:underline font-medium ${TYPE_BADGE_CLS[r.type] ?? 'text-text-muted'}`}>
                          {r.type}
                        </Link>
                      ) : (
                        <span className="text-text-muted">{r.type || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        disabled={!r.toggleUrl || toggle.isPending}
                        onClick={() => r.toggleUrl && toggle.mutate(r.toggleUrl)}
                        title={r.reconcilable ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                        className={`inline-flex items-center justify-center disabled:opacity-40 ${r.reconcilable ? 'text-brand' : 'text-text-faint'} hover:text-brand`}
                      >
                        {r.reconcilable ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.socid ? (
                        <Link
                          to={ROUTES.customerDetail.replace(':id', r.socid)}
                          title="Edit this third-party's record — sub account edits actually happen there, not on this page"
                          className="inline-flex items-center justify-center text-text-muted hover:text-brand"
                        >
                          <Pencil size={14} />
                        </Link>
                      ) : (
                        <Pencil size={14} className="inline-block text-text-faint opacity-40" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
