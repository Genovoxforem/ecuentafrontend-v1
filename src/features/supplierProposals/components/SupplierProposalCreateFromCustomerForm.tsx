import { useParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { SupplierProposalCreateForm } from './SupplierProposalCreateForm'

// Reached from a specific vendor's own Vendor tab ("Create A Price Request"
// button — see CustomerDetail.tsx). SupplierProposalCreateForm itself is
// generalized with a fixedCustomerId prop rather than duplicated — see its
// own comment.
export function SupplierProposalCreateFromCustomerForm() {
  const { id } = useParams<{ id: string }>()
  const backTo = id ? `${ROUTES.customerDetail.replace(':id', id)}#vendor` : ROUTES.customerList
  return <SupplierProposalCreateForm fixedCustomerId={id} backTo={backTo} />
}
