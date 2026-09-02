import { useState } from 'react'
import { Banknote } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'
import { useAuth } from '../../auth/AuthContext'
import { useCreateAdvance } from '../payrollActions.queries'

// Real via payroll/ajax.php?saveAdvrequest=... (payroll/advance.php's
// "Request Advance Salary" panel).
export function AdvanceSalaryForm() {
  const { data: users } = useUsersSummary()
  const { user } = useAuth()
  const createAdvance = useCreateAdvance()

  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [deductMonth, setDeductMonth] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setEmployeeId('')
    setAmount('')
    setDeductMonth('')
    setReason('')
    setError('')
    createAdvance.reset()
  }

  function handleSubmit() {
    setError('')
    if (!employeeId) return setError('Select an employee.')
    if (!amount.trim()) return setError('Enter an amount.')
    if (!deductMonth) return setError('Select a deduct month.')
    createAdvance.mutate(
      { employeeId: Number(employeeId), amount, deductMonth, reason, requestedByUserId: Number(user?.id) || 0 },
      { onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <ActionFormShell
      icon={Banknote}
      title="Advance Salary"
      sourcePath="payroll/advance.php"
      onSubmit={handleSubmit}
      isPending={createAdvance.isPending}
      isSuccess={createAdvance.isSuccess}
      successMessage="Advance request sent."
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
      <Field label="Amount" required>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={inputClasses} />
      </Field>
      <Field label="Deduct Month" required>
        <input type="month" value={deductMonth} onChange={(e) => setDeductMonth(e.target.value)} className={inputClasses} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Reason">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Enter your Reason" className={inputClasses} />
        </Field>
      </div>
    </ActionFormShell>
  )
}
