import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useLeaveTypes, useLeaveCreateForm, useCreateLeaveRequest, type LeaveDayPortion } from '../leave.queries'
import { todayIso } from '../../../shared/localCollection'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block text-sm mb-1 ${required ? 'text-danger' : 'text-text-muted'}`}>
        {label}
        {required && '*'}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const halfDayCls = 'h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 shrink-0 w-44'

const DAY_PORTION_OPTIONS: { value: LeaveDayPortion; label: string }[] = [
  { value: 'fullday', label: 'Full Day' },
  { value: 'morning', label: 'Morning Half Day' },
  { value: 'afternoon', label: 'Afternoon Half Day' },
]

// holiday/card.php?action=create — the dropdowns are the real form's own
// (employees, leave types, approvers) and Save sends the same POST it does.
export function LeaveRequestForm() {
  const navigate = useNavigate()
  const { data: form, isLoading, isError, error, refetch } = useLeaveCreateForm()
  const { data: leaveTypes } = useLeaveTypes()
  const createLeaveRequest = useCreateLeaveRequest()

  const [employeeId, setEmployeeId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [mode, setMode] = useState<'single' | 'multi'>('single')
  const [startDate, setStartDate] = useState(todayIso())
  const [startSession, setStartSession] = useState<LeaveDayPortion>('fullday')
  const [endDate, setEndDate] = useState(todayIso())
  const [endSession, setEndSession] = useState<LeaveDayPortion>('fullday')
  const [approverId, setApproverId] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleSubmit() {
    setFormError('')
    if (!employeeId) return setFormError('User is required!')
    if (!typeId) return setFormError('Please select Leave Type')
    if (!startDate) return setFormError('You must select a start date.')
    if (mode === 'multi' && !endDate) return setFormError('You must select an end date.')
    if (!approverId) return setFormError('You must choose an approbator to your leave request.')

    createLeaveRequest.mutate(
      { employeeId, typeId, mode, startDate, startSession, endDate, endSession, approverId, description },
      {
        onSuccess: () => {
          setSuccess(true)
          setTimeout(() => navigate(ROUTES.leaveList), 700)
        },
        onError: (err) => setFormError(err instanceof Error ? err.message : 'The leave request could not be created.'),
      },
    )
  }

  if (isLoading) return <LegacyLoadingCard label="Loading leave request form…" />
  if (isError || !form) {
    return <LegacyErrorCard title="Couldn't load the leave request form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CalendarPlus size={20} className="text-brand" /> New Leave Request
      </h2>

      {success && (
        <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">
          <p role="status">Leave request created — redirecting…</p>
        </Card>
      )}
      {formError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
          <p role="alert">{formError}</p>
        </Card>
      )}

      <Card className="!h-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Field label="User" required>
            <SearchableSelect value={employeeId} onChange={setEmployeeId} options={form.employees} placeholder="Select a user" />
          </Field>
          <Field label="Type" required>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {form.types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Leave Mode" required>
            <div className="flex rounded-lg border border-input-border overflow-hidden h-10">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`flex-1 text-sm font-medium ${mode === 'single' ? 'bg-brand text-white' : 'bg-input-bg text-text-muted hover:bg-surface-hover'}`}
              >
                Single Day
              </button>
              <button
                type="button"
                onClick={() => setMode('multi')}
                className={`flex-1 text-sm font-medium border-l border-input-border ${mode === 'multi' ? 'bg-brand text-white' : 'bg-input-bg text-text-muted hover:bg-surface-hover'}`}
              >
                Multiple Days
              </button>
            </div>
          </Field>

          <Field label={mode === 'single' ? 'Date' : 'Start Date'} required>
            <div className="flex gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              <select value={startSession} onChange={(e) => setStartSession(e.target.value as LeaveDayPortion)} className={halfDayCls}>
                {DAY_PORTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          {mode === 'multi' && (
            <Field label="End Date" required>
              <div className="flex gap-2">
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className={inputCls} />
                <select value={endSession} onChange={(e) => setEndSession(e.target.value as LeaveDayPortion)} className={halfDayCls}>
                  {DAY_PORTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          )}

          <Field label="Will be approved by" required>
            <SearchableSelect value={approverId} onChange={setApproverId} options={form.approvers} placeholder="Select a user" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createLeaveRequest.isPending || success}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {createLeaveRequest.isPending ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />} Create leave request
            </button>
            <button type="button" onClick={() => navigate(ROUTES.leaveList)} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
              Cancel
            </button>
          </div>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">No</th>
              <th className="font-medium px-4 py-2.5">Type</th>
              <th className="font-medium px-4 py-2.5 text-right">Balance Days</th>
            </tr>
          </thead>
          <tbody>
            {(leaveTypes ?? []).map((t, i) => (
              <tr key={t.code} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-text-muted">{i + 1}</td>
                <td className="px-4 py-2.5 text-text!">{t.label}</td>
                <td className="px-4 py-2.5 text-right text-text-muted">{t.balanceDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
