import { Landmark } from 'lucide-react'
import { TableExportButtons } from '../../../../shared/components/TableExportButtons'
import { JsonListPage } from '../JsonListPage'
import { loadSocialPayments } from '../../specialPaymentsFapi'

// compta/sociales/payments.php?mode=sconly — payments of social/fiscal taxes.
export function SocialFiscalTaxPaymentsList() {
  return (
    <JsonListPage
      load={loadSocialPayments}
      icon={Landmark}
      title="Social/Fiscal Taxes Payments"
      queryKey="/compta/sociales/payments.php"
      fixedParams={{ mode: 'sconly' }}
      // The page's own Excel / Print buttons work on the rows on screen.
      toolbar={(table) => <TableExportButtons title="Social-Fiscal Taxes Payments" getExportData={() => ({ headers: table.headers, rows: [...table.rows, ...table.totals].map((r) => r.map((c) => c.text)) })} />}
    />
  )
}
