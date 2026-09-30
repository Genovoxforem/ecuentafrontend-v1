import { Landmark } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LegacyFormPage } from '../LegacyFormPage'

// compta/sociales/card.php?action=create — the real "New social/fiscal tax"
// form; Add posts action=add and the backend redirects to the new tax.
export function SocialFiscalTaxCreatePage() {
  return (
    <LegacyFormPage
      icon={Landmark}
      title="New Social/Fiscal Tax"
      path="/compta/sociales/card.php"
      query={{ action: 'create' }}
      anchor="actioncode"
      submitLabel="Add"
      redirectTo={ROUTES.ledgerSocialFiscalTaxesList}
      fields={[
        { name: 'label', label: 'Label', required: true },
        { name: 'actioncode', label: 'Type', required: true },
        { name: 'ech', label: 'Due date', kind: 'date', required: true },
        { name: 'period', label: 'End date for period', kind: 'date', required: true },
        { name: 'amount', label: 'Amount', required: true },
        { name: 'fk_project', label: 'Project' },
        { name: 'mode_reglement_id', label: 'Payment type' },
        { name: 'fk_account', label: 'Bank account' },
      ]}
    />
  )
}
