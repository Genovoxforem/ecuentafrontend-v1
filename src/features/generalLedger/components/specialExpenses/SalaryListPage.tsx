import { Banknote } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { JsonListPage } from '../JsonListPage'
import { loadSalaries } from '../../specialPaymentsFapi'

// salaries/list.php — the real salary payments list, read straight from the page.
export function SalaryListPage() {
  return (
    <JsonListPage
      load={loadSalaries}
      icon={Banknote}
      title="Salary List"
      queryKey="/salaries/list.php"
      addTo={{ label: 'New Payment - Salaries', to: ROUTES.ledgerSalaryPaymentCreate }}
    />
  )
}
