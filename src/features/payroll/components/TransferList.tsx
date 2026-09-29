import { ArrowRightLeft } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Transfers page — see PayrollLegacyList.
export function TransferList() {
  return <PayrollLegacyList listKey="transfers" icon={ArrowRightLeft} title="Transfers" addLabel="Add Transfer" addPath={ROUTES.payrollEmployeeTransfersCreate} />
}
