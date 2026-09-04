import { useState } from 'react'
import { Link2, Folder, FolderTree, ExternalLink } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'

// Automatic Tree mirrors the real backend's own fixed list — one directory
// per Dolibarr module that accepts attachments (ecm/index_auto.php's own
// array of enabled modules, read directly), so this list is real reference
// data, not a guess.
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

// Neither tab has a JSON API on this backend: ecm/index.php (Manual Tree)
// and ecm/index_auto.php (Automatic Tree) both print raw HTML/jQuery
// "filetree" markup (core/ajax/ajaxdirtree.php serves the tree nodes as
// <ul>/<li> fragments, not JSON), and folder create/delete there is a
// classic <form> POST — confirmed by reading all three files directly, no
// json_encode/application/json anywhere under ecm/. A real, server-side
// file store backs both (disk-based, per module dir_output) — this SPA
// just has no way to browse, create, or upload into it yet. An earlier
// version of this page worked around that by faking "Manual Tree" folder
// creation into localStorage — folders that only ever existed in one
// browser and were never real. Replaced with an honest link out to the
// real legacy area instead of pretending to manage them here.
const LEGACY_MANUAL_URL = '/ecm/index.php'
const LEGACY_AUTOMATIC_URL = '/ecm/index_auto.php'

export function LinkedFilesArea({ defaultTab = 'manual' }: { defaultTab?: 'manual' | 'automatic' }) {
  const [tab, setTab] = useState<'manual' | 'automatic'>(defaultTab)
  const legacyUrl = tab === 'manual' ? LEGACY_MANUAL_URL : LEGACY_AUTOMATIC_URL

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
        <div className="flex items-center justify-between gap-2 p-3 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">{tab === 'manual' ? 'Manual Tree' : 'Automatic Tree'}</p>
          <a
            href={stripBackendPrefix(legacyUrl)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
          >
            Open in Linked Files <ExternalLink size={12} />
          </a>
        </div>

        {tab === 'automatic' ? (
          <div className="p-4 space-y-3">
            <p className="text-xs text-text-faint">One folder per module that accepts attachments. This backend has no JSON API to list files inside them — browse those in Linked Files.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {AUTOMATIC_DIRECTORIES.map((dir) => (
                <div key={dir} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-muted">
                  <Folder size={14} className="text-text-faint shrink-0" /> {dir}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
            <FolderTree size={28} className="text-text-faint" />
            <p className="max-w-sm text-sm text-text-faint">This backend has no JSON API for browsing or creating folders here — Manual Tree is managed entirely server-side in the legacy app.</p>
            <a
              href={stripBackendPrefix(LEGACY_MANUAL_URL)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
            >
              Manage in Linked Files <ExternalLink size={12} />
            </a>
          </div>
        )}
      </Card>
    </div>
  )
}
