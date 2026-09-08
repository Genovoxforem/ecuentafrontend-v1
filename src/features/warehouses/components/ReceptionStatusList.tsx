import { PackageCheck } from 'lucide-react'
import { InertListPage } from '../../../shared/components/forms/InertListPage'

const COLUMNS = ['Ref.', 'Ref. Vendor', 'Third-Party', 'City', 'Zip Code', 'Planned Date Of Delivery', 'Status', 'Billed']

// reception/ has no json_encode anywhere on this backend (grepped the whole
// directory) — unlike expedition/, which turned out to have a real
// shipment-sidebar-list-ajax.php. No hidden API exists here, so this stays
// honestly empty via the shared InertListPage shell instead of a bare
// unexplained "No Data Available" table.
export function ReceptionStatusList({ title = 'List Of Receptions' }: { title?: string }) {
  return <InertListPage icon={PackageCheck} title={title} sourcePath="reception/list.php" columns={COLUMNS} />
}
