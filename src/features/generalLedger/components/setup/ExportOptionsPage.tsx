import { Download } from 'lucide-react'
import { JsonFormPage } from '../JsonFormPage'
import { loadExportOptions, saveExportOptions } from '../../setupFormsFapi'

// accountancy/fapi/export_options.php — the real export settings (model, file prefix, format, separator, end of line, date format).
// Modify posts action=update; the backend stores the ones the chosen model allows.
export function ExportOptionsPage() {
  return <JsonFormPage icon={Download} title="Export Options" queryKey="/accountancy/admin/export.php" load={loadExportOptions} save={saveExportOptions} />
}
