import { useState } from 'react'
import { Clock3 } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useCreateHourlyGrade } from '../payrollActions.queries'

// Real via payroll/ajax.php?savehourly_grade=... (payroll/hour_temp.php's
// "Set Hourly Grade" modal).
export function HourlyTemplateForm() {
  const createGrade = useCreateHourlyGrade()

  const [grade, setGrade] = useState('')
  const [rate, setRate] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setGrade('')
    setRate('')
    setError('')
    createGrade.reset()
  }

  function handleSubmit() {
    setError('')
    if (!grade.trim()) return setError('Enter an hourly grade.')
    if (!rate.trim()) return setError('Enter an hourly rate.')
    createGrade.mutate({ grade, rate }, { onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') })
  }

  return (
    <ActionFormShell
      icon={Clock3}
      title="Hourly Template"
      sourcePath="payroll/hour_temp.php"
      onSubmit={handleSubmit}
      isPending={createGrade.isPending}
      isSuccess={createGrade.isSuccess}
      successMessage="Hourly grade saved."
      errorMessage={error}
      onAddAnother={reset}
    >
      <Field label="Hourly Grade" required>
        <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Enter Hourly Grade" className={inputClasses} />
      </Field>
      <Field label="Hourly Rate" required>
        <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" placeholder="Enter Hourly Rate" className={inputClasses} />
      </Field>
    </ActionFormShell>
  )
}
