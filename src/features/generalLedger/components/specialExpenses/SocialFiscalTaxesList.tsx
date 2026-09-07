import { Landmark } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'
import { ROUTES } from '../../../../routes'

// compta/sociales/list.php — classic Dolibarr list over llx_chargesociales,
// no JSON. Create/edit on compta/sociales/card.php (classic form-POST).
export function SocialFiscalTaxesList() {
  return (
    <InertListPage
      icon={Landmark}
      title="Social/Fiscal Taxes"
      sourcePath="compta/sociales/list.php"
      columns={['Ref', 'Label', 'Type', 'Date', 'Period End Date', 'Amount', 'Status']}
      addLabel="New Social/Fiscal Tax"
      addPath={ROUTES.ledgerSocialFiscalTaxCreate}
    />
  )
}
