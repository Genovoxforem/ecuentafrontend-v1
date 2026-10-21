import { PayrollReports } from '../../features/payrollV2/components/PayrollReports'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollReportsModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayrollReports />
    </div>
  )
}
