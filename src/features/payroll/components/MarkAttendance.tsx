import { useMemo, useState } from 'react'
import { UsersRound, Loader2, RotateCcw, Search, Users, UserCheck, UserX, Clock } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import {
  useMarkAttendanceRows,
  useMarkAttendance,
  useAssignShiftOptions,
  useAssignShift,
  type MarkAttendanceEntry,
} from '../payrollAttendance.queries'
import type { MarkAttendanceRow, AssignableAttendanceRow } from '../markAttendanceParser'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type Decision = 'Present' | 'Absent' | 'Permission'
type HalfDay = 'Full Day' | 'Fore Noon' | 'After Noon'

// Every field here starts genuinely blank — confirmed live (see
// markAttendanceParser.ts's top comment): unlike the Special/Holiday Shift
// form, this real page never defaults an employee to Present.
interface RowState {
  decision: Decision | null
  clockIn: string
  clockOut: string
  absenceReasonId: string
  halfDay: HalfDay | null
  permissionFrom: string
  permissionTo: string
}

function emptyRowState(defaults: { clockIn: string; clockOut: string }): RowState {
  return { decision: null, clockIn: defaults.clockIn, clockOut: defaults.clockOut, absenceReasonId: '', halfDay: null, permissionFrom: '', permissionTo: '' }
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

// Real "Assign Shift" side panel — the actual fix for a row showing "not
// mapped in shift" (see markAttendanceParser.ts). Opens pre-filled with the
// clicked employee, real shift options (llx_payroll_shifts, scraped from
// the real page since there's no JSON list for them), and a start/end date
// range; submits via the real payroll/ajax_search.php?assignshift=1
// endpoint (useAssignShift).
function AssignShiftPanel({ employeeId, employeeName, onClose, onAssigned }: { employeeId: number; employeeName: string; onClose: () => void; onAssigned: () => void }) {
  const { data: shiftOptions, isLoading } = useAssignShiftOptions()
  const assign = useAssignShift()
  const [shiftId, setShiftId] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(todayIso())

  function handleSubmit() {
    if (!shiftId || !startDate || !endDate) return
    assign.mutate(
      { employeeId, shiftId, startDate, endDate },
      {
        onSuccess: () => {
          onAssigned()
          onClose()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-surface border-l border-border p-5 space-y-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Assign Shift</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            ✕
          </button>
        </div>
        <p className="text-sm text-text-muted">
          Employee: <span className="font-medium text-text!">{employeeName}</span>
        </p>
        <div>
          <label className="block text-xs text-danger mb-1">Select Shift *</label>
          <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} className={`w-full ${inputCls}`}>
            <option value="">{isLoading ? 'Loading…' : 'Select shift'}</option>
            {(shiftOptions ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-danger mb-1">Start Date *</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`w-full ${inputCls}`} />
        </div>
        <div>
          <label className="block text-xs text-danger mb-1">End Date *</label>
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={`w-full ${inputCls}`} />
        </div>
        {assign.isError && <p className="text-sm text-danger">{assign.error instanceof Error ? assign.error.message : 'Failed to assign shift.'}</p>}
        <button
          type="button"
          disabled={!shiftId || !startDate || !endDate || assign.isPending}
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {assign.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Submit
        </button>
      </div>
    </div>
  )
}

// Real via payroll/mark_attendance_ajax.php (read) + payroll/saveAttendance.php
// (write, genuine JSON) — see payrollAttendance.queries.ts's own comments
// on both, and markAttendanceParser.ts for the full real row shape this
// page turned out to have: every employee row is either not editable at
// all (no shift mapped for the date — fixable right here via the real
// "Assign Shift" panel) or a genuine Present/Absent/Permission decision
// that starts completely blank, with Absent revealing a real reason +
// half-day picker and Permission a real from/to time range — none of which
// the previous pass of this page captured (it read from the wrong real
// endpoint, attendance_rip_ajax.php, which backs the separate Attendance
// Report page instead).
export function MarkAttendance() {
  const [date, setDate] = useState(todayIso())
  const [entityType, setEntityType] = useState('All')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [rowState, setRowState] = useState<Record<number, RowState>>({})
  const [assignShiftFor, setAssignShiftFor] = useState<{ employeeId: number; name: string } | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const { data, isLoading, isError, error, refetch, isFetching } = useMarkAttendanceRows(date, entityType, hasSearched)
  const mark = useMarkAttendance()

  const allRows = useMemo(() => data?.rows ?? [], [data])
  const reasonOptions = data?.reasonOptions ?? []

  const employeeOptions = useMemo(() => [{ value: '', label: 'All Employees' }, ...allRows.map((r) => ({ value: String(r.employeeId), label: r.name }))], [allRows])

  const visibleRows = useMemo(() => {
    const byEmployee = employeeFilter ? allRows.filter((r) => String(r.employeeId) === employeeFilter) : allRows
    const q = search.trim().toLowerCase()
    return q ? byEmployee.filter((r) => r.name.toLowerCase().includes(q) || r.designation.toLowerCase().includes(q)) : byEmployee
  }, [allRows, employeeFilter, search])
  const pageRows = visibleRows.slice((page - 1) * perPage, page * perPage)

  function rowFor(r: AssignableAttendanceRow): RowState {
    return rowState[r.employeeId] ?? emptyRowState(r)
  }
  function updateRow(employeeId: number, base: RowState, patch: Partial<RowState>) {
    setRowState((cur) => ({ ...cur, [employeeId]: { ...base, ...patch } }))
  }
  function chooseDecision(r: AssignableAttendanceRow, decision: Decision) {
    const base = rowFor(r)
    updateRow(r.employeeId, base, { ...emptyRowState(r), decision: base.decision === decision ? null : decision })
  }

  const assignableRows = allRows.filter((r): r is AssignableAttendanceRow => r.kind === 'assignable')
  const presentCount = assignableRows.filter((r) => rowFor(r).decision === 'Present').length
  const absentCount = assignableRows.filter((r) => rowFor(r).decision === 'Absent').length
  const permissionCount = assignableRows.filter((r) => rowFor(r).decision === 'Permission').length
  const notMarkedCount = assignableRows.length - presentCount - absentCount - permissionCount

  function handleSearch() {
    setHasSearched(true)
    setPage(1)
    if (hasSearched) refetch()
  }
  function handleReset() {
    setDate(todayIso())
    setEntityType('All')
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
    const decided = assignableRows.filter((r) => rowFor(r).decision !== null)
    if (decided.length === 0) return
    const entries: MarkAttendanceEntry[] = decided.map((r) => {
      const s = rowFor(r)
      return {
        employeeId: r.employeeId,
        shiftId: r.shiftId,
        status: s.decision as Decision,
        clockIn: s.decision === 'Present' ? s.clockIn : undefined,
        clockOut: s.decision === 'Present' ? s.clockOut : undefined,
        absenceReasonId: s.decision === 'Absent' ? s.absenceReasonId : undefined,
        halfDay: s.decision === 'Absent' ? (s.halfDay ?? undefined) : undefined,
        permissionFrom: s.decision === 'Permission' ? s.permissionFrom : undefined,
        permissionTo: s.decision === 'Permission' ? s.permissionTo : undefined,
        attendanceId: r.attendanceId,
        holidayTblId: r.holidayTblId,
        requestedLeave: r.requestedLeave,
      }
    })
    mark.mutate({ date, entries })
  }

  function getExportData() {
    return {
      headers: ['#', 'Employee', 'Designation', 'Attendance', 'Clock In', 'Clock Out'],
      rows: visibleRows.map((r, i) => {
        if (r.kind === 'unmapped') return [String(i + 1), r.name, r.designation, r.message, '-', '-']
        const s = rowFor(r)
        return [String(i + 1), r.name, r.designation, s.decision ?? 'Not Marked', s.decision === 'Present' ? s.clockIn : '-', s.decision === 'Present' ? s.clockOut : '-']
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
            <h2 className="text-lg font-bold text-text!">Payroll - Attendance</h2>
            <p className="text-xs text-text-faint mt-0.5">View and manage employee attendance, clock in/out time and working hours.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-danger mb-1">Attendance Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Entity *</label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className={inputCls}>
              <option value="All">All Entity</option>
              <option value="1">Master entity</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Employee *</label>
            <SearchableSelect value={employeeFilter} onChange={setEmployeeFilter} options={employeeOptions} placeholder="All Employees" />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={isFetching}
            className="h-9 flex items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Search
          </button>
          <button type="button" onClick={handleReset} className="h-9 flex items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-text hover:bg-surface-hover">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {hasSearched && (
        <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
          {isLoading && <LegacyLoadingCard label="Loading attendance…" />}
          {isError && <LegacyErrorCard title="Couldn't load attendance" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

          {data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile label="Total Employees" value={allRows.length} icon={Users} color="blue" />
                <StatTile label="Present" value={presentCount} icon={UserCheck} color="green" />
                <StatTile label="Absent" value={absentCount + permissionCount} icon={UserX} color="rose" />
                <StatTile label="Not Marked" value={notMarkedCount} icon={Clock} color="amber" />
              </div>

              <Card className="!p-0 overflow-hidden flex-1 min-h-0">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
                  <h3 className="font-semibold text-text!">Employee Attendance</h3>
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
                      placeholder="Search by employee name or designation…"
                      className={`w-64 ${inputCls}`}
                    />
                    <TableExportButtons title="Payroll Attendance" getExportData={getExportData} />
                    {assignableRows.length > 0 && (
                      <button
                        type="button"
                        disabled={mark.isPending || presentCount + absentCount + permissionCount === 0}
                        onClick={handleSubmit}
                        className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:bg-neutral-bg disabled:text-text-faint"
                      >
                        {mark.isPending ? <Loader2 size={14} className="animate-spin" /> : <UsersRound size={14} />} Mark Attendance
                      </button>
                    )}
                  </div>
                </div>
                {(mark.isError || mark.isSuccess) && (
                  <div className="px-3 pt-2">
                    {mark.isError && <p className="text-sm text-danger">{mark.error instanceof Error ? mark.error.message : 'Failed to save.'}</p>}
                    {mark.isSuccess && <p className="text-sm text-success-fg">Saved.</p>}
                  </div>
                )}

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
                          <th className="font-medium px-3 py-2 min-w-[16rem]">Attendance</th>
                          <th className="font-medium px-3 py-2">Clock In</th>
                          <th className="font-medium px-3 py-2">Clock Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r: MarkAttendanceRow, i) => (
                          <tr key={r.employeeId} className="border-b border-border last:border-0 align-top">
                            <td className="px-3 py-2.5 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                            <td className="px-3 py-2.5 text-text!">
                              <div className="flex items-center gap-2">
                                <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${ICON_STYLES[avatarColorFor(r.name)]}`}>
                                  {initialsFor(r.name)}
                                </span>
                                {r.name}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-text-muted">{r.designation || '—'}</td>
                            {r.kind === 'unmapped' ? (
                              <>
                                <td colSpan={2} className="px-3 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => setAssignShiftFor({ employeeId: r.employeeId, name: r.name })}
                                    className="text-danger text-xs font-medium hover:underline text-left"
                                    title="Click to assign a shift for this date"
                                  >
                                    {r.message}
                                  </button>
                                </td>
                                <td className="px-3 py-2.5 text-text-faint">—</td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2.5">
                                  {(() => {
                                    const s = rowFor(r)
                                    return (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center gap-3">
                                          {(['Present', 'Absent', 'Permission'] as Decision[]).map((d) => (
                                            <label key={d} className="flex items-center gap-1 text-xs text-text-muted cursor-pointer">
                                              <input type="checkbox" checked={s.decision === d} onChange={() => chooseDecision(r, d)} className="accent-brand" />
                                              {d === 'Present' ? 'P' : d === 'Absent' ? 'A' : 'PE'}
                                            </label>
                                          ))}
                                        </div>
                                        {s.decision === 'Absent' && (
                                          <div className="space-y-1.5">
                                            <select
                                              value={s.absenceReasonId}
                                              onChange={(e) => updateRow(r.employeeId, s, { absenceReasonId: e.target.value, halfDay: e.target.value ? s.halfDay : null })}
                                              className={`w-44 ${inputCls} !h-8`}
                                            >
                                              <option value="">Select Reason</option>
                                              {reasonOptions.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                  {o.label}
                                                </option>
                                              ))}
                                            </select>
                                            {s.absenceReasonId && (
                                              <div className="flex items-center gap-2 text-xs text-text-muted">
                                                {(['Full Day', 'Fore Noon', 'After Noon'] as HalfDay[]).map((h) => (
                                                  <label key={h} className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={s.halfDay === h}
                                                      onChange={() => updateRow(r.employeeId, s, { halfDay: s.halfDay === h ? null : h })}
                                                      className="accent-brand"
                                                    />
                                                    {h === 'Full Day' ? 'Full' : h === 'Fore Noon' ? 'FN' : 'AN'}
                                                  </label>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {s.decision === 'Permission' && (
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              type="time"
                                              value={s.permissionFrom}
                                              onChange={(e) => updateRow(r.employeeId, s, { permissionFrom: e.target.value })}
                                              className={`${inputCls} !h-8 w-28`}
                                              placeholder="From"
                                            />
                                            <span className="text-text-faint">–</span>
                                            <input
                                              type="time"
                                              value={s.permissionTo}
                                              onChange={(e) => updateRow(r.employeeId, s, { permissionTo: e.target.value })}
                                              className={`${inputCls} !h-8 w-28`}
                                              placeholder="To"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </td>
                                <td className="px-3 py-2.5">
                                  <input
                                    type="time"
                                    value={rowFor(r).clockIn}
                                    onChange={(e) => updateRow(r.employeeId, rowFor(r), { clockIn: e.target.value })}
                                    disabled={rowFor(r).decision !== 'Present'}
                                    className={`${inputCls} w-32`}
                                  />
                                </td>
                                <td className="px-3 py-2.5">
                                  <input
                                    type="time"
                                    value={rowFor(r).clockOut}
                                    onChange={(e) => updateRow(r.employeeId, rowFor(r), { clockOut: e.target.value })}
                                    disabled={rowFor(r).decision !== 'Present'}
                                    className={`${inputCls} w-32`}
                                  />
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {hasSearched && data && <ListPagination page={page} perPage={perPage} total={visibleRows.length} onPageChange={setPage} edgeToEdge />}

      {assignShiftFor && (
        <AssignShiftPanel
          employeeId={assignShiftFor.employeeId}
          employeeName={assignShiftFor.name}
          onClose={() => setAssignShiftFor(null)}
          onAssigned={() => refetch()}
        />
      )}
    </div>
  )
}
