import { PayrollEmployeesList } from '../../features/payrollV2/components/PayrollEmployeesList'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollEmployeesModule() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PayrollV2Tabs />
      <PayrollEmployeesList />
    </div>
  )
}
