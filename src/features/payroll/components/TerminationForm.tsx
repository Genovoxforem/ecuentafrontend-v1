import { useState } from 'react'
import { UserX } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'
import { useAuth } from '../../auth/AuthContext'
import { ROUTES } from '../../../routes'
import { TERMINATION_TYPES, useCreateTermination } from '../payrollActions.queries'
import { useRecordTermination } from '../payrollLists.queries'

// Real via payroll/ajax.php?savetermination=1... (payroll/terminations.php's
// "Add Termination" panel). Termination Type options are copied verbatim
// from that page's own hardcoded PHP array — reference code, not scraped
// live data.
export function TerminationForm() {
  const { data: users } = useUsersSummary()
  const { user } = useAuth()
  const createTermination = useCreateTermination()
  const recordTermination = useRecordTermination()

  const [employeeId, setEmployeeId] = useState('')
  const [terminationType, setTerminationType] = useState('')
  const [noticeDate, setNoticeDate] = useState('')
  const [terminationDate, setTerminationDate] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setEmployeeId('')
    setTerminationType('')
    setNoticeDate('')
    setTerminationDate('')
    setDescription('')
    setError('')
    createTermination.reset()
  }

  function handleSubmit() {
    setError('')
    if (!employeeId) return setError('Select an employee.')
    if (!terminationType) return setError('Select a termination type.')
    if (!noticeDate) return setError('Select a notice date.')
    if (!terminationDate) return setError('Select a termination date.')
    const employee = users?.users.find((u) => String(u.id) === employeeId)
    const createdBy = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    createTermination.mutate(
      { employeeId: Number(employeeId), terminationType, noticeDate, terminationDate, description },
      {
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.'),
        onSuccess: () =>
          recordTermination.add({
            createdBy,
            employeeName: employee?.name || employee?.login || 'Unknown',
            terminationType,
            noticeDate,
            terminationDate,
            description,
          }),
      },
    )
  }

  return (
    <ActionFormShell
      icon={UserX}
      title="Employee Terminations"
      sourcePath="payroll/terminations.php"
      onSubmit={handleSubmit}
      isPending={createTermination.isPending}
      isSuccess={createTermination.isSuccess}
      successMessage="Termination saved."
      errorMessage={error}
      onAddAnother={reset}
      backTo={ROUTES.payrollEmployeeTerminations}
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
      <Field label="Termination Type" required>
        <select value={terminationType} onChange={(e) => setTerminationType(e.target.value)} className={inputClasses}>
          <option value="">Select</option>
          {TERMINATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notice Date" required>
        <input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Termination Date" required>
        <input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} className={inputClasses} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClasses} />
        </Field>
      </div>
    </ActionFormShell>
  )
}
