import { Banknote } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyListPage } from '../LegacyListPage'
import { loadSalaries } from '../../specialPaymentsFapi'

// salaries/list.php — the real salary payments list, read straight from the page.
export function SalaryListPage() {
  return (
    <LegacyListPage
      load={loadSalaries}
      icon={Banknote}
      title="Salary List"
      path="/salaries/list.php"
      firstHeader={/^Ref/}
      addTo={{ label: 'New Payment - Salaries', to: ROUTES.ledgerSalaryPaymentCreate }}
    />
  )
}
