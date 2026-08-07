import { ThirdPartyCreateForm } from '../../shared/components/thirdParty/ThirdPartyCreateForm'
import { ROUTES } from '../../routes'

export function CustomerCreateModule() {
  return <ThirdPartyCreateForm variant="customer" cancelPath={ROUTES.customerList} />
}
