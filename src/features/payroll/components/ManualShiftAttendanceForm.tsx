import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'
import { useMarkManualShiftAttendance } from '../payrollAttendance.queries'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// Real via payroll/shiftsmanual_ajax.php?saveAttendance=1 — see
// payrollAttendance.queries.ts's useMarkManualShiftAttendance for why this
// is a simplified single-employee form rather than the real page's bulk
// per-employee table (that page's own read side has no JSON contract).
export function ManualShiftAttendanceForm({ shiftId, title, sourcePath }: { shiftId: 3 | 4; title: string; sourcePath: string }) {
  const { data: users } = useUsersSummary()
  const mark = useMarkManualShiftAttendance()

  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [present, setPresent] = useState(true)
  const [clockIn, setClockIn] = useState('')
  const [clockOut, setClockOut] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setEmployeeId('')
    setDate(todayIso())
    setPresent(true)
    setClockIn('')
    setClockOut('')
    setError('')
    mark.reset()
  }

  function handleSubmit() {
    setError('')
    if (!employeeId) return setError('Select an employee.')
    if (present && (!clockIn || !clockOut)) return setError('Clock In and Clock Out are required when marking present.')
    mark.mutate(
      { shiftId, employeeId: Number(employeeId), date, present, clockIn: clockIn || undefined, clockOut: clockOut || undefined },
      { onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <ActionFormShell
      icon={ClipboardCheck}
      title={title}
      sourcePath={sourcePath}
      onSubmit={handleSubmit}
      isPending={mark.isPending}
      isSuccess={mark.isSuccess}
      successMessage="Attendance saved."
      errorMessage={error}
      onAddAnother={reset}
    >
      <Field label="Employee" required>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClasses}>
          <option value="">Select...</option>
          {(users?.users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.login}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Attendance Date" required>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input type="checkbox" checked={present} onChange={(e) => setPresent(e.target.checked)} className="rounded border-input-border text-brand focus:ring-brand/30" />
        Present
      </label>
      <div />
      <Field label="Clock In" required={present}>
        <input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} disabled={!present} className={inputClasses} />
      </Field>
      <Field label="Clock Out" required={present}>
        <input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} disabled={!present} className={inputClasses} />
      </Field>
    </ActionFormShell>
  )
}
