import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useUsersSummary } from '../users.queries'
import { LEAVE_TYPES, useCreateLeaveRequest } from '../leave.queries'
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

export function LeaveRequestForm() {
  const navigate = useNavigate()
  const { data: usersSummary, isLoading } = useUsersSummary()
  const createLeaveRequest = useCreateLeaveRequest()

  const userOptions = useMemo(() => (usersSummary?.users ?? []).map((u) => ({ value: String(u.id), label: `${u.name} (${u.login})` })), [usersSummary])

  const [employeeId, setEmployeeId] = useState('')
  const [typeCode, setTypeCode] = useState('')
  const [mode, setMode] = useState<'single' | 'multiple'>('single')
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(todayIso())
  const [validatorId, setValidatorId] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleSubmit() {
    setError('')
    const employee = usersSummary?.users.find((u) => String(u.id) === employeeId)
    const validator = usersSummary?.users.find((u) => String(u.id) === validatorId)
    if (!employee) return setError('User is required!')
    if (!typeCode) return setError('Type is required!')
    if (!validator) return setError('Will be approved by is required!')

    createLeaveRequest({
      employeeId: employee.id,
      employeeName: employee.name,
      validatorName: validator.name,
      typeCode,
      startDate,
      endDate: mode === 'single' ? startDate : endDate,
      description,
    })
    setSuccess(true)
    setTimeout(() => navigate(ROUTES.leaveList), 700)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CalendarPlus size={20} className="text-brand" /> New Leave Request
      </h2>

      {success && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Leave request created — redirecting…</Card>}
      {error && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error}</Card>}

      <Card className="!h-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="User" required>
            <SearchableSelect value={employeeId} onChange={setEmployeeId} options={userOptions} placeholder={isLoading ? 'Loading…' : 'Select a user'} />
          </Field>
          <Field label="Type" required>
            <select value={typeCode} onChange={(e) => setTypeCode(e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
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
                onClick={() => setMode('multiple')}
                className={`flex-1 text-sm font-medium border-l border-input-border ${mode === 'multiple' ? 'bg-brand text-white' : 'bg-input-bg text-text-muted hover:bg-surface-hover'}`}
              >
                Multiple Days
              </button>
            </div>
          </Field>

          <Field label={mode === 'single' ? 'Date' : 'Start Date'} required>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </Field>
          {mode === 'multiple' && (
            <Field label="End Date" required>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className={inputCls} />
            </Field>
          )}

          <Field label="Will be approved by" required>
            <SearchableSelect value={validatorId} onChange={setValidatorId} options={userOptions} placeholder={isLoading ? 'Loading…' : 'Select a users'} />
          </Field>
          <div className="md:col-span-3">
            <Field label="Description">
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button type="button" onClick={handleSubmit} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <CalendarPlus size={14} /> Create leave request
          </button>
          <button type="button" onClick={() => navigate(ROUTES.leaveList)} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
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
            {LEAVE_TYPES.map((t, i) => (
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
