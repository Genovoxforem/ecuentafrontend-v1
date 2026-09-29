import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Camera, TrendingUp, User, CalendarCheck, Clock, FileText, CalendarX, Users2, Building2 } from 'lucide-react'
import { Card, ActionGroupCard, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import type { PayrollSummary } from '../payroll.queries'
import { ROUTES } from '../../../routes'

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

export function PayrollOverview({ summary }: { summary: PayrollSummary }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Camera size={20} className="text-brand" /> Payroll Area
      </h2>

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
            <Link to={ROUTES.payrollLeaveRequest} className="flex items-center gap-1 text-brand hover:underline">
              + Request
            </Link>
          }
        />
      </div>

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
            { icon: CalendarCheck, label: 'Attendance', path: ROUTES.payrollMarkAttendance },
            { icon: Users2, label: 'Advance Salary', path: ROUTES.payrollAdvanceSalary },
            { icon: FileText, label: 'Loan', path: ROUTES.payrollEmployeeLoan },
            { icon: Clock, label: 'Shifts', path: ROUTES.payrollAssignShifts },
            { icon: FileText, label: 'Salary Template', path: ROUTES.payrollSalaryTemplate },
            { icon: FileText, label: 'Hourly Template', path: ROUTES.payrollHourlyTemplate },
            { icon: FileText, label: 'Manage Salary', path: ROUTES.payrollManageSalary },
            { icon: FileText, label: 'Salary List', path: ROUTES.payrollManageSalaryList },
            { icon: FileText, label: 'Make Payment', path: ROUTES.payrollGenerateMakePayment },
          ]}
        />
        <ActionGroupCard
          icon={User}
          title="Employee Management"
          columns={2}
          actions={[
            { icon: CalendarX, label: 'New Leave Request', path: ROUTES.payrollLeaveRequest },
            { icon: FileText, label: 'All Leave Requests', path: ROUTES.payrollAllLeaveRequest },
            { icon: FileText, label: 'View Payslip', path: ROUTES.payrollGeneratePayslip },
            { icon: FileText, label: 'YTD Payslip', path: ROUTES.payrollYtdPayslip },
          ]}
        />
        <ActionGroupCard
          icon={Building2}
          title="Core HR"
          columns={2}
          actions={[
            { icon: Users2, label: 'Employee Award', path: ROUTES.payrollEmployeeAward },
            { icon: Users2, label: 'Transfers', path: ROUTES.payrollEmployeeTransfers },
            { icon: Users2, label: 'Resignation', path: ROUTES.payrollEmployeeResignation },
            { icon: Users2, label: 'Travel', path: ROUTES.payrollEmployeeTravel },
            { icon: Users2, label: 'Complaints', path: ROUTES.payrollEmployeeComplaints },
            { icon: Users2, label: 'Warnings', path: ROUTES.payrollEmployeeWarnings },
            { icon: Users2, label: 'Terminations', path: ROUTES.payrollEmployeeTerminations },
            { icon: FileText, label: 'Holiday Calendar', path: ROUTES.payrollCalendarHolidays },
          ]}
        />
      </div>
    </div>
  )
}
