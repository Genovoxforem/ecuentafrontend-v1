import { useMemo, useState } from 'react'
import { ArrowLeftRight, CalendarPlus, History, Loader2, Plus, RefreshCw, Search, Trash2, Users } from 'lucide-react'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import {
  usePayRunAction,
  useRotations,
  useShiftAuditLog,
  useShiftDepartmentEmployees,
  useShiftGroupEmployees,
  useShiftOverrides,
  useShiftTimetable,
  useShiftUserGroups,
  useShifts,
  type ShiftRow,
  type TimetableDay,
  type TimetableResult,
} from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, PayrollModal, TablePanel, Td, Th } from './PayrollV2Chrome'

const FIELD = 'rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const PRIMARY = 'inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60'
const OUTLINE = 'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60'
const ICON_BTN = 'rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-brand'
const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Request failed.')
const isOn = (v: unknown) => v === true || Number(v) === 1
const fullName = (e: { firstname: string | null; lastname: string | null }) => `${e.firstname ?? ''} ${e.lastname ?? ''}`.trim()
const todayIso = () => new Date().toISOString().slice(0, 10)
const shiftOption = (s: ShiftRow) => `${s.shift_name} (${isOn(s.is_night_shift) ? 'Night' : 'Day'})`

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-text-muted">{label}</span>
      {children}
    </label>
  )
}

type EmployeeTarget = { id: string; name: string }

