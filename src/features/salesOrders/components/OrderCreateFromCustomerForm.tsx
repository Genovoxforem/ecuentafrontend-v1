import { useParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { OrderCreateForm } from './OrderCreateForm'

// Reached from a specific customer's own Customer tab ("AddOrder" button —
// see CustomerDetail.tsx). OrderCreateForm itself is generalized with a
// fixedCustomerId prop rather than duplicated — see its own comment.
export function OrderCreateFromCustomerForm() {
  const { id } = useParams<{ id: string }>()
  const backTo = id ? `${ROUTES.customerDetail.replace(':id', id)}?tab=customer` : ROUTES.customerList
  return <OrderCreateForm fixedCustomerId={id} backTo={backTo} />
}
