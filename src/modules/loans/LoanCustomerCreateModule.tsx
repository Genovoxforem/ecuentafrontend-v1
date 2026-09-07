import { ThirdPartyCreateForm } from '../../shared/components/thirdParty/ThirdPartyCreateForm'
import { ROUTES } from '../../routes'

export function LoanCustomerCreateModule() {
  return <ThirdPartyCreateForm variant="customer" cancelPath={ROUTES.loanCustomerList} />
}
