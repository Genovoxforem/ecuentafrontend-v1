import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'
import { useCreateWarning } from '../payrollActions.queries'

// Real via payroll/ajax.php?savewarning=1... (payroll/warnings.php's
// "Add Warnings" panel).
export function WarningForm() {
  const { data: users } = useUsersSummary()
  const createWarning = useCreateWarning()

  const [byId, setById] = useState('')
  const [toId, setToId] = useState('')
  const [subject, setSubject] = useState('')
  const [warningDate, setWarningDate] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setById('')
    setToId('')
    setSubject('')
    setWarningDate('')
    setDescription('')
    setError('')
    createWarning.reset()
  }

  function handleSubmit() {
    setError('')
    if (!byId) return setError('Select who the warning is by.')
    if (!toId) return setError('Select who the warning is to.')
    if (!subject.trim()) return setError('Enter a subject.')
    if (!warningDate) return setError('Select a warning date.')
    createWarning.mutate(
      { warningById: Number(byId), warningToId: Number(toId), subject, warningDate, description },
      { onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <ActionFormShell
      icon={AlertTriangle}
      title="Employee Warnings"
      sourcePath="payroll/warnings.php"
      onSubmit={handleSubmit}
      isPending={createWarning.isPending}
      isSuccess={createWarning.isSuccess}
      successMessage="Warning saved."
      errorMessage={error}
      onAddAnother={reset}
    >
      <Field label="Warning By" required>
        <select value={byId} onChange={(e) => setById(e.target.value)} className={inputClasses}>
          <option value="">Select Employee...</option>
          {(users?.users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.login}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Warning To" required>
        <select value={toId} onChange={(e) => setToId(e.target.value)} className={inputClasses}>
          <option value="">Select</option>
          {(users?.users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.login}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Subject" required>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter Subject" className={inputClasses} />
      </Field>
      <Field label="Warning Date" required>
        <input type="date" value={warningDate} onChange={(e) => setWarningDate(e.target.value)} className={inputClasses} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Enter Reason" className={inputClasses} />
        </Field>
      </div>
    </ActionFormShell>
  )
}
