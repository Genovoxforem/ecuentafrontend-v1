import { useParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { InvoiceCreateForm } from './InvoiceCreateForm'

// Reached from a specific customer's own Customer tab ("Create invoice or
// credit note" button — see CustomerDetail.tsx). InvoiceCreateForm itself is
// generalized with a fixedCustomerId prop rather than duplicated — see its
// own comment.
export function InvoiceCreateFromCustomerForm() {
  const { id } = useParams<{ id: string }>()
  const backTo = id ? `${ROUTES.customerDetail.replace(':id', id)}?tab=customer` : ROUTES.customerList
  return <InvoiceCreateForm fixedCustomerId={id} backTo={backTo} />
}
