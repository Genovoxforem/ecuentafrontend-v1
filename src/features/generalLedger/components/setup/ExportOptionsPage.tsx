import { Download } from 'lucide-react'
import { LegacyFormPage } from '../LegacyFormPage'

// accountancy/admin/export.php — the real export settings. The sections, labels and order are the
// backend form's own; Modify posts its action=update and stores them as backend constants.
export function ExportOptionsPage() {
  return <LegacyFormPage icon={Download} title="Export Options" path="/accountancy/admin/export.php" anchor="ACCOUNTING_EXPORT_MODELCSV" />
}
