import { useParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { DetailedPurchaseCreateForm } from './DetailedPurchaseCreateForm'

// Reached from a specific vendor's own Vendor tab ("Create Invoice Or
// Credit Note" button — see CustomerDetail.tsx). DetailedPurchaseCreateForm
// itself is generalized with a fixedCustomerId prop rather than duplicated
// — see its own comment (Save actions stay disabled there; this only fixes
// navigation + vendor pre-fill).
export function VendorInvoiceCreateFromCustomerForm() {
  const { id } = useParams<{ id: string }>()
  const backTo = id ? `${ROUTES.customerDetail.replace(':id', id)}?tab=vendor` : ROUTES.customerList
  return <DetailedPurchaseCreateForm fixedCustomerId={id} backTo={backTo} />
}
