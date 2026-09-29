import { Star } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { PayrollLegacyList } from './PayrollLegacyList'

// The real records of the backend's own Appraisal page — see PayrollLegacyList.
export function AppraisalList() {
  return <PayrollLegacyList listKey="appraisal" icon={Star} title="Appraisal" addLabel="Give Appraisal" addPath={ROUTES.payrollEmployeeAppraisalCreate} />
}
