import { ThirdPartyCreateForm } from '../../shared/components/thirdParty/ThirdPartyCreateForm'
import { ROUTES } from '../../routes'

export function VendorCreateModule() {
  return <ThirdPartyCreateForm variant="vendor" cancelPath={ROUTES.vendorList} />
}
