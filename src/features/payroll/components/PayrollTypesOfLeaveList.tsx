import { BookUser } from 'lucide-react'
import { DictionaryPage } from '../../generalLedger/components/setup/DictionaryPage'

// Payroll > Settings > Types Of Leave: the backend's own dictionary of leave
// types (admin/dict.php?id=28) — same generic Dolibarr dictionary template
// already wired for General Ledger's Tax/VAT/Expense account pages (see
// DictionaryPage.tsx). Confirmed live (172.16.5.55): real columns are Code/
// Label/Manage A Counter/Notice Period/New By Month/Country (required
// select), matching the real add-form field names (code/label/affect/delay/
// newbymonth/country) exactly — the parser reads them generically, nothing
// hardcoded here.
export function PayrollTypesOfLeaveList() {
  return <DictionaryPage id="28" title="Dictionary setup - Types of leave" dictionaryName="leave type" icon={BookUser} />
}
