import { FileSpreadsheet } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Salary Template page — see PayrollLegacyList.
export function SalaryTemplateList() {
  return <PayrollLegacyList listKey="salaryTemplate" icon={FileSpreadsheet} title="Salary Template" addLabel="Set Salary Template" addPath={ROUTES.payrollSalaryTemplateCreate} />
}
