import { RotateCcw } from 'lucide-react'
import { InertListPage } from '../../../shared/components/forms/InertListPage'

const COLUMNS = ['Sl.No', 'Ref.Id', 'Order Status', 'Created Date', 'Action']

// Same confirmed-no-API gap as ReceptionStatusList — reception/ has no
// json_encode endpoint anywhere on this backend.
export function CreditNoteOrderListPage() {
  return <InertListPage icon={RotateCcw} title="Return List" sourcePath="reception/list.php?search_status=-1" columns={COLUMNS} />
}
