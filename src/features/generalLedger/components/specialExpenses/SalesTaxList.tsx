import { Percent } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyListPage } from '../LegacyListPage'

// compta/tva/list.php — the real list of sales tax (VAT) payments.
export function SalesTaxList() {
  return (
    <LegacyListPage
      icon={Percent}
      title="Sales Tax Payments"
      path="/compta/tva/list.php"
      firstHeader={/^Ref/}
      addTo={{ label: 'New Sales Tax', to: ROUTES.ledgerSalesTaxCreate }}
      searchable
    />
  )
}
