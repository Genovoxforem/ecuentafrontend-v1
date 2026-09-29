import { useMemo, useState, type ComponentType } from 'react'
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Pencil,
  Trash2,
  ShoppingCart,
  Sparkles,
  Landmark,
  Users,
  Package,
  Settings,
  BarChart3,
} from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../../shared/components/ListPagination'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { useDictList, useToggleDictStatus, useDeleteDictRow } from '../../dolibarrDict.queries'

const PATH = '/accountancy/admin/journals_list.php?id=35'

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-text-faint'

// Nature Of Journal values as they come back verbatim from the real page's
// own dropdown/cell text — icon + color are a purely cosmetic mapping on
// top of that real string, not a separate data source. Unrecognized values
// (a custom nature an admin typed on the backend) fall back to a neutral
// badge rather than being hidden.
const NATURE_META: Record<string, { icon: ComponentType<{ size?: number; className?: string }>; className: string }> = {
  Purchases: { icon: ShoppingCart, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  'Has-New': { icon: Sparkles, className: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' },
  Bank: { icon: Landmark, className: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  'Expenses Report': { icon: Users, className: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  Inventory: { icon: Package, className: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400' },
  'Miscellaneous Operations': { icon: Settings, className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400' },
  Sales: { icon: BarChart3, className: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
}
const DEFAULT_NATURE_META = { icon: Settings, className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400' }

function NatureBadge({ label }: { label: string }) {
  const meta = NATURE_META[label] ?? DEFAULT_NATURE_META
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${meta.className}`}>
      <Icon size={13} /> {label || '—'}
    </span>
  )
}

function StatusToggle({ active, disabled, onClick }: { active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={active ? 'Disable' : 'Enable'}
      className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${active ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-700'}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${active ? 'translate-x-[18px]' : 'translate-x-1'}`} />
      </span>
      <span className={`text-xs font-medium ${active ? 'text-success-fg' : 'text-text-faint'}`}>{active ? 'Active' : 'Inactive'}</span>
    </button>
  )
}

// accountancy/admin/journals_list.php?id=35 — real, scraped rows
// (llx_accounting_journal). Enable/Disable and Delete call the exact
// already-tokened GET link scraped off each row (see
// dolibarrDictParser.ts's own top comment); Add/Edit are real classic
// form-POSTs too, but this page's own field set (Code/Label/Nature) isn't
// reproduced as a working submit here — the form below is shown for
// layout parity only and stays disabled.
export function AccountingJournalsList() {
  const { data: rows, isLoading, isError, error, refetch } = useDictList(PATH)
  const toggle = useToggleDictStatus(PATH)
  const del = useDeleteDictRow(PATH)
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 15

  const filteredRows = useMemo(() => {
    const all = rows ?? []
    const q = search.trim().toLowerCase()
    return q ? all.filter((r) => r.cells.some((c) => c.toLowerCase().includes(q))) : all
  }, [rows, search])
  const pageRows = filteredRows.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-brand to-cyan-500 px-5 py-5 sm:px-6 sm:py-6">
        <div className="relative flex items-center gap-4">
          <span className="shrink-0 w-12 h-12 rounded-xl bg-white/15 backdrop-blur grid place-items-center text-white">
            <FileText size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">Dictionary setup - Accounting journals</h2>
            <p className="text-sm text-white/80 mt-0.5">Define and manage the accounting journals used in the system.</p>
          </div>
        </div>
      </div>

      <Card className="!h-auto space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
              <Plus size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-text!">Add New Journal</p>
              <p className="text-xs text-text-faint">Enter the journal details and click Add to create a new journal.</p>
            </div>
          </div>
          <button
            type="button"
            disabled
            title="Add isn't wired — accountancy/admin/journals_list.php's Add is a classic full-page form-POST, no JSON."
            className="flex items-center gap-1.5 rounded-lg bg-brand/50 px-4 py-2 text-sm font-medium text-white cursor-not-allowed"
          >
            <Plus size={14} /> Add Journal
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Code <span className="text-danger">*</span>
            </span>
            <input disabled placeholder="e.g. AC" className={`${inputCls} cursor-not-allowed`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Label <span className="text-danger">*</span>
            </span>
            <input disabled placeholder="e.g. Purchase Journal" className={`${inputCls} cursor-not-allowed`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Nature of Journal <span className="text-danger">*</span>
            </span>
            <select disabled defaultValue="Miscellaneous Operations" className={`${inputCls} cursor-not-allowed`}>
              <option>Miscellaneous Operations</option>
            </select>
          </label>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
              <FileText size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-text!">Accounting Journals</p>
              <p className="text-xs text-text-faint">List of accounting journals configured in the system.</p>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search journals..."
              className="w-56 h-9 pl-8 pr-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5 w-10">#</th>
                <th className="font-medium px-4 py-2.5">Code</th>
                <th className="font-medium px-4 py-2.5">Label</th>
                <th className="font-medium px-4 py-2.5">Nature of Journal</th>
                <th className="font-medium px-4 py-2.5">Status</th>
                <th className="font-medium px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-text-faint">
                    <Loader2 size={16} className="inline animate-spin" /> Loading…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-danger">
                    {error instanceof Error ? error.message : "Couldn't load the list."}{' '}
                    <button type="button" onClick={() => refetch()} className="underline">
                      Retry
                    </button>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-text-faint italic">
                    No Data Available In Table
                  </td>
                </tr>
              ) : (
                pageRows.map((r, i) => (
                  <tr key={r.rowid} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-2.5 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block rounded-md bg-brand/10 text-brand px-2 py-0.5 text-xs font-semibold">{r.cells[0] || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{r.cells[1] || '—'}</td>
                    <td className="px-4 py-2.5">
                      <NatureBadge label={r.cells[2] || ''} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusToggle active={r.active} disabled={!r.toggleUrl || toggle.isPending} onClick={() => r.toggleUrl && toggle.mutate(r.toggleUrl)} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled
                          title="Edit isn't wired — this page's Edit is a classic full-page form-POST, no JSON."
                          className="p-1.5 rounded-md bg-brand text-white opacity-50 cursor-not-allowed"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={!r.deleteUrl || del.isPending}
                          onClick={async () => {
                            if (r.deleteUrl && (await confirm({ title: 'Delete Entry?', message: 'Delete this entry on the real backend?' }))) del.mutate(r.deleteUrl)
                          }}
                          title="Delete"
                          className="p-1.5 rounded-md bg-danger text-white disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />
      </Card>
    </div>
  )
}
