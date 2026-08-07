import { useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Camera, TrendingUp, User, CalendarCheck, Clock, FileText, CalendarX, Users2, Building2, Plus, X, Check, XCircle } from 'lucide-react'
import { Card, ActionGroupCard, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { useCreateLeaveRequest, useSetLeaveRequestStatus, type PayrollSummary } from '../payroll.queries'

const ICON_COLORS = {
  teal: 'text-teal-500',
  green: 'text-emerald-500',
  blue: 'text-blue-500',
  amber: 'text-amber-500',
} as const

function TopStatCard({
  icon: Icon,
  color,
  value,
  label,
  links,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  color: keyof typeof ICON_COLORS
  value: number
  label: string
  links: ReactNode
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Icon size={22} className={ICON_COLORS[color]} />
        <span className="text-3xl font-bold text-text!">{value}</span>
      </div>
      <p className="text-sm text-text-muted">{label}</p>
      <div className="flex items-center gap-3 text-xs">{links}</div>
    </Card>
  )
}

function StatLink({ to, children }: { to?: string; children: ReactNode }) {
  if (!to) return <span className="flex items-center gap-1 text-text-faint cursor-default">{children}</span>
  return (
    <Link to={to} className="flex items-center gap-1 text-brand hover:underline">
      {children}
    </Link>
  )
}

function ShiftsCard({ shifts, templates }: { shifts: number; templates: number }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-text!">
          <Clock size={14} className="text-blue-500" /> Shifts
        </span>
        <span className="text-xl font-bold text-text!">{shifts}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-text!">
          <FileText size={14} className="text-blue-500" /> Templates
        </span>
        <span className="text-xl font-bold text-text!">{templates}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <StatLink>
          <Clock size={11} /> Shifts
        </StatLink>
        <StatLink>
          <FileText size={11} /> Templates
        </StatLink>
      </div>
    </Card>
  )
}

function MonthAmountCard({ label, value, caption, valueColor }: { label: string; value: number; caption: string; valueColor?: string }) {
  return (
    <Card>
      <p className="text-sm text-text-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor ?? 'text-text!'}`}>{fmtZMW(value)}</p>
      <p className="text-xs text-text-faint mt-1">{caption}</p>
    </Card>
  )
}

function NewLeaveRequestForm({ onClose }: { onClose: () => void }) {
  const createLeaveRequest = useCreateLeaveRequest()
  const [employeeName, setEmployeeName] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!employeeName.trim() || !fromDate || !toDate) {
      setError('Employee, from date, and to date are all required.')
      return
    }
    if (toDate < fromDate) {
      setError('To date must be on or after the from date.')
      return
    }
    createLeaveRequest({ employeeName, fromDate, toDate, reason })
    onClose()
  }

  return (
    <Card className="border-brand/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">New Leave Request</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Employee</span>
          <input type="text" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Reason</span>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
      </div>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <div className="flex justify-end mt-3">
        <button type="button" onClick={handleSubmit} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Submit request
        </button>
      </div>
    </Card>
  )
}

