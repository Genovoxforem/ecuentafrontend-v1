import { Coins } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyListPage } from '../LegacyListPage'

// compta/bank/various_payment/list.php — the real list of miscellaneous
// payments. The bank account and bank entry cells open the native banking pages.
export function MiscPaymentsList() {
  return (
    <LegacyListPage
      icon={Coins}
      title="Miscellaneous Payments"
      path="/compta/bank/various_payment/list.php"
      firstHeader={/^Ref/}
      addTo={{ label: 'New Miscellaneous Payments', to: ROUTES.ledgerMiscPaymentCreate }}
      linkFor={(header, cell) => {
        const id = new URLSearchParams((cell.href ?? '').split('?')[1] ?? '')
        if (/^Bank account/i.test(header) && cell.href?.includes('/compta/bank/card.php')) return ROUTES.bankingAccountDetail.replace(':id', id.get('id') ?? '')
        if (/^Bank entry/i.test(header) && cell.href?.includes('/compta/bank/line.php')) return ROUTES.bankingEntryDetail.replace(':id', id.get('rowid') ?? '')
        return null
      }}
    />
  )
}
