import { useState } from 'react'
import { Link2, FolderPlus, RefreshCw, Folder, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useLocalCollection } from '../../../shared/localCollection'

// Matches the reference "Linked Files Area" (DMS/ECM)'s real split: Automatic
// Tree is a fixed, read-only list of one directory per Dolibarr module that
// can attach files (never editable — there's no "add" affordance for it in
// the reference app either), while Manual Tree is the user's own
// hand-created folder tree and genuinely starts empty. No file-storage
// backend exists for this app, so there's nothing to list documents from
// either way — both tabs correctly show zero documents once a directory is
// selected, same as the reference's own demo account.
const AUTOMATIC_DIRECTORIES = [
  'Bank Account',
  'Candidatures',
  'Contracts',
  'Customers Invoices',
  'Expense Reports',
  'Interventions',
  'Leave',
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

const MANUAL_FOLDERS_KEY = ['local', 'manual-folders'] as const

export function LinkedFilesArea({ defaultTab = 'manual' }: { defaultTab?: 'manual' | 'automatic' }) {
  const [tab, setTab] = useState<'manual' | 'automatic'>(defaultTab)
  const [selectedDir, setSelectedDir] = useState<string | null>(null)
  const [manualFolders, updateManualFolders] = useLocalCollection<string[]>(MANUAL_FOLDERS_KEY, [])
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const directories = tab === 'automatic' ? AUTOMATIC_DIRECTORIES : manualFolders

  function switchTab(t: 'manual' | 'automatic') {
    setTab(t)
    setSelectedDir(null)
    setCreatingFolder(false)
  }

  function commitNewFolder() {
    const name = newFolderName.trim()
    if (name && !manualFolders.includes(name)) {
      updateManualFolders((current) => [...current, name])
    }
    setNewFolderName('')
    setCreatingFolder(false)
  }

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
            onClick={() => switchTab(t)}
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
          <button
            type="button"
            title={tab === 'manual' ? 'New folder' : 'Automatic Tree is read-only'}
            disabled={tab !== 'manual'}
            onClick={() => setCreatingFolder(true)}
            className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <FolderPlus size={16} />
          </button>
          <button type="button" title="Refresh" onClick={() => setSelectedDir(null)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover">
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr]">
          <div className="border-b sm:border-b-0 sm:border-r border-border p-2">
            <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-faint">Directories</p>
            {creatingFolder && (
              <div className="flex items-center gap-1 px-2 py-1">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNewFolder()
                    if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') }
                  }}
                  onBlur={commitNewFolder}
                  placeholder="Folder name…"
                  className="flex-1 min-w-0 rounded border border-input-border bg-input-bg px-2 py-1 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button type="button" onMouseDown={(e) => { e.preventDefault(); setCreatingFolder(false); setNewFolderName('') }} className="p-1 text-text-faint hover:text-text">
                  <X size={14} />
                </button>
              </div>
            )}
            {directories.length === 0 && !creatingFolder && <p className="px-2 py-2 text-xs text-text-faint italic">No folders yet.</p>}
            {directories.map((dir) => (
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
