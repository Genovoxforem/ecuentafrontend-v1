import { PayRunDetail } from '../../features/payrollV2/components/PayRunDetail'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayRunDetailModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayRunDetail />
    </div>
  )
}
