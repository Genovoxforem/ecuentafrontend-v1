import { ThirdPartyCreateForm } from '../../shared/components/thirdParty/ThirdPartyCreateForm'
import { ROUTES } from '../../routes'

export function ProspectCreateModule() {
  return <ThirdPartyCreateForm variant="prospect" cancelPath={ROUTES.prospectList} />
}
