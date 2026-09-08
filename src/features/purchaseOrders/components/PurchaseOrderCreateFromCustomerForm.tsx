import { useParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { PurchaseOrderCreateForm } from './PurchaseOrderCreateForm'

// Reached from a specific vendor's own Vendor tab ("Create Order" button —
// see CustomerDetail.tsx). PurchaseOrderCreateForm itself is generalized
// with a fixedCustomerId prop rather than duplicated — see its own comment.
export function PurchaseOrderCreateFromCustomerForm() {
  const { id } = useParams<{ id: string }>()
  const backTo = id ? `${ROUTES.customerDetail.replace(':id', id)}?tab=vendor` : ROUTES.customerList
  return <PurchaseOrderCreateForm fixedCustomerId={id} backTo={backTo} />
}
