import { useMemo, useState, type ComponentType } from 'react'
import { Loader2, Plus, Power, Trash2 } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../../shared/components/ListPagination'
import { useDictList, useToggleDictStatus, useDeleteDictRow } from '../../dolibarrDict.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Shared real list for every Dolibarr generic-dictionary page in this
// module — see dolibarrDictParser.ts's own top comment for which pages
// share this exact template and why Add/Edit stay unwired (each
// dictionary's own field set differs too much to reproduce generically).
export function DictListPage({
  icon: Icon,
  title,
  path,
  columns,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  path: string
  columns: string[]
}) {
  const { data: rows, isLoading, isError, error, refetch } = useDictList(path)
  const toggle = useToggleDictStatus(path)
  const del = useDeleteDictRow(path)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const filteredRows = useMemo(() => {
    const all = rows ?? []
    const q = search.trim().toLowerCase()
    return q ? all.filter((r) => r.cells.some((c) => c.toLowerCase().includes(q))) : all
  }, [rows, search])
  const pageRows = filteredRows.slice((page - 1) * perPage, page * perPage)

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  return (
    // -m-6/-mx-6/-top-6: same sticky-header pattern as ManualShiftAttendanceForm.tsx /
    // StickyFormShell.tsx — sticky's offset is measured from the scrolling ancestor's
    // padding edge, so the negative offsets compensate for AppShell main's own p-6 inset.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Icon size={20} className="text-brand" /> {title}
        </h2>
        <button
          type="button"
          disabled
          title="Add/Edit aren't wired — each dictionary's own field set differs too much to reproduce generically here"
          className="flex items-center gap-1.5 rounded-lg bg-neutral-bg px-3 py-2 text-sm font-medium text-text-faint opacity-70 cursor-not-allowed"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4">
        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search"
              className={`w-64 ${inputCls}`}
            />
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="ml-auto text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  {columns.map((col) => (
                    <th key={col} className="font-medium px-3 py-2 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin" /> Loading…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-3 py-4 text-danger">
                      {error instanceof Error ? error.message : "Couldn't load the list."}{' '}
                      <button type="button" onClick={() => refetch()} className="underline">
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-3 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.rowid} className="border-b border-border last:border-0">
                      {r.cells.map((c, i) => (
                        <td key={i} className="px-3 py-2 text-text-muted">
                          {c || '—'}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.active ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}
                        >
                          {r.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!r.toggleUrl || toggle.isPending}
                            onClick={() => r.toggleUrl && toggle.mutate(r.toggleUrl)}
                            title={r.active ? 'Disable' : 'Enable'}
                            className="text-text-muted hover:text-brand disabled:opacity-40"
                          >
                            <Power size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={!r.deleteUrl || del.isPending}
                            onClick={() => {
                              if (r.deleteUrl && window.confirm('Delete this entry on the real backend? This cannot be undone.')) del.mutate(r.deleteUrl)
                            }}
                            title="Delete"
                            className="text-danger hover:text-danger-fg disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