function LeaveRequestsTable({ summary }: { summary: PayrollSummary }) {
  const setStatus = useSetLeaveRequestStatus()
  if (summary.leaveRequests.length === 0) return null
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="text-left text-xs font-semibold text-text uppercase tracking-wide border-b border-border bg-surface">
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {summary.leaveRequests.map((r) => (
              <tr key={r.ref} className="border-t border-border">
                <td className="px-4 py-3 text-brand">{r.ref}</td>
                <td className="px-4 py-3 text-text!">{r.employeeName}</td>
                <td className="px-4 py-3 text-text-muted">{r.fromDate}</td>
                <td className="px-4 py-3 text-text-muted">{r.toDate}</td>
                <td className="px-4 py-3 text-text-muted">{r.reason || '-'}</td>
                <td className="px-4 py-3 text-text-muted">{r.status}</td>
                <td className="px-4 py-3">
                  {r.status === 'Pending' ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setStatus(r.ref, 'Approved')} className="flex items-center gap-1 text-xs font-medium text-success hover:underline">
                        <Check size={12} /> Approve
                      </button>
                      <button type="button" onClick={() => setStatus(r.ref, 'Rejected')} className="flex items-center gap-1 text-xs font-medium text-danger hover:underline">
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-text-faint">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function PayrollOverview({ summary }: { summary: PayrollSummary }) {
  const [showLeaveForm, setShowLeaveForm] = useState(false)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Camera size={20} className="text-brand" /> Payroll Area
      </h2>

      {showLeaveForm && <NewLeaveRequestForm onClose={() => setShowLeaveForm(false)} />}

      <h3 className="flex items-center gap-2 font-semibold text-text-muted">
        <TrendingUp size={16} /> Payroll Statistics Overview
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <TopStatCard
          icon={User}
          color="teal"
          value={summary.totalEmployees}
          label="Total Employees"
          links={
            <>
              <StatLink>List</StatLink>
              <StatLink>+ Create</StatLink>
            </>
          }
        />
        <TopStatCard
          icon={CalendarCheck}
          color="green"
          value={summary.todaysAttendance}
          label="Today's Attendance"
          links={
            <>
              <StatLink>View</StatLink>
              <StatLink>+ Add</StatLink>
            </>
          }
        />
        <ShiftsCard shifts={summary.shifts} templates={summary.shiftTemplates} />
        <TopStatCard
          icon={CalendarX}
          color="amber"
          value={summary.leaveRequestsThisMonth}
          label="Leave Requests (This Month)"
          links={
            <button type="button" onClick={() => setShowLeaveForm((v) => !v)} className="flex items-center gap-1 text-brand hover:underline">
              + Request
            </button>
          }
        />
      </div>

      <LeaveRequestsTable summary={summary} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MonthAmountCard label="YTD Amount (This Month)" value={summary.ytdAmountThisMonth} caption={summary.ytdAmountThisMonthLabel} />
        <MonthAmountCard label="YTD Amount (Last Month)" value={summary.ytdAmountLastMonth} caption={summary.ytdAmountLastMonthLabel} />
        <Card>
          <p className="text-sm text-text-muted">Salary Paid (This Month)</p>
          <p className="text-2xl font-bold mt-1 text-success">{fmtZMW(summary.salaryPaidThisMonth)}</p>
          <StatLink>View Details</StatLink>
        </Card>
        <MonthAmountCard label="Salary Paid (Last Month)" value={summary.salaryPaidLastMonth} caption={summary.salaryPaidLastMonthLabel} valueColor="text-blue-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ActionGroupCard
          icon={Camera}
          title="Payroll Management"
          columns={2}
          actions={[
            { icon: CalendarCheck, label: 'Attendance' },
            { icon: Users2, label: 'Advance Salary' },
            { icon: FileText, label: 'Loan' },
            { icon: Clock, label: 'Shifts' },
            { icon: FileText, label: 'Salary Template' },
            { icon: FileText, label: 'Hourly Template' },
            { icon: FileText, label: 'Manage Salary' },
            { icon: FileText, label: 'Salary List' },
            { icon: FileText, label: 'Make Payment' },
          ]}
        />
        <ActionGroupCard
          icon={User}
          title="Employee Management"
          columns={2}
          actions={[
            { icon: CalendarX, label: 'New Leave Request' },
            { icon: FileText, label: 'All Leave Requests' },
            { icon: FileText, label: 'View Payslip' },
            { icon: FileText, label: 'YTD Payslip' },
          ]}
        />
        <ActionGroupCard
          icon={Building2}
          title="Core HR"
          columns={2}
          actions={[
            { icon: Users2, label: 'Employee Award' },
            { icon: Users2, label: 'Transfers' },
            { icon: Users2, label: 'Resignation' },
            { icon: Users2, label: 'Travel' },
            { icon: Users2, label: 'Complaints' },
            { icon: Users2, label: 'Warnings' },
            { icon: Users2, label: 'Terminations' },
            { icon: FileText, label: 'Holiday Calendar' },
          ]}
        />
      </div>
    </div>
  )
}
