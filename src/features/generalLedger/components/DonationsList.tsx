import { HeartHandshake } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { LegacyListPage } from './LegacyListPage'

// don/list.php — the real donations list.
export function DonationsList() {
  return (
    <LegacyListPage
      icon={HeartHandshake}
      title="Donations"
      path="/don/list.php"
      firstHeader={/^Ref/}
      addTo={{ label: 'New Donation', to: ROUTES.ledgerDonationCreate }}
    />
  )
}
