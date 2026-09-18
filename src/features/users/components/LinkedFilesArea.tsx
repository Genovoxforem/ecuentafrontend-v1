import { useState } from 'react'
import { Link2, FolderPlus, RefreshCw, ExternalLink } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'

// Automatic Tree mirrors the real backend's own fixed list — one directory
// (and real ecm/index_auto.php?module=<slug> link) per Dolibarr module that
// accepts attachments, confirmed live against the real page's own tree
// markup (`<a class="fmdirlia" href="/ecm/index_auto.php?module=...">`),
// not guessed from screenshots — labels/casing match that markup exactly.
const AUTOMATIC_DIRECTORIES = [
  { module: 'banque', label: 'Bank account' },
  { module: 'recruitment-recruitmentcandidature', label: 'Candidatures' },
  { module: 'contract', label: 'Contracts' },
  { module: 'invoice', label: 'Customers invoices' },
  { module: 'expensereport', label: 'Expense reports' },
  { module: 'fichinter', label: 'Interventions' },
  { module: 'holiday', label: 'Leave' },
  { module: 'product', label: 'Products and Services' },
  { module: 'project', label: 'Projects' },
  { module: 'order_supplier', label: 'Purchase orders' },
  { module: 'propal', label: 'Quotations' },
  { module: 'order', label: 'Sales Orders' },
  { module: 'tax', label: 'Social or fiscal taxes' },
  { module: 'company', label: 'Third-parties' },
  { module: 'user', label: 'Users' },
  { module: 'supplier_proposal', label: 'Vendor Quotation' },
  { module: 'invoice_supplier', label: 'Vendors invoices' },
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
// browser and were never real. Replaced with honest links out to the real
// legacy area (the whole tab, and — for Automatic Tree — each real
// directory link individually) instead of pretending to manage them here.
const LEGACY_MANUAL_URL = '/ecm/index.php'
const LEGACY_AUTOMATIC_URL = '/ecm/index_auto.php'
// Real: the Manual Tree toolbar's own "Add directory" button — confirmed
// live (`href="/ecm/dir_add_card.php?action=create&module=ecm&backtopage=..."`).
const LEGACY_ADD_DIRECTORY_URL = '/ecm/dir_add_card.php?action=create&module=ecm&backtopage=%2Fecm%2Findex.php'

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
          <div className="flex items-center gap-1.5">
            {tab === 'manual' && (
              <a
                href={stripBackendPrefix(LEGACY_ADD_DIRECTORY_URL)}
                target="_blank"
                rel="noreferrer"
                title="Add directory"
                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-hover"
              >
                <FolderPlus size={13} /> Add Directory
              </a>
            )}
            <button
              type="button"
              title="Refresh"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-hover"
            >
              <RefreshCw size={13} />
            </button>
          </div>
          <a
            href={stripBackendPrefix(legacyUrl)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
          >
            Open in Linked Files <ExternalLink size={12} />
          </a>
        </div>

        <div className="border-b border-border">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-faint bg-surface-alt">Directories</p>
          {tab === 'automatic' ? (
            <div className="p-2">
              {AUTOMATIC_DIRECTORIES.map((dir) => (
                <a
                  key={dir.module}
                  href={stripBackendPrefix(`${LEGACY_AUTOMATIC_URL}?module=${dir.module}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-2 py-1 text-sm text-brand hover:underline"
                >
                  {dir.label}
                </a>
              ))}
            </div>
          ) : (
            <p className="px-3 py-3 text-xs text-text-faint">
              No manual directories are shown here — this SPA has no JSON API to list them.{' '}
              <a href={stripBackendPrefix(LEGACY_MANUAL_URL)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                Manage them in Linked Files
              </a>
              .
            </p>
          )}
        </div>

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
              <td className="px-4 py-4 text-text-faint italic" colSpan={3}>
                Select a directory in the tree…
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
