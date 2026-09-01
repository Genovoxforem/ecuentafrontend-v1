import { useState } from 'react'
import { Award } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'
import { useCreateAward } from '../payrollActions.queries'

// Real via payroll/ajax.php?saveaward=... (payroll/award.php's "Give
// Award" panel). Employee list is the app's real userprofile/api/users.php
// list (the real page's own Employee <select> has no JSON API of its own).
export function AwardForm() {
  const { data: users } = useUsersSummary()
  const createAward = useCreateAward()

  const [employeeId, setEmployeeId] = useState('')
  const [award, setAward] = useState('')
  const [giftItem, setGiftItem] = useState('')
  const [cashPrice, setCashPrice] = useState('')
  const [month, setMonth] = useState('')
  const [awardDate, setAwardDate] = useState('')
  const [comments, setComments] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setEmployeeId('')
    setAward('')
    setGiftItem('')
    setCashPrice('')
    setMonth('')
    setAwardDate('')
    setComments('')
    setError('')
    createAward.reset()
  }

  function handleSubmit() {
    setError('')
    if (!employeeId) return setError('Select an employee.')
    if (!award.trim()) return setError('Enter an award name.')
    if (!month) return setError('Select a month.')
    if (!awardDate) return setError('Select an award date.')
    createAward.mutate(
      { employeeId: Number(employeeId), award, giftItem, cashPrice, month, awardDate, comments },
      { onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <ActionFormShell
      icon={Award}
      title="Employee Award"
      sourcePath="payroll/award.php"
      onSubmit={handleSubmit}
      isPending={createAward.isPending}
      isSuccess={createAward.isSuccess}
      successMessage="Award saved."
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
      <Field label="Award Name" required>
        <input value={award} onChange={(e) => setAward(e.target.value)} placeholder="Enter Award Name" className={inputClasses} />
      </Field>
      <Field label="Gift Item">
        <input value={giftItem} onChange={(e) => setGiftItem(e.target.value)} placeholder="Enter Gift Item" className={inputClasses} />
      </Field>
      <Field label="Cash Price">
        <input value={cashPrice} onChange={(e) => setCashPrice(e.target.value)} placeholder="Enter Cash Price" className={inputClasses} />
      </Field>
      <Field label="Select Month" required>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Award Date" required>
        <input type="date" value={awardDate} onChange={(e) => setAwardDate(e.target.value)} className={inputClasses} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Comments">
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className={inputClasses} />
        </Field>
      </div>
    </ActionFormShell>
  )
}
