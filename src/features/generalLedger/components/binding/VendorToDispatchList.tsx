import { ROUTES } from '../../../../routes'
import { VENDOR_BIND_PATH } from '../../bindLines.queries'
import { BindToDispatchList } from './CustomerToDispatchList'

// accountancy/supplier/list.php — same form and row layout as customer/list.php,
// sourced from facture_fourn_det and suggesting purchase-side accounts.
export function VendorToDispatchList() {
  return <BindToDispatchList path={VENDOR_BIND_PATH} invoiceRoute={ROUTES.vendorInvoiceDetail} title="Lines Of Vendor Invoices To Bind" />
}
