import { useState } from 'react'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useMarkAttendance } from '../payrollAttendance.queries'
import { useUsersSummary } from '../../users/users.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// Real via payroll/saveAttendance.php — confirmed genuine JSON write, but
// with its own hasRight('payroll','award_obj','read') check commented out
// server-side (a live, reachable, unauthenticated write endpoint — a real
// bug, reported not fixed per frontend-only scope). The real endpoint loops
// EVERY active employee and only acts where a `shiftId[id]` entry is
// present in the request, built for a bulk-editable table of every
// employee at once. This is a deliberately simplified single-employee
// version of that same real write, not a full rebuild of the original
// bulk-table UI — Shift is a plain numeric ID field (no real JSON source
// for shift names/llx_payroll_shifts was found in this module's audit).
export function MarkAttendance() {
  const { data: users } = useUsersSummary()
  const mark = useMarkAttendance()

  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [shiftId, setShiftId] = useState('')
  const [status, setStatus] = useState<'Present' | 'Absent' | 'Permission'>('Present')
  const [clockIn, setClockIn] = useState('')
  const [clockOut, setClockOut] = useState('')

  function handleSubmit() {
    if (!employeeId || !shiftId) return
    mark.mutate({
      employeeId: Number(employeeId),
      date,
      shiftId: Number(shiftId),
      status,
      clockIn: clockIn || undefined,
      clockOut: clockOut || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ClipboardCheck size={20} className="text-brand" /> Mark Attendance
      </h2>
      <p className="text-xs text-text-faint italic">
        Simplified single-employee form — the real legacy page marks every active employee at once in one bulk table; this sends the same real write for one employee at a time.
      </p>

      <Card className="!h-auto space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-faint">Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={`mt-1 ${selectCls}`}>
              <option value="">Select…</option>
              {(users?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.login}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-faint">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 ${inputCls}`} />
          </div>
          <div>
            <label className="text-xs text-text-faint">Shift ID</label>
            <input value={shiftId} onChange={(e) => setShiftId(e.target.value)} placeholder="llx_payroll_shifts.id" className={`mt-1 ${inputCls}`} />
          </div>
          <div>
            <label className="text-xs text-text-faint">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={`mt-1 ${selectCls}`}>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Permission">Permission</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-faint">Clock In</label>
            <input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} className={`mt-1 ${inputCls}`} disabled={status !== 'Present'} />
          </div>
          <div>
            <label className="text-xs text-text-faint">Clock Out</label>
            <input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} className={`mt-1 ${inputCls}`} disabled={status !== 'Present'} />
          </div>
        </div>

        <button
          type="button"
          disabled={!employeeId || !shiftId || mark.isPending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:bg-neutral-bg disabled:text-text-faint"
        >
          {mark.isPending && <Loader2 size={14} className="animate-spin" />} Save
        </button>
        {mark.isError && <p className="text-sm text-danger">{mark.error instanceof Error ? mark.error.message : 'Failed to save.'}</p>}
        {mark.isSuccess && <p className="text-sm text-success-fg">Saved.</p>}
      </Card>
    </div>
  )
}
