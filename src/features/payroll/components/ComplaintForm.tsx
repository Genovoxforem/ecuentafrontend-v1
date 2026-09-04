import { useState } from 'react'
import { MessageSquareWarning } from 'lucide-react'
import { ActionFormShell } from '../../../shared/components/forms/ActionFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useUsersSummary } from '../../users/users.queries'
import { useAuth } from '../../auth/AuthContext'
import { ROUTES } from '../../../routes'
import { useCreateComplaint } from '../payrollActions.queries'
import { useRecordComplaint } from '../payrollLists.queries'

// Real via payroll/ajax.php?savecomplaint=1... (payroll/complaints.php's
// "Add Complaints" panel).
export function ComplaintForm() {
  const { data: users } = useUsersSummary()
  const { user } = useAuth()
  const createComplaint = useCreateComplaint()
  const recordComplaint = useRecordComplaint()

  const [fromId, setFromId] = useState('')
  const [againstId, setAgainstId] = useState('')
  const [title, setTitle] = useState('')
  const [complaintDate, setComplaintDate] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setFromId('')
    setAgainstId('')
    setTitle('')
    setComplaintDate('')
    setDescription('')
    setError('')
    createComplaint.reset()
  }

  function handleSubmit() {
    setError('')
    if (!fromId) return setError('Select who the complaint is from.')
    if (!againstId) return setError('Select who the complaint is against.')
    if (!title.trim()) return setError('Enter a title.')
    if (!complaintDate) return setError('Select a complaint date.')
    const fromUser = users?.users.find((u) => String(u.id) === fromId)
    const againstUser = users?.users.find((u) => String(u.id) === againstId)
    const createdBy = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    createComplaint.mutate(
      { complaintFromId: Number(fromId), complaintAgainstId: Number(againstId), title, complaintDate, description },
      {
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.'),
        onSuccess: () =>
          recordComplaint.add({
            createdBy,
            complaintFromName: fromUser?.name || fromUser?.login || 'Unknown',
            complaintAgainstName: againstUser?.name || againstUser?.login || 'Unknown',
            title,
            complaintDate,
            description,
          }),
      },
    )
  }

  return (
    <ActionFormShell
      icon={MessageSquareWarning}
      title="Employee Complaints"
      sourcePath="payroll/complaints.php"
      onSubmit={handleSubmit}
      isPending={createComplaint.isPending}
      isSuccess={createComplaint.isSuccess}
      successMessage="Complaint saved."
      errorMessage={error}
      onAddAnother={reset}
      backTo={ROUTES.payrollEmployeeComplaints}
    >
      <Field label="Complaint From" required>
        <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={inputClasses}>
          <option value="">Select Employee...</option>
          {(users?.users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.login}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Complaint Against" required>
        <select value={againstId} onChange={(e) => setAgainstId(e.target.value)} className={inputClasses}>
          <option value="">Select Employee...</option>
          {(users?.users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.login}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title" required>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Complaint Date" required>
        <input type="date" value={complaintDate} onChange={(e) => setComplaintDate(e.target.value)} className={inputClasses} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Enter Reason" className={inputClasses} />
        </Field>
      </div>
    </ActionFormShell>
  )
}
