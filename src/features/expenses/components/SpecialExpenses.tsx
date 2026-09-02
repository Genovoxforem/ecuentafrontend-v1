import { Landmark } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// A fully separate top-level sidebar icon in the real app
// (mainmenu='specialexpence' in llx_menu, url=compta/charges/index.php) —
// Dolibarr's stock recurring/social-taxes module. Confirmed no AJAX/JSON of
// any kind (pure traditional server-rendered index page). This is a
// dashboard/index page linking to 3 real sub-areas (by year), not a
// submittable form — fields below match its own year filter plus those
// 3 real sub-area links.
export function SpecialExpenses() {
  return (
    <DisabledFormPage
      icon={Landmark}
      title="Special Expenses Area"
      sourcePath="compta/charges/index.php"
      sections={[
        {
          fields: [
            { label: 'Year', type: 'select', required: true },
            { label: 'VAT Payments' },
            { label: 'Social Contributions Payments' },
            { label: 'Salaries Payments' },
          ],
        },
      ]}
    />
  )
}
