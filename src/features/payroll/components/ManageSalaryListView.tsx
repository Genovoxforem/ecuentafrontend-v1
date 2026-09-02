import { Users, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const COLUMNS = ['Employee Name', 'Designation', 'Assigned Salary Grade', 'Assigned Shift', 'Assign Details']

// payroll/manage_salary_list.php is a pure read-only report — a plain PHP
// loop over llx_payroll_salary_list joined to llx_user, no JSON API and no
// write action of its own (confirmed by reading it directly: no
// $_REQUEST-based ajax.php action targets this page's data at all).
export function ManageSalaryListView() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Users size={20} className="text-brand" /> Employee Salary List
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">payroll/manage_salary_list.php</code> — a plain server-rendered report with no JSON API and no write
          action of its own. View the real column layout below; the rows themselves aren't available without scraping the classic page.
        </p>
      </Card>

      <Card className="!h-auto overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text-faint">
              {COLUMNS.map((c) => (
                <th key={c} className="py-2 pr-4 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={COLUMNS.length} className="py-4 text-center text-text-faint">
                No data available here.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
