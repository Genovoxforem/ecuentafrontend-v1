import { Landmark } from 'lucide-react'
import { TableExportButtons } from '../../../../shared/components/TableExportButtons'
import { LegacyListPage } from '../LegacyListPage'

// compta/sociales/payments.php?mode=sconly — payments of social/fiscal taxes.
export function SocialFiscalTaxPaymentsList() {
  return (
    <LegacyListPage
      icon={Landmark}
      title="Social/Fiscal Taxes Payments"
      path="/compta/sociales/payments.php"
      fixedParams={{ mode: 'sconly' }}
      firstHeader={/^End date for period/}
      // The page's own Excel / Print buttons work on the rows on screen.
      toolbar={(table) => <TableExportButtons title="Social-Fiscal Taxes Payments" getExportData={() => ({ headers: table.headers, rows: [...table.rows, ...table.totals].map((r) => r.map((c) => c.text)) })} />}
    />
  )
}