// ---- Employee picker shared by both bulk dialogs: optional user-group filter
// plus a checklist, the same get_user_groups / get_group_employees calls.
function EmployeePicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const [group, setGroup] = useState('')
  const groups = useShiftUserGroups(true)
  const employees = useShiftGroupEmployees(group, true)
  const rows = employees.data ?? []
  const allOn = rows.length > 0 && rows.every((r) => selected.includes(r.employee_id))

  return (
    <div className="space-y-3">
      <Field label="User Group (optional)">
        <select value={group} onChange={(e) => setGroup(e.target.value)} className={FIELD}>
          <option value="">All Groups</option>
          {(groups.data ?? []).map((g) => (
            <option key={g.rowid} value={g.rowid}>
              {g.name}
            </option>
          ))}
        </select>
      </Field>
      <div>
        <span className="text-xs font-semibold text-text-muted">Select Employees</span>
        <div className="mt-1 max-h-52 overflow-y-auto rounded-md border border-border p-2">
          {employees.isLoading && <p className="text-sm text-text-faint">Loading employees…</p>}
          {!employees.isLoading && rows.length === 0 && <p className="text-sm text-text-faint">No employees found.</p>}
          {rows.length > 0 && (
            <label className="mb-1 flex items-center gap-2 border-b border-border pb-1 text-sm font-medium text-text">
              <input type="checkbox" checked={allOn} onChange={(e) => onChange(e.target.checked ? rows.map((r) => r.employee_id) : [])} /> Select All
            </label>
          )}
          {rows.map((r) => (
            <label key={r.employee_id} className="flex items-center gap-2 py-0.5 text-sm text-text">
              <input
                type="checkbox"
                checked={selected.includes(r.employee_id)}
                onChange={(e) => onChange(e.target.checked ? [...selected, r.employee_id] : selected.filter((id) => id !== r.employee_id))}
              />
              {fullName(r)} <span className="text-xs text-text-faint">({r.department || 'N/A'})</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function DialogFooter({ onCancel, submitLabel, busy, error }: { onCancel: () => void; submitLabel: string; busy: boolean; error: string | null }) {
  return (
    <>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={OUTLINE}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className={PRIMARY}>
          {busy && <Loader2 size={14} className="animate-spin" />} {submitLabel}
        </button>
      </div>
    </>
  )
}

function BulkAssignShiftDialog({ shift, onClose }: { shift: ShiftRow; onClose: () => void }) {
  const action = usePayRunAction()
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected.length) return setError('Please select at least one employee.')
    action.mutate({ endpoint: 'shift.php', action: 'bulk_assign', params: { shift_id: shift.id, employee_ids: selected } }, { onSuccess: onClose, onError: (err) => setError(errorText(err)) })
  }
  return (
    <PayrollModal title={`Bulk Assign Shift: ${shift.shift_name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <EmployeePicker selected={selected} onChange={setSelected} />
        <DialogFooter onCancel={onClose} submitLabel="Assign to Selected" busy={action.isPending} error={error} />
      </form>
    </PayrollModal>
  )
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function BulkAssignRotationDialog({ shifts, onClose }: { shifts: ShiftRow[]; onClose: () => void }) {
  const action = usePayRunAction()
  const [dayShift, setDayShift] = useState('')
  const [nightShift, setNightShift] = useState('')
  const [dayWeeks, setDayWeeks] = useState('1')
  const [nightWeeks, setNightWeeks] = useState('1')
  const [anchor, setAnchor] = useState(todayIso())
  const [offPaid, setOffPaid] = useState(true)
  const [workDays, setWorkDays] = useState([true, true, true, true, true, false, false])
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected.length) return setError('Please select at least one employee.')
    if (!dayShift || !nightShift || dayShift === nightShift) return setError('Select one day shift and one night shift.')
    const workMask = workDays.map((on) => (on ? '1' : '0')).join('')
    const offMask = workDays.map((on) => (on ? '0' : '1')).join('')
    action.mutate(
      {
        endpoint: 'shift.php',
        action: 'assign_rotation',
        params: {
          employee_ids: selected,
          shift_ids: [dayShift, nightShift],
          morning_weeks: dayWeeks || 1,
          night_weeks: nightWeeks || 1,
          anchor_date: anchor,
          work_days_mask: workMask,
          off_days_mask: offMask,
          off_days_paid_holiday: offPaid ? 1 : 0,
        },
      },
      { onSuccess: onClose, onError: (err) => setError(errorText(err)) },
    )
  }

  return (
    <PayrollModal title="Bulk Assign Rotation" onClose={onClose} width="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-text-faint">Pick one day shift + one night shift, the weekly pattern, and the employees to rotate.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Day shift">
            <select value={dayShift} onChange={(e) => setDayShift(e.target.value)} className={FIELD}>
              <option value="">— Select —</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {shiftOption(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Night shift">
            <select value={nightShift} onChange={(e) => setNightShift(e.target.value)} className={FIELD}>
              <option value="">— Select —</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {shiftOption(s)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Day weeks">
            <input type="number" min="1" value={dayWeeks} onChange={(e) => setDayWeeks(e.target.value)} className={`w-24 ${FIELD}`} />
          </Field>
          <Field label="Night weeks">
            <input type="number" min="1" value={nightWeeks} onChange={(e) => setNightWeeks(e.target.value)} className={`w-24 ${FIELD}`} />
          </Field>
          <Field label="Anchor date">
            <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} className={FIELD} />
          </Field>
          <label className="flex items-center gap-1.5 pb-2 text-sm text-text-muted">
            <input type="checkbox" checked={offPaid} onChange={(e) => setOffPaid(e.target.checked)} /> Off days paid as holiday
          </label>
        </div>
        <div>
          <span className="text-xs font-semibold text-text-muted">Work days</span>
          <div className="mt-1 flex flex-wrap gap-3">
            {WEEK_DAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1 text-sm text-text">
                <input type="checkbox" checked={workDays[i]} onChange={(e) => setWorkDays(workDays.map((on, j) => (j === i ? e.target.checked : on)))} /> {d}
              </label>
            ))}
          </div>
        </div>
        <EmployeePicker selected={selected} onChange={setSelected} />
        <DialogFooter onCancel={onClose} submitLabel="Assign Rotation" busy={action.isPending} error={error} />
      </form>
    </PayrollModal>
  )
}

function OverrideDialog({ employee, shifts, onClose }: { employee: EmployeeTarget; shifts: ShiftRow[]; onClose: () => void }) {
  const overrides = useShiftOverrides(employee.id)
  const action = usePayRunAction()
  const confirm = useConfirm()
  const [shiftId, setShiftId] = useState(shifts[0]?.id ?? '')
  const [start, setStart] = useState(todayIso())
  const [end, setEnd] = useState(todayIso())
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!shiftId || !start || !end) return setError('Shift, start and end dates are required.')
    action.mutate(
      { endpoint: 'shift.php', action: 'add_override', params: { employee_id: employee.id, shift_id: shiftId, start_date: start, end_date: end, reason: reason.trim() } },
      { onSuccess: onClose, onError: (err) => setError(errorText(err)) },
    )
  }

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Remove Override?', message: 'Remove this override?' }))) return
    action.mutate({ endpoint: 'shift.php', action: 'remove_override', params: { id } }, { onError: (err) => setError(errorText(err)) })
  }

  return (
    <PayrollModal title={`Override Shift: ${employee.name}`} onClose={onClose}>
      {(overrides.data ?? []).length > 0 && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold text-text-muted">Active Overrides</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-text-muted">
                <th className="py-1">Shift</th>
                <th>From</th>
                <th>To</th>
                <th>Reason</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(overrides.data ?? []).map((o) => (
                <tr key={o.id} className="border-t border-border text-text">
                  <td className="py-1">{o.shift_name || 'N/A'}</td>
                  <td>{o.start_date}</td>
                  <td>{o.end_date}</td>
                  <td>{o.reason || '—'}</td>
                  <td className="text-right">
                    <button type="button" title="Remove override" onClick={() => remove(o.id)} className="rounded p-1 text-text-faint hover:bg-danger-bg hover:text-danger">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        <Field label="Shift">
          <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} className={FIELD}>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {shiftOption(s)}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap gap-3">
          <Field label="Start date">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={FIELD} />
          </Field>
          <Field label="End date">
            <input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} className={FIELD} />
          </Field>
        </div>
        <Field label="Reason (optional)">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Covering for absent colleague" className={FIELD} />
        </Field>
        <DialogFooter onCancel={onClose} submitLabel="Add Override" busy={action.isPending} error={error} />
      </form>
    </PayrollModal>
  )
}

const HISTORY_LABELS: Record<string, string> = { swap_shift: 'Swap Shift', override_added: 'Override Added', override_removed: 'Override Removed' }

function historyDetails(action: string, oldRaw: string | null, newRaw: string | null) {
  try {
    const oldVal = JSON.parse(oldRaw || '{}')
    const newVal = JSON.parse(newRaw || '{}')
    if (action === 'swap_shift') return `Morning: ${oldVal.morning_shift_id ?? '?'} → ${newVal.morning_shift_id ?? '?'}, Night: ${oldVal.night_shift_id ?? '?'} → ${newVal.night_shift_id ?? '?'}`
    if (action === 'override_added') return `Shift #${newVal.shift_id ?? '?'} from ${newVal.start_date ?? '?'} to ${newVal.end_date ?? '?'}`
    if (action === 'override_removed') return `Shift #${oldVal.shift_id ?? '?'} from ${oldVal.start_date ?? '?'} to ${oldVal.end_date ?? '?'} — restored to rotation`
  } catch {
    return newRaw ?? ''
  }
  return ''
}

function HistoryDialog({ employee, onClose }: { employee: EmployeeTarget; onClose: () => void }) {
  const log = useShiftAuditLog(employee.id)
  return (
    <PayrollModal title={`Shift Change History — ${employee.name}`} onClose={onClose} width="max-w-2xl">
      {log.isLoading && <p className="text-sm text-text-faint">Loading…</p>}
      {log.isError && <p className="text-sm text-danger">{errorText(log.error)}</p>}
      {!log.isLoading && (log.data ?? []).length === 0 && <p className="text-sm text-text-faint">No shift changes recorded.</p>}
      {(log.data ?? []).length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-text-muted">
              <th className="py-1">Date</th>
              <th>Action</th>
              <th>Details</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {(log.data ?? []).map((l) => (
              <tr key={l.id} className="border-t border-border align-top text-text">
                <td className="whitespace-nowrap py-1 pr-2">{l.performed_at}</td>
                <td className="pr-2">
                  <span className="rounded bg-info-bg px-1.5 py-0.5 text-info-fg">{HISTORY_LABELS[l.action] ?? l.action}</span>
                </td>
                <td className="pr-2">{historyDetails(l.action, l.old_value, l.new_value)}</td>
                <td>{fullName(l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PayrollModal>
  )
}

// ---- Timetable

function EmployeeActions({ employee, onSwap, onOverride, onHistory }: { employee: EmployeeTarget; onSwap: (e: EmployeeTarget) => void; onOverride: (e: EmployeeTarget) => void; onHistory: (e: EmployeeTarget) => void }) {
  return (
    <span className="flex shrink-0 items-center">
      <button type="button" title="Swap Shift" onClick={() => onSwap(employee)} className={ICON_BTN}>
        <ArrowLeftRight size={13} />
      </button>
      <button type="button" title="Override Shift" onClick={() => onOverride(employee)} className={ICON_BTN}>
        <CalendarPlus size={13} />
      </button>
      <button type="button" title="Shift History" onClick={() => onHistory(employee)} className={ICON_BTN}>
        <History size={13} />
      </button>
    </span>
  )
}

function dayCell(day: TimetableDay | undefined) {
  if (!day) return { cls: 'bg-surface border-border', label: '', time: '' }
  if (isOn(day.is_holiday)) return { cls: 'bg-warning-bg border-warning/40 text-warning-fg', label: 'Holiday', time: '' }
  if (isOn(day.is_off)) return { cls: 'bg-surface-alt border-border text-text-faint', label: 'Off', time: '' }
  if (isOn(day.is_night_shift)) return { cls: 'bg-slate-800 border-slate-700 text-white', label: day.shift_name || 'Night', time: day.start_time?.slice(0, 5) ?? '' }
  if (day.shift_name && day.shift_name !== 'Unassigned') return { cls: 'bg-info-bg border-info/30 text-info-fg', label: day.shift_name, time: day.start_time?.slice(0, 5) ?? '' }
  return { cls: 'bg-surface border-border text-text-faint', label: '—', time: '' }
}

function MonthCalendar({ startDate, days }: { startDate: string; days: TimetableDay[] }) {
  const [year, month] = startDate.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const byDate = new Map(days.map((d) => [d.date, d]))
  const cells = [...Array<null>(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      {WEEK_DAYS.map((d) => (
        <div key={d} className="text-[11px] font-semibold text-text-muted">
          {d}
        </div>
      ))}
      {cells.map((n, i) => {
        if (n === null) return <div key={`e${i}`} />
        const date = `${year}-${String(month).padStart(2, '0')}-${String(n).padStart(2, '0')}`
        const day = byDate.get(date)
        const cell = dayCell(day)
        return (
          <div key={date} title={`${date}${day ? ` — ${day.shift_name || 'Off'}${day.start_time ? ` ${day.start_time}-${day.end_time}` : ''}` : ''}`} className={`min-h-14 rounded border p-1 text-[11px] ${cell.cls}`}>
            <div className="font-semibold">{n}</div>
            {cell.label && <div className="truncate">{cell.label}</div>}
            {cell.time && <div className="opacity-75">{cell.time}</div>}
          </div>
        )
      })}
    </div>
  )
}

function TimetableView({ data, actions }: { data: TimetableResult; actions: Omit<Parameters<typeof EmployeeActions>[0], 'employee'> }) {
  if (Array.isArray(data)) {
    if (!data.length) return <p className="text-sm text-text-faint">No shift assignments found for this date.</p>
    const groups = new Map<string, typeof data>()
    for (const row of data) {
      const key = row.shift_name || 'Off'
      groups.set(key, [...(groups.get(key) ?? []), row])
    }
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[...groups.entries()].map(([name, rows]) => (
          <div key={name} className="rounded-lg border border-border">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-alt px-3 py-2 text-sm">
              <strong className="text-text">{name}</strong>
              {rows[0].start_time && (
                <span className="rounded bg-info-bg px-1.5 py-0.5 text-xs text-info-fg">
                  {rows[0].start_time} - {rows[0].end_time}
                </span>
              )}
              {isOn(rows[0].is_night_shift) && <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-white">Night</span>}
            </div>
            <ul className="divide-y divide-border">
              {rows.map((emp) => {
                const target = { id: String(emp.employee_id), name: fullName(emp) }
                return (
                  <li key={emp.employee_id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-text">
                    <span>
                      {target.name}
                      {emp.department && <span className="text-xs text-text-faint"> ({emp.department})</span>}
                      {isOn(emp.is_holiday) && <span className="ml-1 rounded bg-warning-bg px-1.5 py-0.5 text-xs text-warning-fg">Holiday</span>}
                    </span>
                    <EmployeeActions employee={target} {...actions} />
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  const employees = data.employees.filter((e) => e.days.length > 0)
  if (!employees.length) return <p className="text-sm text-text-faint">No employees found.</p>
  const monthTitle = new Date(`${data.start_date}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-text-muted">
        {[
          ['bg-info-bg border-info/30', 'Day Shift'],
          ['bg-slate-800 border-slate-700', 'Night Shift'],
          ['bg-surface-alt border-border', 'Off'],
          ['bg-warning-bg border-warning/40', 'Holiday'],
          ['bg-surface border-border', 'Unassigned'],
        ].map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded border ${cls}`} /> {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {employees.map((emp) => {
          const target = { id: String(emp.employee_id), name: fullName(emp) }
          return (
            <div key={emp.employee_id} className="rounded-lg border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-alt px-3 py-2">
                <span className="text-sm font-semibold text-text">
                  {target.name} {emp.department && <span className="text-xs font-normal text-text-faint">{emp.department}</span>}
                </span>
                <EmployeeActions employee={target} {...actions} />
              </div>
              <div className="p-2">
                <p className="mb-2 text-center text-xs font-semibold text-text-muted">{monthTitle}</p>
                <MonthCalendar startDate={data.start_date} days={emp.days} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// payroll_v2 #shifts: shift timetable (by date / month / employee, with swap,
// override and history per employee), shift definitions with bulk assignment,
// and rotations — all through shift.php.
export function PayrollShifts() {
  const shifts = useShifts()
  const rotations = useRotations()
  const employees = useShiftDepartmentEmployees()
  const action = usePayRunAction()
  const confirm = useConfirm()

  const [mode, setMode] = useState<'date' | 'month' | 'employee'>('date')
  const [date, setDate] = useState(todayIso())
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const [employeeId, setEmployeeId] = useState('')
  const [ttParams, setTtParams] = useState<Record<string, string> | null>(null)
  const timetable = useShiftTimetable(ttParams)

  const [shiftForm, setShiftForm] = useState({ shift_name: '', start_time: '', end_time: '', is_night_shift: false })
  const [rotationForm, setRotationForm] = useState({ rotation_name: '', pattern_weeks: '1' })
  const [error, setError] = useState<string | null>(null)
  const [ttError, setTtError] = useState<string | null>(null)

  const [bulkShift, setBulkShift] = useState<ShiftRow | null>(null)
  const [bulkRotation, setBulkRotation] = useState(false)
  const [overrideFor, setOverrideFor] = useState<EmployeeTarget | null>(null)
  const [historyFor, setHistoryFor] = useState<EmployeeTarget | null>(null)

  const shiftRows = useMemo(() => shifts.data ?? [], [shifts.data])

  const loadTimetable = (event: React.FormEvent) => {
    event.preventDefault()
    setTtError(null)
    if (mode === 'date') {
      if (!date) return setTtError('Please select a date.')
      setTtParams({ date })
    } else if (mode === 'month') {
      if (!month) return setTtError('Please select a month.')
      const [y, m] = month.split('-')
      setTtParams({ year: y, month: String(Number(m)) })
    } else {
      if (!employeeId) return setTtError('Please select an employee.')
      // An employee's schedule is shown for the current month, as on the classic page.
      const now = new Date()
      setTtParams({ employee_id: employeeId, year: String(now.getFullYear()), month: String(now.getMonth() + 1) })
    }
  }

  const swap = async (emp: EmployeeTarget) => {
    if (!(await confirm({ title: 'Swap Shift?', message: `Swap ${emp.name}'s morning and night shift rotation?` }))) return
    setTtError(null)
    action.mutate({ endpoint: 'shift.php', action: 'swap_shift', params: { employee_id: emp.id } }, { onError: (err) => setTtError(errorText(err)) })
  }

  const addShift = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    action.mutate(
      { endpoint: 'shift.php', action: 'create', params: { ...shiftForm, is_night_shift: shiftForm.is_night_shift ? 1 : 0 } },
      { onSuccess: () => setShiftForm({ shift_name: '', start_time: '', end_time: '', is_night_shift: false }), onError: (err) => setError(errorText(err)) },
    )
  }

  const deleteShift = async (row: ShiftRow) => {
    if (!(await confirm({ title: 'Delete Shift?', message: `Delete "${row.shift_name}"?` }))) return
    setError(null)
    action.mutate({ endpoint: 'shift.php', action: 'delete', params: { id: row.id } }, { onError: (err) => setError(errorText(err)) })
  }

  const addRotation = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    action.mutate(
      { endpoint: 'shift.php', action: 'rotation_create', params: rotationForm },
      { onSuccess: () => setRotationForm({ rotation_name: '', pattern_weeks: '1' }), onError: (err) => setError(errorText(err)) },
    )
  }

  const rowActions = { onSwap: swap, onOverride: setOverrideFor, onHistory: setHistoryFor }

  return (
    <div className="space-y-4">
      {shifts.isError && <ErrorCard error={shifts.error} onRetry={() => shifts.refetch()} />}

      <PanelCard title="Shift Timetable">
        <form onSubmit={loadTimetable} className="mb-4 flex flex-wrap items-end gap-3">
          <Field label="Filter by">
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className={FIELD}>
              <option value="date">Date</option>
              <option value="month">Month</option>
              <option value="employee">Employee</option>
            </select>
          </Field>
          {mode === 'date' && (
            <Field label="Select Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
            </Field>
          )}
          {mode === 'month' && (
            <Field label="Select Month">
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={FIELD} />
            </Field>
          )}
          {mode === 'employee' && (
            <Field label="Employee">
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={`min-w-52 ${FIELD}`}>
                <option value="">— Select employee —</option>
                {(employees.data ?? []).map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {fullName(e)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <button type="submit" className={PRIMARY}>
            {timetable.isFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Load Timetable
          </button>
        </form>
        {ttError && <p className="mb-3 text-sm text-danger">{ttError}</p>}
        {!ttParams && <p className="text-sm text-text-faint">Select a date, month, or employee and click Load Timetable to view shift assignments.</p>}
        {ttParams && timetable.isLoading && <p className="text-sm text-text-faint">Loading…</p>}
        {timetable.isError && <p className="text-sm text-danger">{errorText(timetable.error)}</p>}
        {timetable.data && <TimetableView data={timetable.data} actions={rowActions} />}
      </PanelCard>

      <TablePanel
        title="Shifts"
        action={
          <button type="button" onClick={() => setBulkRotation(true)} className={OUTLINE}>
            <RefreshCw size={14} /> Bulk Assign Rotation
          </button>
        }
      >
        <form onSubmit={addShift} className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <Field label="Shift name">
            <input required value={shiftForm.shift_name} onChange={(e) => setShiftForm({ ...shiftForm, shift_name: e.target.value })} className={`w-44 ${FIELD}`} />
          </Field>
          <Field label="Start">
            <input required type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })} className={FIELD} />
          </Field>
          <Field label="End">
            <input required type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })} className={FIELD} />
          </Field>
          <label className="flex items-center gap-1.5 pb-2 text-sm text-text-muted">
            <input type="checkbox" checked={shiftForm.is_night_shift} onChange={(e) => setShiftForm({ ...shiftForm, is_night_shift: e.target.checked })} /> Night shift
          </label>
          <button type="submit" disabled={action.isPending} className={PRIMARY}>
            <Plus size={14} /> Add Shift
          </button>
          {error && <p className="w-full text-sm text-danger">{error}</p>}
        </form>
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Name</Th>
              <Th>Start</Th>
              <Th>End</Th>
              <Th>Night?</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {shifts.isLoading && <LoadingRows cols={5} rows={3} />}
            {!shifts.isLoading && shiftRows.length === 0 && <EmptyRow colSpan={5} label="No shifts defined yet." />}
            {shiftRows.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <Td className="font-medium">{s.shift_name}</Td>
                <Td>{s.start_time}</Td>
                <Td>{s.end_time}</Td>
                <Td>{isOn(s.is_night_shift) ? 'Yes' : 'No'}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setBulkShift(s)} className="inline-flex items-center gap-1 rounded-md bg-info-bg px-2.5 py-1 text-xs font-medium text-info-fg hover:opacity-90">
                      <Users size={12} /> Bulk Assign
                    </button>
                    <button type="button" title="Delete shift" disabled={action.isPending} onClick={() => deleteShift(s)} className="rounded-md border border-border px-2 py-1 text-text-muted hover:bg-danger-bg hover:text-danger disabled:opacity-60">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      <TablePanel title="Shift Rotations">
        <form onSubmit={addRotation} className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <Field label="Rotation name">
            <input required value={rotationForm.rotation_name} onChange={(e) => setRotationForm({ ...rotationForm, rotation_name: e.target.value })} className={`w-48 ${FIELD}`} />
          </Field>
          <Field label="Pattern weeks">
            <input required type="number" min="1" value={rotationForm.pattern_weeks} onChange={(e) => setRotationForm({ ...rotationForm, pattern_weeks: e.target.value })} className={`w-28 ${FIELD}`} />
          </Field>
          <button type="submit" disabled={action.isPending} className={PRIMARY}>
            <Plus size={14} /> Add Rotation
          </button>
        </form>
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Name</Th>
              <Th>Pattern Weeks</Th>
            </tr>
          </thead>
          <tbody>
            {rotations.isLoading && <LoadingRows cols={2} rows={2} />}
            {!rotations.isLoading && (rotations.data ?? []).length === 0 && <EmptyRow colSpan={2} label="No rotations defined yet." />}
            {(rotations.data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <Td>{r.rotation_name}</Td>
                <Td>{r.pattern_weeks}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {bulkShift && <BulkAssignShiftDialog shift={bulkShift} onClose={() => setBulkShift(null)} />}
      {bulkRotation && <BulkAssignRotationDialog shifts={shiftRows} onClose={() => setBulkRotation(false)} />}
      {overrideFor && <OverrideDialog employee={overrideFor} shifts={shiftRows} onClose={() => setOverrideFor(null)} />}
      {historyFor && <HistoryDialog employee={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  )
}
