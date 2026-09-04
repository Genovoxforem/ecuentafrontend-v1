import { useMemo, useState } from 'react'
import { HandCoins } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'
import { useAuth } from '../../auth/AuthContext'
import { ROUTES } from '../../../routes'
import { useCreateLoan } from '../payrollActions.queries'
import { useRecordLoan, todayIso } from '../payrollLists.queries'

// Real via payroll/ajax.php?saveLoan=... (payroll/loan.php's "Request
// Loan" panel). Amount Per Month is computed client-side exactly like the
// real page's own cal_instal() JS (loan amount / period), not a separate
// input.
export function LoanForm() {
  const { data: users } = useUsersSummary()
  const { user } = useAuth()
  const createLoan = useCreateLoan()
  const recordLoan = useRecordLoan()

  const [employeeId, setEmployeeId] = useState('')
  const [deductFrom, setDeductFrom] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [periods, setPeriods] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const installment = useMemo(() => {
    const amt = Number(loanAmount)
    const per = Number(periods)
    return amt > 0 && per > 0 ? (amt / per).toFixed(2) : ''
  }, [loanAmount, periods])

  function reset() {
    setEmployeeId('')
    setDeductFrom('')
    setLoanAmount('')
    setPeriods('')
    setReason('')
    setError('')
    createLoan.reset()
  }

  function handleSubmit() {
    setError('')
    if (!employeeId) return setError('Select an employee.')
    if (!deductFrom) return setError('Select a deduct-from date.')
    if (!loanAmount.trim()) return setError('Enter a loan amount.')
    if (!periods.trim()) return setError('Enter a loan period.')
    const employee = users?.users.find((u) => String(u.id) === employeeId)
    const createdBy = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    createLoan.mutate(
      { employeeId: Number(employeeId), deductFrom, loanAmount, loanPeriodMonths: periods, installment, reason },
      {
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.'),
        onSuccess: () =>
          recordLoan.add({
            createdBy,
            employeeName: employee?.name || employee?.login || 'Unknown',
            loanAmount,
            periodMonths: periods,
            installment,
            deductFrom,
            requestDate: todayIso(),
          }),
      },
    )
  }

  return (
    <ActionFormShell
      icon={HandCoins}
      title="Loan Details"
      sourcePath="payroll/loan.php"
      onSubmit={handleSubmit}
      isPending={createLoan.isPending}
      isSuccess={createLoan.isSuccess}
      successMessage="Loan request added."
      errorMessage={error}
      onAddAnother={reset}
      backTo={ROUTES.payrollEmployeeLoan}
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
      <Field label="Deduct From" required>
        <input type="date" value={deductFrom} onChange={(e) => setDeductFrom(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Loan Amount" required>
        <input value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} inputMode="decimal" className={inputClasses} />
      </Field>
      <Field label="Loan Period (Months)" required>
        <input value={periods} onChange={(e) => setPeriods(e.target.value)} inputMode="numeric" className={inputClasses} />
      </Field>
      <Field label="Amount Per Month">
        <input value={installment} readOnly className={`${inputClasses} cursor-not-allowed opacity-70`} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Reason">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Enter your Reason" className={inputClasses} />
        </Field>
      </div>
    </ActionFormShell>
  )
}
