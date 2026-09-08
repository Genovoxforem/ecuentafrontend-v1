import { useParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { JobCardCreateForm } from './JobCardCreateForm'

// Reached from a specific customer's own Customer tab ("Create Job Card"
// button — see CustomerDetail.tsx).
export function JobCardCreateFromCustomerForm() {
  const { id } = useParams<{ id: string }>()
  const backTo = id ? `${ROUTES.customerDetail.replace(':id', id)}?tab=customer` : ROUTES.customerList
  return <JobCardCreateForm fixedCustomerId={id} backTo={backTo} />
}
