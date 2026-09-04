import { useMemo, useState } from 'react'
import { ClipboardCheck, Loader2, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useUsersSummary } from '../../users/users.queries'
import { useMarkManualShiftAttendance } from '../payrollAttendance.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface RowState {
  present: boolean
  clockIn: string
  clockOut: string
}

// Real via payroll/shiftsmanual_ajax.php?saveAttendance=1 — see
// payrollAttendance.queries.ts's useMarkManualShiftAttendance, which now
// mirrors that endpoint's real bulk (index-keyed row list) shape. Attendance
// here is a single Present/Absent checkbox per row (not the 3-state
// Present/Absent/Permission of the regular Mark Attendance page) — matches
// what the real page's own Attendance column offers for special/holiday
// shifts.
export function ManualShiftAttendanceForm({ shiftId, title, sourcePath }: { shiftId: 3 | 4; title: string; sourcePath: string }) {
  const { data: users } = useUsersSummary()
  const mark = useMarkManualShiftAttendance()

  const [date, setDate] = useState(todayIso())
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
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
    return rowState[employeeId] ?? { present: true, clockIn: '08:00', clockOut: '17:00' }
  }
  function updateRow(employeeId: number, patch: Partial<RowState>) {
    setRowState((cur) => ({ ...cur, [employeeId]: { ...rowFor(employeeId), ...patch } }))
  }

  function handleSubmit() {
    if (rows.length === 0) return
    mark.mutate({
      shiftId,
      date,
      entries: rows.map((u) => {
        const r = rowFor(u.id)
        return { employeeId: u.id, present: r.present, clockIn: r.present ? r.clockIn : undefined, clockOut: r.present ? r.clockOut : undefined }
      }),
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ClipboardCheck size={20} className="text-brand" /> {title}
      </h2>
      <p className="text-xs text-text-faint italic">
        Backend page: <code className="font-mono">{sourcePath}</code>
      </p>

      <Card className="!h-auto">
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
                            <input
                              type="checkbox"
                              checked={r.present}
                              onChange={(e) => updateRow(u.id, { present: e.target.checked })}
                              title="Present"
                              className="accent-brand"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="time"
                              value={r.clockIn}
                              onChange={(e) => updateRow(u.id, { clockIn: e.target.value })}
                              disabled={!r.present}
                              className={`${inputCls} w-32`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="time"
                              value={r.clockOut}
                              onChange={(e) => updateRow(u.id, { clockOut: e.target.value })}
                              disabled={!r.present}
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
              disabled={rows.length === 0 || mark.isPending}
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
