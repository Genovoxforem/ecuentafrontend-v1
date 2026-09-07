import { useParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { QuotationCreateForm } from './QuotationCreateForm'

// Reached from a specific customer's own Customer tab ("AddProp" button —
// see CustomerDetail.tsx). QuotationCreateForm itself is generalized with a
// fixedCustomerId prop rather than duplicated — see that file's own comment
// for why (confirmed live: the reference app's customer-scoped create is the
// same real form, just with the customer field locked, not a different page).
export function QuotationCreateFromCustomerForm() {
  const { id } = useParams<{ id: string }>()
  const backTo = id ? `${ROUTES.customerDetail.replace(':id', id)}#customer` : ROUTES.customerList
  return <QuotationCreateForm fixedCustomerId={id} backTo={backTo} />
}
