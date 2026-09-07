import { HeartHandshake } from 'lucide-react'
import { InertListPage } from '../../../shared/components/forms/InertListPage'
import { ROUTES } from '../../../routes'

// don/list.php — classic Dolibarr list over llx_don, no JSON. Status filter
// values (STATUS_DRAFT/VALIDATED/PAID/CANCELED) are hardcoded literal
// constants on the real page, not DB-driven.
export function DonationsList() {
  return (
    <InertListPage
      icon={HeartHandshake}
      title="Donations"
      sourcePath="don/list.php"
      columns={['Ref', 'Third Party', 'Name', 'Date', 'Amount', 'Status']}
      addLabel="New Donation"
      addPath={ROUTES.ledgerDonationCreate}
    />
  )
}
