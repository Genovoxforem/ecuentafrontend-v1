import { useMemo, useState } from 'react'
import { Loader2, Search, Wallet } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { ListPagination } from '../../../shared/components/ListPagination'
import { useUsersSummary } from '../../users/users.queries'
import { useSaveManualShiftAmounts } from '../payrollActions.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function currentMonthIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type Method = 'Amount' | 'Percentage'
interface RowState {
  method: Method
  amount: string
}

// Real via payroll/shiftsmanual_ajax.php?saveshift=1 — see
// payrollActions.queries.ts's useSaveManualShiftAmounts, a genuine JSON
// write (unlike this page's own row-list source, entershifts=1, which
// renders an HTML fragment — not scraped here; the row list below is built
// from the real user list instead, same approach as Mark Attendance.
export function ShiftSalarySearchForm({
  title,
  sourcePath,
  shiftId,
  unitLabel,
}: {
  title: string
  sourcePath: string
  shiftId: 3 | 4
  unitLabel: string
}) {
  const { data: users } = useUsersSummary()
  const save = useSaveManualShiftAmounts()

  const [month, setMonth] = useState(currentMonthIso())
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [rowState, setRowState] = useState<Record<number, RowState>>({})
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const employeeOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...(users?.users ?? []).map((u) => ({ value: String(u.id), label: u.name || u.login }))],
    [users],
  )

  const rows = useMemo(() => {
    if (!hasSearched) return []
    const all = users?.users ?? []
    const byEmployee = employeeFilter ? all.filter((u) => String(u.id) === employeeFilter) : all
    const q = search.trim().toLowerCase()
    return q ? byEmployee.filter((u) => (u.name || u.login).toLowerCase().includes(q)) : byEmployee
  }, [users, hasSearched, employeeFilter, search])

  const pageRows = rows.slice((page - 1) * perPage, page * perPage)

  function handleSearch() {
    setHasSearched(true)
    setPage(1)
  }
  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function rowFor(employeeId: number): RowState {
    return rowState[employeeId] ?? { method: 'Amount', amount: '' }
  }
  function updateRow(employeeId: number, patch: Partial<RowState>) {
    setRowState((cur) => ({ ...cur, [employeeId]: { ...rowFor(employeeId), ...patch } }))
  }

  function handleSubmit() {
    setError('')
    if (!month) return setError('Select a shift month.')
    const entries = rows
      .map((u) => ({ employeeId: u.id, ...rowFor(u.id) }))
      .filter((r) => r.amount.trim() !== '')
      .map((r) => ({ employeeId: r.employeeId, method: r.method, amount: r.amount }))
    if (entries.length === 0) return setError('Enter an amount for at least one employee.')
    save.mutate({ shiftId, month, entries }, { onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') })
  }

  return (
    // -m-6/-mx-6/-top-6/-bottom-6: same sticky-header/footer pattern as
    // ManualShiftAttendanceForm.tsx / StickyFormShell.tsx — sticky's offset is
    // measured from the scrolling ancestor's padding edge, so the negative
    // offsets compensate for AppShell main's own p-6 inset.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Wallet size={20} className="text-brand" /> {title}
          </h2>
          <p className="text-xs text-text-faint italic mt-0.5">
            Backend page: <code className="font-mono">{sourcePath}</code>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-danger mb-1">Shift Month *</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Entity *</label>
            <input value="Master entity" disabled className={`w-full ${inputCls} cursor-not-allowed opacity-70`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Employee *</label>
            <SearchableSelect value={employeeFilter} onChange={setEmployeeFilter} options={employeeOptions} placeholder="All" />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="h-9 flex items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      {hasSearched && (
        <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4">
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search By Employee"
                className={`w-64 ${inputCls}`}
              />
              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={perPage}
                  onChange={(e) => handlePerPageChange(Number(e.target.value))}
                  className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={rows.length === 0 || save.isPending}
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:bg-neutral-bg disabled:text-text-faint"
                >
                  {save.isPending && <Loader2 size={14} className="animate-spin" />} Save
                </button>
              </div>
            </div>
            {(error || save.isSuccess) && (
              <div className="px-3 pt-2">
                {error && <p className="text-sm text-danger">{error}</p>}
                {save.isSuccess && <p className="text-sm text-success-fg">Saved.</p>}
              </div>
            )}

            {rows.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">No employees match this search.</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">SI.No</th>
                      <th className="font-medium px-3 py-2">Employee</th>
                      <th className="font-medium px-3 py-2">Designation</th>
                      <th className="font-medium px-3 py-2">Amount/Percentage Method</th>
                      <th className="font-medium px-3 py-2">Amount/Percentage ({unitLabel})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((u, i) => {
                      const r = rowFor(u.id)
                      return (
                        <tr key={u.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                          <td className="px-3 py-2 text-text!">{u.name || u.login}</td>
                          <td className="px-3 py-2 text-text-muted">{u.designation || '—'}</td>
                          <td className="px-3 py-2">
                            <select value={r.method} onChange={(e) => updateRow(u.id, { method: e.target.value as Method })} className={`${inputCls} w-36`}>
                              <option value="Amount">Amount</option>
                              <option value="Percentage">Percentage</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={r.amount}
                              onChange={(e) => updateRow(u.id, { amount: e.target.value })}
                              inputMode="decimal"
                              placeholder="0.00"
                              className={`${inputCls} w-32`}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {hasSearched && <ListPagination page={page} perPage={perPage} total={rows.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
