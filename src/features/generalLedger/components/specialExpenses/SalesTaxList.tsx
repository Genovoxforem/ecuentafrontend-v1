import { Percent } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyListPage } from '../LegacyListPage'
import { loadVatPayments } from '../../specialPaymentsFapi'

// compta/tva/list.php — the real list of sales tax (VAT) payments.
export function SalesTaxList() {
  return (
    <LegacyListPage
      load={loadVatPayments}
      icon={Percent}
      title="Sales Tax Payments"
      path="/compta/tva/list.php"
      firstHeader={/^Ref/}
      addTo={{ label: 'New Sales Tax', to: ROUTES.ledgerSalesTaxCreate }}
      searchable
    />
  )
}
