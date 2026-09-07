import { useMemo, useState } from 'react'
import { ClipboardCheck, Loader2, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useMarkAttendance } from '../payrollAttendance.queries'
import { useUsersSummary } from '../../users/users.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type Status = 'Present' | 'Absent' | 'Permission'
const STATUS_LABELS: Record<Status, string> = { Present: 'P', Absent: 'A', Permission: 'Pm' }
interface RowState {
  status: Status
  clockIn: string
  clockOut: string
}

// Real via payroll/saveAttendance.php — confirmed genuine JSON write, but
// with its own hasRight('payroll','award_obj','read') check commented out
// server-side (a live, reachable, unauthenticated write endpoint — a real
// bug, reported not fixed per frontend-only scope). Matches the real page's
// bulk-table shape — payrollAttendance.queries.ts's useMarkAttendance takes
// one entry per employee in a single request, same as the real endpoint's
// own bracket-keyed design. The one simplification left is Shift: a single
// numeric ID applied to every submitted row here, since no real JSON source
// for shift names/llx_payroll_shifts (or each employee's assigned shift)
// was found in this module's audit.
export function MarkAttendance() {
  const { data: users } = useUsersSummary()
  const mark = useMarkAttendance()

  const [date, setDate] = useState(todayIso())
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [shiftId, setShiftId] = useState('')
  const [rowState, setRowState] = useState<Record<number, RowState>>({})

  const employeeOptions = useMemo(
    () => [{ value: '', label: 'All Employees' }, ...(users?.users ?? []).map((u) => ({ value: String(u.id), label: u.name || u.login }))],
    [users],
  )

  const rows = useMemo(() => {
    if (!hasSearched) return []
    const all = users?.users ?? []
    const byEmployee = employeeFilter ? all.filter((u) => String(u.id) === employeeFilter) : all
    const q = search.trim().toLowerCase()
    return q ? byEmployee.filter((u) => (u.name || u.login).toLowerCase().includes(q)) : byEmployee
  }, [users, hasSearched, employeeFilter, search])

  function rowFor(employeeId: number): RowState {
    return rowState[employeeId] ?? { status: 'Present', clockIn: '08:00', clockOut: '17:00' }
  }
  function updateRow(employeeId: number, patch: Partial<RowState>) {
    setRowState((cur) => ({ ...cur, [employeeId]: { ...rowFor(employeeId), ...patch } }))
  }

  function handleSubmit() {
    if (!shiftId || rows.length === 0) return
    mark.mutate({
      date,
      entries: rows.map((u) => {
        const r = rowFor(u.id)
        return {
          employeeId: u.id,
          shiftId: Number(shiftId),
          status: r.status,
          clockIn: r.status === 'Present' ? r.clockIn : undefined,
          clockOut: r.status === 'Present' ? r.clockOut : undefined,
        }
      }),
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ClipboardCheck size={20} className="text-brand" /> Payroll - Attendance
      </h2>

      <Card className="!h-auto space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-danger mb-1">Attendance Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Entity *</label>
            <input value="All Entity" disabled className={`w-full ${inputCls} cursor-not-allowed opacity-70`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Employee *</label>
            <SearchableSelect value={employeeFilter} onChange={setEmployeeFilter} options={employeeOptions} placeholder="All Employees" />
          </div>
          <button
            type="button"
            onClick={() => setHasSearched(true)}
            className="h-9 flex items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Search size={14} /> Search
          </button>
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">
            Shift ID <span className="italic">(applied to every row below — no real shift-name source was found)</span>
          </label>
          <input value={shiftId} onChange={(e) => setShiftId(e.target.value)} placeholder="llx_payroll_shifts.id" className={`w-full sm:w-64 ${inputCls}`} />
        </div>
      </Card>

      {hasSearched && (
        <>
          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="p-3 border-b border-border">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search By Employee" className={`w-full ${inputCls}`} />
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">No employees match this search.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">SI.No</th>
                      <th className="font-medium px-3 py-2">Employee</th>
                      <th className="font-medium px-3 py-2">Designation</th>
                      <th className="font-medium px-3 py-2">Attendance</th>
                      <th className="font-medium px-3 py-2">Clock In</th>
                      <th className="font-medium px-3 py-2">Clock Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-sm font-semibold text-brand bg-brand/5">
                        Master Entity
                      </td>
                    </tr>
                    {rows.map((u, i) => {
                      const r = rowFor(u.id)
                      return (
                        <tr key={u.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-text-muted">{i + 1}</td>
                          <td className="px-3 py-2 text-text!">{u.name || u.login}</td>
                          <td className="px-3 py-2 text-text-muted">{u.designation || '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-3">
                              {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                                <label key={s} className="flex items-center gap-1 text-xs text-text-muted cursor-pointer" title={s}>
                                  <input type="checkbox" checked={r.status === s} onChange={() => updateRow(u.id, { status: s })} className="accent-brand" />
                                  {STATUS_LABELS[s]}
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="time"
                              value={r.clockIn}
                              onChange={(e) => updateRow(u.id, { clockIn: e.target.value })}
                              disabled={r.status !== 'Present'}
                              className={`${inputCls} w-32`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="time"
                              value={r.clockOut}
                              onChange={(e) => updateRow(u.id, { clockOut: e.target.value })}
                              disabled={r.status !== 'Present'}
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!shiftId || rows.length === 0 || mark.isPending}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:bg-neutral-bg disabled:text-text-faint"
            >
              {mark.isPending && <Loader2 size={14} className="animate-spin" />} Mark Attendance
            </button>
            {mark.isError && <p className="text-sm text-danger">{mark.error instanceof Error ? mark.error.message : 'Failed to save.'}</p>}
            {mark.isSuccess && <p className="text-sm text-success-fg">Saved.</p>}
          </div>
        </>
      )}
    </div>
  )
}
