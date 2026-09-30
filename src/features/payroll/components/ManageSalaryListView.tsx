import { Users } from 'lucide-react'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Employee Salary List page — see PayrollLegacyList.
export function ManageSalaryListView() {
  return <PayrollLegacyList listKey="manageSalaryList" icon={Users} title="Employee Salary List" />
}
