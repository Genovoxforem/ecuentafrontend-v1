import { Landmark } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyListPage } from '../LegacyListPage'

// compta/sociales/list.php — the real list of social/fiscal taxes.
export function SocialFiscalTaxesList() {
  return (
    <LegacyListPage
      icon={Landmark}
      title="Social Or Fiscal Taxes"
      path="/compta/sociales/list.php"
      firstHeader={/^Ref/}
      addTo={{ label: 'New Social/Fiscal Tax', to: ROUTES.ledgerSocialFiscalTaxCreate }}
      searchable
    />
  )
}
