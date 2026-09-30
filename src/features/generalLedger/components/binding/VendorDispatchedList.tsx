import { ROUTES } from '../../../../routes'
import { VENDOR_LINES_PATH } from '../../boundLines.queries'
import { BoundLinesList } from './CustomerDispatchedList'

// accountancy/supplier/lines.php — same screen as customer/lines.php over the
// vendor-invoice lines that are already bound to an accounting account.
export function VendorDispatchedList() {
  return <BoundLinesList path={VENDOR_LINES_PATH} invoiceRoute={ROUTES.vendorInvoiceDetail} title="Bound Lines Of Vendor Invoices" />
}
