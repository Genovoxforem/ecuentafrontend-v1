import { useParams } from 'react-router-dom'
import { ThirdPartyCreateForm } from '../../shared/components/thirdParty/ThirdPartyCreateForm'
import { useCustomerDetail, useThirdPartyExtra } from '../../features/customers/customerDetail.queries'
import { LegacyErrorCard, LegacyLoadingCard } from '../../features/products/components/LegacyReportStates'
import { ROUTES } from '../../routes'

// The legacy pencil (societe/create.php?edit=1): the "New third party" wizard opened on a saved record. The wizard
// itself is shared with Create; this module only loads the profile and hands it over.
export function CustomerEditModule() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useCustomerDetail(id)
  // The fapi record adds what the profile lacks (sales rep, tags, incoterm, social links). Optional: without it the form still opens.
  const extra = useThirdPartyExtra(id)
  const detailPath = ROUTES.customerDetail.replace(':id', id ?? '')
  if (isLoading || extra.isLoading) return <LegacyLoadingCard label="Loading third party…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load this third party" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  const variant = data.isVendor && !data.isCustomer ? 'vendor' : data.client === 2 ? 'prospect' : 'customer'
  return <ThirdPartyCreateForm key={data.id} variant={variant} cancelPath={detailPath} profile={data} extra={extra.data} />
}
