import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'
import { useAuth } from '../../auth/AuthContext'
import { ROUTES } from '../../../routes'
import { useCreateResignation } from '../payrollActions.queries'
import { useRecordResignation } from '../payrollLists.queries'

// Real via payroll/ajax.php?saveresign=... (payroll/resignations.php's
// "Add Resignation" panel).
export function ResignationForm() {
  const { data: users } = useUsersSummary()
  const { user } = useAuth()
  const createResignation = useCreateResignation()
  const recordResignation = useRecordResignation()

  const [employeeId, setEmployeeId] = useState('')
  const [resignationDate, setResignationDate] = useState('')
  const [lastWorkingDay, setLastWorkingDay] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setEmployeeId('')
    setResignationDate('')
    setLastWorkingDay('')
    setReason('')
    setError('')
    createResignation.reset()
  }

  function handleSubmit() {
    setError('')
    if (!employeeId) return setError('Select an employee.')
    if (!resignationDate) return setError('Select a resignation date.')
    if (!lastWorkingDay) return setError('Select a last working day.')
    const employee = users?.users.find((u) => String(u.id) === employeeId)
    const createdBy = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    createResignation.mutate(
      { employeeId: Number(employeeId), resignationDate, lastWorkingDay, reason },
      {
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.'),
        onSuccess: () =>
          recordResignation.add({ employeeName: employee?.name || employee?.login || 'Unknown', resignationDate, lastWorkingDay, reason, createdBy }),
      },
    )
  }

  return (
    <ActionFormShell
      icon={LogOut}
      title="Employee Resignation"
      sourcePath="payroll/resignations.php"
      onSubmit={handleSubmit}
      isPending={createResignation.isPending}
      isSuccess={createResignation.isSuccess}
      successMessage="Resignation saved."
      errorMessage={error}
      onAddAnother={reset}
      backTo={ROUTES.payrollEmployeeResignation}
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
      <Field label="Resignation Date" required>
        <input type="date" value={resignationDate} onChange={(e) => setResignationDate(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Last Working Day" required>
        <input type="date" value={lastWorkingDay} onChange={(e) => setLastWorkingDay(e.target.value)} className={inputClasses} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Reason">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Enter Reason" className={inputClasses} />
        </Field>
      </div>
    </ActionFormShell>
  )
}
