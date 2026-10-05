import { Briefcase } from 'lucide-react'
import { DictionaryPage } from '../../generalLedger/components/setup/DictionaryPage'

// Payroll > Settings > HRM Department List: admin/dict.php?id=33 — a simple
// Code/Label dictionary, same generic template as PayrollTypesOfLeaveList.
export function PayrollHrmDepartmentList() {
  return <DictionaryPage id="33" title="Dictionary setup - HRM - Department list" dictionaryName="department" icon={Briefcase} />
}
