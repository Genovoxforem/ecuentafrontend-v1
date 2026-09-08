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
  return <ReceptionStatusList title="List Of Receptions" />
}
export function ReceptionDraftModule() {
  return <ReceptionStatusList title="Draft Receptions" />
}
export function ReceptionValidatedModule() {
  return <ReceptionStatusList title="Validated Receptions" />
}
export function ReceptionProcessedModule() {
  return <ReceptionStatusList title="Processed Receptions" />
}
export function ReceptionStatisticsModule() {
  return <ReceptionStatisticsPage />
}
export function CreditNoteOrderListModule() {
  return <CreditNoteOrderListPage />
}
