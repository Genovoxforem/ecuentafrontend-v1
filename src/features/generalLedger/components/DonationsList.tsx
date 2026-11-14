import { HeartHandshake } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { JsonListPage } from './JsonListPage'
import { loadDonations } from '../specialPaymentsFapi'

// don/list.php — the real donations list.
export function DonationsList() {
  return (
    <JsonListPage
      load={loadDonations}
      icon={HeartHandshake}
      title="Donations"
      queryKey="/don/list.php"
      addTo={{ label: 'New Donation', to: ROUTES.ledgerDonationCreate }}
    />
  )
}
