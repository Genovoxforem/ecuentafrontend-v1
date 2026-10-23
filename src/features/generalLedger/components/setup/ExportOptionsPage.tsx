import { Download } from 'lucide-react'
import { LegacyFormPage } from '../LegacyFormPage'
import { loadExportOptions, saveExportOptions } from '../../setupFormsFapi'

// accountancy/fapi/export_options.php — the real export settings (model, file prefix, format, separator, end of line, date format).
// Modify posts action=update; the backend stores the ones the chosen model allows.
export function ExportOptionsPage() {
  return <LegacyFormPage icon={Download} title="Export Options" path="/accountancy/admin/export.php" anchor="ACCOUNTING_EXPORT_MODELCSV" load={loadExportOptions} save={saveExportOptions} />
}
