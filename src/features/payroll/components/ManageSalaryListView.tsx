import { Trash2, Users } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { useSalaryAssignmentRecords, useRecordSalaryAssignment, type SalaryAssignmentRecord } from '../payrollLists.queries'

type Key = 'employee' | 'role' | 'salaryType' | 'basicSalary' | 'overtime' | 'action'

// payroll/manage_salary_list.php is a pure read-only report (a plain PHP
// loop over llx_payroll_salary_list joined to llx_user, no JSON API and no
// write action of its own — confirmed by reading it directly). It reads the
// same table Manage Salary's real saveSalaryList write populates, so this
// shows the session-local assignments that page has created instead —
// same honesty pattern as every other list here, see PayrollRecordList's
// localOnlyNote banner.
export function ManageSalaryListView() {
  const rows = useSalaryAssignmentRecords()
  const recordAssignment = useRecordSalaryAssignment()

  const columns: PayrollListColumn<SalaryAssignmentRecord, Key>[] = [
    { key: 'employee', label: 'Employee Name', render: (r) => r.employeeName, sortValue: (r) => r.employeeName, exportValue: (r) => r.employeeName },
    { key: 'role', label: 'Employee Role', render: (r) => r.employeeRole, sortValue: (r) => r.employeeRole, exportValue: (r) => r.employeeRole },
    { key: 'salaryType', label: 'Salary Type', render: (r) => r.salaryType, sortValue: (r) => r.salaryType, exportValue: (r) => r.salaryType },
    {
      key: 'basicSalary',
      label: 'Basic Salary',
      render: (r) => (r.basicSalary ? r.basicSalary.toFixed(2) : '-'),
      align: 'right',
      sortValue: (r) => r.basicSalary,
      exportValue: (r) => r.basicSalary.toFixed(2),
    },
    {
      key: 'overtime',
      label: 'Over Time (Per Hour)',
      render: (r) => (r.overtimePerHour ? r.overtimePerHour.toFixed(2) : '-'),
      align: 'right',
      sortValue: (r) => r.overtimePerHour,
      exportValue: (r) => r.overtimePerHour.toFixed(2),
    },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <button type="button" onClick={() => recordAssignment.remove(r.ref)} className="flex items-center gap-1 text-xs text-danger hover:underline">
          <Trash2 size={12} /> Remove
        </button>
      ),
    },
  ]

  return (
    <PayrollRecordList
      icon={Users}
      title="Employee Salary List"
      addLabel="Assign Salary"
      addPath={ROUTES.payrollManageSalary}
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.ref}
      getSearchText={(r) => `${r.employeeName} ${r.employeeRole} ${r.salaryType}`}
      exportTitle="Employee Salary List"
      localOnlyNote
    />
  )
}
