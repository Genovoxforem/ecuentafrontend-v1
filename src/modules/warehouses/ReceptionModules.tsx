import { ReceptionsAreaPage } from '../../features/warehouses/components/ReceptionsAreaPage'
import { ReceptionCreatePage } from '../../features/warehouses/components/ReceptionCreatePage'
import { ReceptionStatusList } from '../../features/warehouses/components/ReceptionStatusList'
import { ReceptionStatisticsPage } from '../../features/warehouses/components/ReceptionStatisticsPage'
import { CreditNoteOrderListPage } from '../../features/warehouses/components/CreditNoteOrderListPage'

export function ReceptionsAreaModule() {
  return <ReceptionsAreaPage />
}
export function ReceptionCreateModule() {
  return <ReceptionCreatePage />
}
export function ReceptionListModule() {
  return <ReceptionStatusList />
}
export function ReceptionDraftModule() {
  return <ReceptionStatusList />
}
export function ReceptionValidatedModule() {
  return <ReceptionStatusList />
}
export function ReceptionProcessedModule() {
  return <ReceptionStatusList />
}
export function ReceptionStatisticsModule() {
  return <ReceptionStatisticsPage />
}
export function CreditNoteOrderListModule() {
  return <CreditNoteOrderListPage />
}
