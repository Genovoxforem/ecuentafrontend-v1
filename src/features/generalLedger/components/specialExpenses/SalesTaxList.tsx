import { Percent } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { JsonListPage } from '../JsonListPage'
import { loadVatPayments } from '../../specialPaymentsFapi'

// compta/tva/list.php — the real list of sales tax (VAT) payments.
export function SalesTaxList() {
  return (
    <JsonListPage
      load={loadVatPayments}
      icon={Percent}
      title="Sales Tax Payments"
      queryKey="/compta/tva/list.php"
      addTo={{ label: 'New Sales Tax', to: ROUTES.ledgerSalesTaxCreate }}
      linkFor={(header, cell) => {
        const id = new URLSearchParams((cell.href ?? '').split('?')[1] ?? '').get('id')
        return /^Account$/i.test(header) && cell.href?.includes('/compta/bank/card.php') && id ? ROUTES.bankingAccountDetail.replace(':id', id) : null
      }}
      searchable
    />
  )
}
