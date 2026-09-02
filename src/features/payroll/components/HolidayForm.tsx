import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useAuth } from '../../auth/AuthContext'
import { useCreateHoliday } from '../payrollActions.queries'

// Real via payroll/ajax.php?saveholiday=... (payroll/holiday.php's own
// "Add Holiday" panel) — one row per calendar day in the Start/End range,
// same as the real page. Entity is fixed: this deployment only has one
// (llx_entity has a single "Master entity" row, confirmed by query) and
// there's no JSON API for the Entity <select> itself.
export function HolidayForm() {
  const { user } = useAuth()
  const createHoliday = useCreateHoliday()

  const [leaveName, setLeaveName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setLeaveName('')
    setStartDate('')
    setEndDate('')
    setNote('')
    setError('')
    createHoliday.reset()
  }

  function handleSubmit() {
    setError('')
    if (!leaveName.trim()) return setError('Enter a leave name.')
    if (!startDate) return setError('Select a start date.')
    createHoliday.mutate(
      { leaveName, startDate, endDate, note, createdByUserId: Number(user?.id) || 0 },
      { onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <ActionFormShell
      icon={CalendarDays}
      title="Calendar Holidays"
      sourcePath="payroll/holiday.php"
      onSubmit={handleSubmit}
      isPending={createHoliday.isPending}
      isSuccess={createHoliday.isSuccess}
      successMessage="Holiday saved."
      errorMessage={error}
      onAddAnother={reset}
    >
      <Field label="Leave Name" required>
        <input value={leaveName} onChange={(e) => setLeaveName(e.target.value)} placeholder="Enter Leave Name" className={inputClasses} />
      </Field>
      <Field label="Start Date" required>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="End Date">
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Entity" required>
        <input value="Master entity" disabled className={`${inputClasses} cursor-not-allowed opacity-70`} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Note">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClasses} />
        </Field>
      </div>
    </ActionFormShell>
  )
}
