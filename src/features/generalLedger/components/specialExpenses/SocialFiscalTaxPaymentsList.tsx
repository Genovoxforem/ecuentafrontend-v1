import { Landmark } from 'lucide-react'
import { InertListPage } from '../../../../shared/components/forms/InertListPage'

// compta/sociales/payments.php?mode=sconly — same list engine as
// compta/charges/index.php's social-contribution block, isolated to just
// that payment type. No JSON.
export function SocialFiscalTaxPaymentsList() {
  return (
    <InertListPage
      icon={Landmark}
      title="Payments - Social/Fiscal Taxes"
      sourcePath="compta/sociales/payments.php?mode=sconly"
      columns={['Period End Date', 'Label', 'Type', 'Expected To Pay', 'Payment Ref', 'Date Payment', 'Account', 'Paid']}
    />
  )
}
