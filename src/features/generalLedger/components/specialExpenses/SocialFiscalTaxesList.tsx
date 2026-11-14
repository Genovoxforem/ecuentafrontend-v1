import { Landmark } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { JsonListPage } from '../JsonListPage'
import { loadSocialCharges } from '../../specialPaymentsFapi'

// compta/sociales/list.php — the real list of social/fiscal taxes.
export function SocialFiscalTaxesList() {
  return (
    <JsonListPage
      load={loadSocialCharges}
      icon={Landmark}
      title="Social Or Fiscal Taxes"
      queryKey="/compta/sociales/list.php"
      addTo={{ label: 'New Social/Fiscal Tax', to: ROUTES.ledgerSocialFiscalTaxCreate }}
      searchable
    />
  )
}
