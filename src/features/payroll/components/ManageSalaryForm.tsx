import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Info, LoaderCircle, Wallet } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { ROUTES } from '../../../routes'
import { useUsersSummary } from '../../users/users.queries'
import { useCreateSalaryAssignment } from '../payrollActions.queries'
import { useHourlyTemplateRecords, useSalaryTemplateRecords, useRecordSalaryAssignment } from '../payrollLists.queries'

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// Real via payroll/ajax.php?saveSalaryList=1 (payroll/manage_salary.php's
// per-employee "Assign Details" panel — see payrollActions.queries.ts's
// useCreateSalaryAssignment for the full contract, read directly from that
// page's own saveList() JS). The real Template dropdown (llx_payroll_
// hourly_template / llx_payroll_monthly_template row picker) has no JSON
// lookup, so "Template ID" below is a plain manual numeric field — same
// honesty pattern as Mark Attendance's Shift ID. The "Template" picker
// beside it is a separate, local convenience: it resolves Basic Salary/
// Overtime for display in Manage Salary List from whatever this session
// has created in Salary Template/Hourly Template, but its value is never
// sent to the backend — only the manually-entered real Template ID is.
export function ManageSalaryForm() {
  const { data: users } = useUsersSummary()
  const hourlyTemplates = useHourlyTemplateRecords()
  const salaryTemplates = useSalaryTemplateRecords()
  const createAssignment = useCreateSalaryAssignment()
  const recordAssignment = useRecordSalaryAssignment()

  const [employeeId, setEmployeeId] = useState('')
  const [userRole, setUserRole] = useState('')
  const [gradeType, setGradeType] = useState<'llx_payroll_hourly_template' | 'llx_payroll_monthly_template'>('llx_payroll_monthly_template')
  const [localTemplateRef, setLocalTemplateRef] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [bankName, setBankName] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [micr, setMicr] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [leaveType, setLeaveType] = useState('')
  const [comments, setComments] = useState('')
  const [error, setError] = useState('')

  const employeeOptions = useMemo(() => (users?.users ?? []).map((u) => ({ value: String(u.id), label: `${u.name} (${u.login})` })), [users])
  const localTemplateOptions = useMemo(
    () =>
      gradeType === 'llx_payroll_hourly_template'
        ? hourlyTemplates.map((t) => ({ value: t.ref, label: `${t.hourlyGrade} — ${t.hourlyRate}/hr` }))
        : salaryTemplates.map((t) => ({ value: t.ref, label: `${t.salaryGrade} — Basic ${t.basicSalary.toFixed(2)}` })),
    [gradeType, hourlyTemplates, salaryTemplates],
  )

  useEffect(() => {
    const employee = users?.users.find((u) => String(u.id) === employeeId)
    if (employee?.designation) setUserRole(employee.designation)
  }, [employeeId, users])

  function reset() {
    setEmployeeId('')
    setUserRole('')
    setLocalTemplateRef('')
    setTemplateId('')
    setBankName('')
    setIfsc('')
    setMicr('')
    setAccountNo('')
    setLeaveType('')
    setComments('')
    setError('')
    createAssignment.reset()
  }

  function handleSubmit() {
    setError('')
    const employee = users?.users.find((u) => String(u.id) === employeeId)
    if (!employee) return setError('Select an employee.')
    if (!templateId.trim()) return setError('Enter the real Template ID.')

    createAssignment.mutate(
      {
        employeeId: employee.id,
        userRole,
        gradeType,
        templateId: Number(templateId),
        bankName,
        ifsc,
        micr,
        accountNo,
        leaveType,
        comments,
      },
      {
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.'),
        onSuccess: () => {
          const localTemplate =
            gradeType === 'llx_payroll_hourly_template'
              ? hourlyTemplates.find((t) => t.ref === localTemplateRef)
              : salaryTemplates.find((t) => t.ref === localTemplateRef)
          recordAssignment.add({
            employeeId: employee.id,
            employeeName: employee.name || employee.login,
            employeeRole: userRole || employee.designation || '—',
            salaryType:
              gradeType === 'llx_payroll_hourly_template'
                ? (localTemplate as { hourlyGrade: string } | undefined)?.hourlyGrade ?? 'Hourly'
                : (localTemplate as { salaryGrade: string } | undefined)?.salaryGrade ?? 'Monthly',
            basicSalary: gradeType === 'llx_payroll_monthly_template' ? (localTemplate as { basicSalary: number } | undefined)?.basicSalary ?? 0 : 0,
            overtimePerHour:
              gradeType === 'llx_payroll_hourly_template'
                ? Number((localTemplate as { hourlyRate: string } | undefined)?.hourlyRate) || 0
                : (localTemplate as { overtimeValue: number } | undefined)?.overtimeValue ?? 0,
          })
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Wallet size={20} className="text-brand" /> Manage Salary
        </h2>
        <Link to={ROUTES.payrollManageSalaryList} className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text">
          <ArrowLeft size={14} /> Back to list
        </Link>
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/manage_salary.php</code>. This posts directly to its real write endpoint (
          <code className="font-mono">payroll/ajax.php?saveSalaryList</code>) — the assignment is genuinely saved. Template ID must be the real database row
          id of an existing Hourly/Salary Template — there's no lookup for that, so it's entered manually. Shift assignment isn't included here (see Assign
          Shifts for creating shifts themselves).
        </p>
      </Card>

      {createAssignment.isSuccess ? (
        <Card className="!h-auto flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-success-bg text-success-fg">
            <Check size={20} />
          </span>
          <p className="text-sm font-medium text-text!">Salary assigned.</p>
          <button type="button" onClick={reset} className="mt-2 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover">
            Assign another
          </button>
        </Card>
      ) : (
        <Card className="!h-auto space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-danger">Employee*</span>
              <SearchableSelect value={employeeId} onChange={setEmployeeId} options={employeeOptions} placeholder="Select Employee..." />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">User Role</span>
              <input value={userRole} onChange={(e) => setUserRole(e.target.value)} className={inputCls} />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Grade Type*</span>
              <div className="flex rounded-lg border border-input-border overflow-hidden h-10">
                <button
                  type="button"
                  onClick={() => {
                    setGradeType('llx_payroll_monthly_template')
                    setLocalTemplateRef('')
                  }}
                  className={`flex-1 text-sm font-medium ${gradeType === 'llx_payroll_monthly_template' ? 'bg-brand text-white' : 'bg-input-bg text-text-muted hover:bg-surface-hover'}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGradeType('llx_payroll_hourly_template')
                    setLocalTemplateRef('')
                  }}
                  className={`flex-1 text-sm font-medium border-l border-input-border ${gradeType === 'llx_payroll_hourly_template' ? 'bg-brand text-white' : 'bg-input-bg text-text-muted hover:bg-surface-hover'}`}
                >
                  Hourly
                </button>
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Template (this session's list, for display only)</span>
              <SearchableSelect value={localTemplateRef} onChange={setLocalTemplateRef} options={localTemplateOptions} placeholder="Select a template…" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-danger">Template ID (real database row id)*</span>
              <input value={templateId} onChange={(e) => setTemplateId(e.target.value)} inputMode="numeric" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Bank Name</span>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">IFSC Code</span>
              <input value={ifsc} onChange={(e) => setIfsc(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">MICR Code</span>
              <input value={micr} onChange={(e) => setMicr(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Account No</span>
              <input value={accountNo} onChange={(e) => setAccountNo(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Leave Type</span>
              <input value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className={inputCls} />
            </label>
            <div className="sm:col-span-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-text-muted">Comments</span>
                <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className={inputCls} />
              </label>
            </div>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={createAssignment.isPending}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {createAssignment.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
