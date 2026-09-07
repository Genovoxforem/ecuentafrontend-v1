import { HeartHandshake } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// don/card.php?action=create — classic form-POST (create() then redirect), no JSON.
export function DonationCreatePage() {
  return (
    <DisabledFormPage
      icon={HeartHandshake}
      title="New Donation"
      sourcePath="don/card.php?action=create"
      sections={[
        {
          fields: [
            { label: 'Date', type: 'date', required: true },
            { label: 'Amount', required: true },
            { label: 'First Name' },
            { label: 'Last Name' },
            { label: 'Company' },
            { label: 'Address', type: 'textarea' },
            { label: 'Town' },
            { label: 'Zip Code' },
            { label: 'Country', type: 'select' },
            { label: 'Email' },
            { label: 'Payment Mode', type: 'select' },
            { label: 'Public', type: 'checkbox' },
            { label: 'Note', type: 'textarea' },
          ],
        },
      ]}
    />
  )
}
