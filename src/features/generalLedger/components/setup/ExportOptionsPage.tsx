import { Download } from 'lucide-react'
import { DisabledFormPage } from '../../../../shared/components/forms/DisabledFormPage'

// accountancy/admin/export.php — a single settings form (export model +
// per-model CSV options), reads/writes Dolibarr constants directly, no
// list, no JSON.
export function ExportOptionsPage() {
  return (
    <DisabledFormPage
      icon={Download}
      title="Export Options"
      sourcePath="accountancy/admin/export.php"
      sections={[
        {
          fields: [
            { label: 'File Prefix' },
            { label: 'Export Model', type: 'select' },
            { label: 'Format' },
            { label: 'CSV Separator' },
            { label: 'End Of Line' },
            { label: 'Date Format' },
          ],
        },
      ]}
    />
  )
}
