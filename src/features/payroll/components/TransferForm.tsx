import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'
import { useCreateTransfer } from '../payrollActions.queries'

// Real via payroll/ajax.php?savetransfer=1... (payroll/transfers.php's
// "Add Transfer" panel). Entity is fixed to this deployment's one real
// entity (see HolidayForm's comment) — its own <select> has no JSON API.
export function TransferForm() {
  const { data: users } = useUsersSummary()
  const createTransfer = useCreateTransfer()

  const [employeeId, setEmployeeId] = useState('')
  const [transferDate, setTransferDate] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setEmployeeId('')
    setTransferDate('')
    setDescription('')
    setError('')
    createTransfer.reset()
  }

  function handleSubmit() {
    setError('')
    if (!employeeId) return setError('Select an employee.')
    if (!transferDate) return setError('Select a transfer date.')
    createTransfer.mutate({ employeeId: Number(employeeId), transferDate, description }, { onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') })
  }

  return (
    <ActionFormShell
      icon={ArrowRightLeft}
      title="Employee Transfers"
      sourcePath="payroll/transfers.php"
      onSubmit={handleSubmit}
      isPending={createTransfer.isPending}
      isSuccess={createTransfer.isSuccess}
      successMessage="Transfer saved."
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
      <Field label="Entity" required>
        <input value="Master entity" disabled className={`${inputClasses} cursor-not-allowed opacity-70`} />
      </Field>
      <Field label="Transfer Date" required>
        <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} className={inputClasses} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClasses} />
        </Field>
      </div>
    </ActionFormShell>
  )
}
