import { Briefcase } from 'lucide-react'
import { DictionaryPage } from '../../generalLedger/components/setup/DictionaryPage'

// Payroll > Settings > HRM Job Positions: admin/dict.php?id=34 — a simple
// Code/Label dictionary, same generic template as PayrollTypesOfLeaveList.
export function PayrollHrmJobPositionsList() {
  return <DictionaryPage id="34" title="Dictionary setup - HRM - Job positions" dictionaryName="job position" icon={Briefcase} />
}
