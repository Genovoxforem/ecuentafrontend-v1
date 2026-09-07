import { Percent } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'
import { ROUTES } from '../../../../routes'

// compta/tva/list.php — classic Dolibarr list of VAT payments, no JSON.
export function SalesTaxList() {
  return (
    <InertListPage
      icon={Percent}
      title="Sales Tax"
      sourcePath="compta/tva/list.php"
      columns={['Ref', 'Label', 'Period End Date', 'Date Payment', 'Type', 'Number', 'Bank Transaction', 'Account', 'Paid']}
      addLabel="New Sales Tax"
      addPath={ROUTES.ledgerSalesTaxCreate}
    />
  )
}
