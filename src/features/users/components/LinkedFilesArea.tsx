import { useState } from 'react'
import { Link2, FolderPlus, RefreshCw, Folder } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// Visual scaffold, matching the reference "Linked Files Area" (DMS/ECM) — a
// static folder list rather than a real document store, since there's no
// file-storage backend for this app. Names match the reference's real
// module-linked directories (one per Dolibarr module that can attach
// files), which Manual Tree and Automatic Tree both list identically —
// they're two views of the same storage, not different folder sets.
const DIRECTORIES = [
  'Bank Account',
  'Candidatures',
  'Contracts',
  'Customers Invoices',
  'Expense Reports',
  'Interventions',
  'Products And Services',
  'Projects',
  'Purchase Orders',
  'Quotations',
  'Sales Orders',
  'Social Or Fiscal Taxes',
  'Third-Parties',
  'Users',
  'Vendor Quotation',
  'Vendors Invoices',
]

export function LinkedFilesArea() {
  const [tab, setTab] = useState<'manual' | 'automatic'>('manual')
  const [selectedDir, setSelectedDir] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Link2 size={20} className="text-brand" /> Linked Files Area
      </h2>

      <div className="flex items-center gap-2">
        {(['manual', 'automatic'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              tab === t ? 'bg-brand text-white' : 'bg-surface-alt text-text-muted border border-border hover:bg-surface-hover'
            }`}
          >
            {t === 'manual' ? 'Manual Tree' : 'Automatic Tree'}
          </button>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <button type="button" title="New folder" className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover">
            <FolderPlus size={16} />
          </button>
          <button type="button" title="Refresh" className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover">
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr]">
          <div className="border-b sm:border-b-0 sm:border-r border-border p-2">
            <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-faint">Directories</p>
            {DIRECTORIES.map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setSelectedDir(dir)}
                className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-sm ${
                  selectedDir === dir ? 'bg-brand/10 text-brand font-medium' : 'text-text-muted hover:bg-surface-hover'
                }`}
              >
                <Folder size={14} /> {dir}
              </button>
            ))}
          </div>
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-4 py-2.5">Documents</th>
                  <th className="font-medium px-4 py-2.5">Size</th>
                  <th className="font-medium px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-6 text-text-faint italic" colSpan={3}>
                    {selectedDir ? `No documents in "${selectedDir}" yet.` : 'Select a directory in the tree...'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}
