import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useAuth } from '../../auth/AuthContext'
import { ROUTES } from '../../../routes'
import { useCreateShift } from '../payrollActions.queries'
import { useRecordShift } from '../payrollLists.queries'

const DAYS = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
] as const

type DayKey = (typeof DAYS)[number][0]
type Times = Record<DayKey, { in: string; out: string }>
const EMPTY_TIMES: Times = {
  monday: { in: '', out: '' },
  tuesday: { in: '', out: '' },
  wednesday: { in: '', out: '' },
  thursday: { in: '', out: '' },
  friday: { in: '', out: '' },
  saturday: { in: '', out: '' },
  sunday: { in: '', out: '' },
}

// Real via payroll/ajax.php?saveshifts=... (payroll/shifts.php's "Add
// Shift" panel). Shift Type is fixed to "Fixed" — the real <select> only
// ever offers that one option.
export function ShiftForm() {
  const { user } = useAuth()
  const createShift = useCreateShift()
  const recordShift = useRecordShift()

  const [name, setName] = useState('')
  const [times, setTimes] = useState<Times>(EMPTY_TIMES)
  const [error, setError] = useState('')

  function reset() {
    setName('')
    setTimes(EMPTY_TIMES)
    setError('')
    createShift.reset()
  }

  function setTime(day: DayKey, field: 'in' | 'out', value: string) {
    setTimes((cur) => ({ ...cur, [day]: { ...cur[day], [field]: value } }))
  }

  function handleSubmit() {
    setError('')
    if (!name.trim()) return setError('Enter a shift name.')
    for (const [key, label] of DAYS) {
      if (!times[key].in || !times[key].out) return setError(`${label} start and end time are required.`)
    }
    createShift.mutate(
      {
        name,
        mondayIn: times.monday.in,
        mondayOut: times.monday.out,
        tuesdayIn: times.tuesday.in,
        tuesdayOut: times.tuesday.out,
        wednesdayIn: times.wednesday.in,
        wednesdayOut: times.wednesday.out,
        thursdayIn: times.thursday.in,
        thursdayOut: times.thursday.out,
        fridayIn: times.friday.in,
        fridayOut: times.friday.out,
        saturdayIn: times.saturday.in,
        saturdayOut: times.saturday.out,
        sundayIn: times.sunday.in,
        sundayOut: times.sunday.out,
      },
      {
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.'),
        onSuccess: () => {
          const createdBy = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
          recordShift.add({ name, shiftType: 'Fixed', createdBy })
        },
      },
    )
  }

  return (
    <ActionFormShell
      icon={CalendarRange}
      title="Shifts"
      sourcePath="payroll/shifts.php"
      onSubmit={handleSubmit}
      isPending={createShift.isPending}
      isSuccess={createShift.isSuccess}
      successMessage="Shift saved."
      errorMessage={error}
      onAddAnother={reset}
      backTo={ROUTES.payrollAssignShifts}
    >
      <Field label="Shift Name" required>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter Shift Name" className={inputClasses} />
      </Field>
      <Field label="Shift Type" required>
        <input value="Fixed Shift" disabled className={`${inputClasses} cursor-not-allowed opacity-70`} />
      </Field>
      {DAYS.map(([key, label]) => (
        <div key={key} className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-xs font-semibold text-text-muted">{label} Shift Time</p>
          <Field label="Start Time" required>
            <input type="time" value={times[key].in} onChange={(e) => setTime(key, 'in', e.target.value)} className={inputClasses} />
          </Field>
          <Field label="End Time" required>
            <input type="time" value={times[key].out} onChange={(e) => setTime(key, 'out', e.target.value)} className={inputClasses} />
          </Field>
        </div>
      ))}
    </ActionFormShell>
  )
}
