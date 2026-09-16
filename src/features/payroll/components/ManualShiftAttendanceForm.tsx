import { useMemo, useState } from 'react'
import { UsersRound, Loader2, RotateCcw, Search, Users, UserCheck, UserX, Clock } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useManualShiftAttendanceRows, useMarkManualShiftAttendance } from '../payrollAttendance.queries'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface RowState {
  present: boolean
  clockIn: string
  clockOut: string
}

function workingHours(clockIn: string, clockOut: string): string {
  const [inH, inM] = clockIn.split(':').map(Number)
  const [outH, outM] = clockOut.split(':').map(Number)
  if ([inH, inM, outH, outM].some((n) => Number.isNaN(n))) return '—'
  let minutes = outH * 60 + outM - (inH * 60 + inM)
  if (minutes < 0) minutes += 24 * 60
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function StatTile({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Users; color: IconColor }) {
  return (
    <Card className="!p-4 !flex-row items-center gap-3">
      <span className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="text-xl font-bold text-text! leading-tight mt-0.5">{value}</p>
      </div>
    </Card>
  )
}

// Real via payroll/shiftsmanual_ajax.php — see manualShiftAttendanceParser.ts's
// own top comment for both directions: ?enterAttendance=1 (read, scraped
// HTML — no JSON contract exists for it) supplies the real employee roster
// with real designation + the real per-row defaults (every employee starts
// pre-checked Present, 08:00–17:00 — this form has no "not yet marked"
// state per employee, it's a from-scratch sheet every search), and
// ?saveAttendance=1 (write, genuine JSON) is useMarkManualShiftAttendance.
// Attendance here is a single Present/Absent checkbox per row (not the
// 3-state Present/Absent/Permission of the regular Mark Attendance page) —
// matches what the real page's own Attendance column offers for
// special/holiday shifts. Present/Absent/Not Marked stat cards are a live
// tally of the current on-screen state (defaults + whatever the user has
// toggled), not a separate backend count — the real form has no other
// source for them, since every employee always starts "marked" present.
export function ManualShiftAttendanceForm({ shiftId, title, sourcePath }: { shiftId: 3 | 4; title: string; sourcePath: string }) {
  const [date, setDate] = useState(todayIso())
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [rowState, setRowState] = useState<Record<number, RowState>>({})
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const { data: allRows, isLoading, isError, error, refetch, isFetching } = useManualShiftAttendanceRows(shiftId, date, hasSearched)
  const mark = useMarkManualShiftAttendance()

  const subtitle = shiftId === 3 ? 'Mark and manage employee attendance for special shifts.' : 'Mark and manage employee attendance for holiday shifts.'

  const employeeOptions = useMemo(
    () => [{ value: '', label: 'All Employees' }, ...(allRows ?? []).map((r) => ({ value: String(r.employeeId), label: r.name }))],
    [allRows],
  )

  const visibleRows = useMemo(() => {
    const byEmployee = employeeFilter ? (allRows ?? []).filter((r) => String(r.employeeId) === employeeFilter) : (allRows ?? [])
    const q = search.trim().toLowerCase()
    return q ? byEmployee.filter((r) => r.name.toLowerCase().includes(q) || r.designation.toLowerCase().includes(q)) : byEmployee
  }, [allRows, employeeFilter, search])
  const pageRows = visibleRows.slice((page - 1) * perPage, page * perPage)

  function rowFor(r: { employeeId: number; present: boolean; clockIn: string; clockOut: string }): RowState {
    return rowState[r.employeeId] ?? { present: r.present, clockIn: r.clockIn, clockOut: r.clockOut }
  }
  function updateRow(employeeId: number, base: RowState, patch: Partial<RowState>) {
    setRowState((cur) => ({ ...cur, [employeeId]: { ...base, ...patch } }))
  }

  const activeRows = allRows ?? []
  const presentCount = activeRows.filter((r) => rowFor(r).present).length
  const absentCount = activeRows.length - presentCount

  function handleSearch() {
    setHasSearched(true)
    setPage(1)
    if (hasSearched) refetch()
  }
  function handleReset() {
    setDate(todayIso())
    setEmployeeFilter('')
    setSearch('')
    setRowState({})
    setPage(1)
  }
  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function handleSubmit() {
    if (activeRows.length === 0) return
    mark.mutate({
      shiftId,
      date,
      entries: activeRows.map((r) => {
        const s = rowFor(r)
        return { employeeId: r.employeeId, present: s.present, clockIn: s.present ? s.clockIn : undefined, clockOut: s.present ? s.clockOut : undefined }
      }),
    })
  }

  function getExportData() {
    return {
      headers: ['#', 'Employee', 'Designation', 'Attendance', 'Clock In', 'Clock Out', 'Working Hours'],
      rows: visibleRows.map((r, i) => {
        const s = rowFor(r)
        return [String(i + 1), r.name, r.designation, s.present ? 'Present' : 'Absent', s.present ? s.clockIn : '-', s.present ? s.clockOut : '-', s.present ? workingHours(s.clockIn, s.clockOut) : '-']
      }),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <UsersRound size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">{title}</h2>
            <p className="text-xs text-text-faint mt-0.5">{subtitle}</p>
            <p className="text-[11px] text-text-faint italic mt-0.5">
              Backend page: <code className="font-mono">{sourcePath}</code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
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
            onClick={handleSearch}
            disabled={isFetching}
            className="h-9 flex items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Search
          </button>
          <button type="button" onClick={handleReset} className="h-9 flex items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-text hover:bg-surface-hover">
            <RotateCcw size={14} /> Reset
          </button>
          {hasSearched && (
            <div className="ml-auto flex items-center gap-2">
              <TableExportButtons title={title} getExportData={getExportData} />
              {allRows && activeRows.length > 0 && (
                <button
                  type="button"
                  disabled={mark.isPending}
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:bg-neutral-bg disabled:text-text-faint"
                >
                  {mark.isPending ? <Loader2 size={14} className="animate-spin" /> : <UsersRound size={14} />} Mark Attendance
                </button>
              )}
            </div>
          )}
        </div>
        {(mark.isError || mark.isSuccess) && (
          <div className="flex justify-end">
            {mark.isError && <p className="text-sm text-danger">{mark.error instanceof Error ? mark.error.message : 'Failed to save.'}</p>}
            {mark.isSuccess && <p className="text-sm text-success-fg">Saved.</p>}
          </div>
        )}
      </div>

      {hasSearched && (
        <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-text-faint" />
            </div>
          )}
          {isError && (
            <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
              {error instanceof Error ? error.message : "Couldn't load attendance."}
            </Card>
          )}

          {allRows && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile label="Total Employees" value={activeRows.length} icon={Users} color="blue" />
                <StatTile label="Present" value={presentCount} icon={UserCheck} color="green" />
                <StatTile label="Absent" value={absentCount} icon={UserX} color="rose" />
                <StatTile label="Not Marked" value={0} icon={Clock} color="amber" />
              </div>

              <Card className="!p-0 overflow-hidden flex-1 min-h-0">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
                  <h3 className="font-semibold text-text!">Employee Attendance List</h3>
                  <div className="flex items-center gap-2">
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
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      placeholder="Search by employee name, ID or designation…"
                      className={`w-64 ${inputCls}`}
                    />
                  </div>
                </div>

                {visibleRows.length === 0 ? (
                  <p className="text-sm text-text-faint italic py-6 text-center">No employees match this search.</p>
                ) : (
                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                          <th className="font-medium px-3 py-2">#</th>
                          <th className="font-medium px-3 py-2">Employee</th>
                          <th className="font-medium px-3 py-2">Designation</th>
                          <th className="font-medium px-3 py-2">Attendance</th>
                          <th className="font-medium px-3 py-2">Clock In</th>
                          <th className="font-medium px-3 py-2">Clock Out</th>
                          <th className="font-medium px-3 py-2">Working Hours</th>
                          <th className="font-medium px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r, i) => {
                          const s = rowFor(r)
                          return (
                            <tr key={r.employeeId} className="border-b border-border last:border-0">
                              <td className="px-3 py-2 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                              <td className="px-3 py-2 text-text!">
                                <div className="flex items-center gap-2">
                                  <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${ICON_STYLES[avatarColorFor(r.name)]}`}>
                                    {initialsFor(r.name)}
                                  </span>
                                  {r.name}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-text-muted">{r.designation || '—'}</td>
                              <td className="px-3 py-2">
                                <label id={`present-${r.employeeId}`} className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                                  <input type="checkbox" checked={s.present} onChange={(e) => updateRow(r.employeeId, s, { present: e.target.checked })} className="accent-brand" />
                                  Present
                                </label>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="time"
                                  value={s.clockIn}
                                  onChange={(e) => updateRow(r.employeeId, s, { clockIn: e.target.value })}
                                  disabled={!s.present}
                                  className={`${inputCls} w-32`}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="time"
                                  value={s.clockOut}
                                  onChange={(e) => updateRow(r.employeeId, s, { clockOut: e.target.value })}
                                  disabled={!s.present}
                                  className={`${inputCls} w-32`}
                                />
                              </td>
                              <td className="px-3 py-2 text-text-muted whitespace-nowrap">{s.present ? workingHours(s.clockIn, s.clockOut) : '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.present ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>
                                  {s.present ? 'Present' : 'Absent'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {hasSearched && allRows && <ListPagination page={page} perPage={perPage} total={visibleRows.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
