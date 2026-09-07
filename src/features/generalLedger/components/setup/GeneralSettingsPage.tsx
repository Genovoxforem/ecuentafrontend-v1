import { Settings } from 'lucide-react'
import { DisabledFormPage } from '../../../../shared/components/forms/DisabledFormPage'

// accountancy/admin/index.php — confirmed real (reads/writes Dolibarr
// constants, e.g. ACCOUNTING_LENGTH_GACCOUNT) but every write is a classic
// full-page GET/POST toggle or form-submit, no JSON anywhere. Fields below
// match the real page's two sections exactly.
export function GeneralSettingsPage() {
  return (
    <DisabledFormPage
      icon={Settings}
      title="General"
      sourcePath="accountancy/admin/index.php"
      sections={[
        {
          heading: 'Options',
          fields: [
            { label: 'Disable Direct Bank Input', type: 'checkbox' },
            { label: 'Use Combo For Auxiliary Account', type: 'checkbox' },
            { label: 'Manage Zero At End Of Account', type: 'checkbox' },
            { label: 'Length Of General Account' },
            { label: 'Length Of Auxiliary Account' },
          ],
        },
        {
          heading: 'Binding Options',
          fields: [
            { label: 'Sort Order — Lines To Bind' },
            { label: 'Sort Order — Lines Already Bound' },
            { label: 'Date Start Binding', type: 'date' },
            { label: 'Default Period On Transfer', type: 'select', options: ['Previous Month', 'Current Month', 'Fiscal Year'] },
            { label: 'Disable Binding On Sales', type: 'checkbox' },
            { label: 'Disable Binding On Purchases', type: 'checkbox' },
            { label: 'Disable Binding On Expense Reports', type: 'checkbox' },
            { label: 'Disable Binding On Bank Payments', type: 'checkbox' },
          ],
        },
      ]}
    />
  )
}
