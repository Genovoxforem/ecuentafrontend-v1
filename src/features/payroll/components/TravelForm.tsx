import { useState } from 'react'
import { Plane } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'
import { useCreateTravel } from '../payrollActions.queries'

// Real via payroll/ajax.php?savetravel=1... (payroll/travel.php's
// "Add Travel" panel).
export function TravelForm() {
  const { data: users } = useUsersSummary()
  const createTravel = useCreateTravel()

  const [employeeId, setEmployeeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [purpose, setPurpose] = useState('')
  const [country, setCountry] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setEmployeeId('')
    setStartDate('')
    setEndDate('')
    setPurpose('')
    setCountry('')
    setDescription('')
    setError('')
    createTravel.reset()
  }

  function handleSubmit() {
    setError('')
    if (!employeeId) return setError('Select an employee.')
    if (!startDate) return setError('Select a start date.')
    if (!endDate) return setError('Select an end date.')
    if (!purpose.trim()) return setError('Enter the purpose of trip.')
    if (!country.trim()) return setError('Enter a country.')
    createTravel.mutate(
      { employeeId: Number(employeeId), startDate, endDate, purpose, country, description },
      { onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <ActionFormShell
      icon={Plane}
      title="Employee Travel"
      sourcePath="payroll/travel.php"
      onSubmit={handleSubmit}
      isPending={createTravel.isPending}
      isSuccess={createTravel.isSuccess}
      successMessage="Travel saved."
      errorMessage={error}
      onAddAnother={reset}
    >
      <Field label="Employee" required>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClasses}>
          <option value="">Select Employee...</option>
          {(users?.users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.login}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Start Date" required>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="End Date" required>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Purpose of Trip" required>
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose of Trip" className={inputClasses} />
      </Field>
      <Field label="Country" required>
        <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className={inputClasses} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClasses} />
        </Field>
      </div>
    </ActionFormShell>
  )
}
