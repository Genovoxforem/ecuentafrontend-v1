import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, Plus, Trash2, LoaderCircle, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { formatDate } from '../../../utils/format'
import { useTasksList, useDeleteTask, type TaskRow } from '../tasks.queries'
import { ROUTES } from '../../../routes'

function formatWorkload(seconds: number | null) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return `${h}h${m ? ` ${m}m` : ''}`
}

type SortKey = 'ref' | 'label' | 'dateStart' | 'dateEnd' | 'projectRef' | 'workload' | 'progress'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Task Ref.', key: 'ref' },
  { label: 'Task Label', key: 'label' },
  { label: 'Start Date', key: 'dateStart' },
  { label: 'Deadline', key: 'dateEnd' },
  { label: 'Project Ref.', key: 'projectRef' },
  { label: 'Planned Workload', key: 'workload' },
  { label: 'Progress', key: 'progress' },
]
const COLUMN_LABELS = [...COLUMNS.map((c) => c.label), 'Actions']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(t: TaskRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return t.ref || ''
    case 'label':
      return t.label
    case 'dateStart':
      return t.dateStart ? new Date(t.dateStart).getTime() : 0
    case 'dateEnd':
      return t.dateEnd ? new Date(t.dateEnd).getTime() : 0
    case 'projectRef':
      return t.projectRef || ''
    case 'workload':
      return t.plannedWorkload ?? 0
    case 'progress':
      return t.progress ?? -1
  }
}

function matchesSearch(t: TaskRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [t.ref || '', t.label, t.projectRef || ''].some((f) => f.toLowerCase().includes(q))
}

// Real GET/DELETE /api/project-tasks/ data (see tasks.queries.ts), against
// Dolibarr's real Task class.
export function TasksListPage() {
  const { data, isLoading, isError, error } = useTasksList()
  const deleteTask = useDeleteTask()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [rowError, setRowError] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => (data?.items ?? []).filter((t) => matchesSearch(t, search)), [data, search])
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<TaskRow, SortKey>(filteredRows, sortValue)
  const pageRows = sortedRows.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function handleDelete(id: number, ref: string | null) {
    if (!window.confirm(`Delete task ${ref || `#${id}`}? This cannot be undone.`)) return
    setRowError('')
    setPendingId(id)
    deleteTask.mutate(id, {
      onSettled: () => setPendingId(null),
      onError: (err) => setRowError(err instanceof Error ? err.message : 'Failed to delete task — it may have time-spent entries linked to it.'),
    })
  }

  function getExportData() {
    const rows = sortedRows.map((t) => [
      t.ref || '—',
      t.label,
      t.dateStart ? formatDate(t.dateStart) : '—',
      t.dateEnd ? formatDate(t.dateEnd) : '—',
      t.projectRef || '',
      formatWorkload(t.plannedWorkload),
      t.progress != null ? `${t.progress}%` : '—',
    ])
    return { headers: COLUMNS.map((c) => c.label), rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ListChecks size={20} className="text-brand" /> Tasks/Activities
        </h2>
        <Link to={ROUTES.projectTaskCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Task
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load tasks.'}</Card>}
        {rowError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{rowError}</Card>}

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="Tasks-Activities" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                      {col.label}
                    </Th>
                  ))}
                  <Th align="right">Actions</Th>
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="py-4 px-4 text-text-faint italic">
                      Loading…
                    </td>
                  </tr>
                ) : !data || data.items.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="py-4 px-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="py-4 px-4 text-text-faint italic">
                      No tasks match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageRows.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 px-4 text-brand whitespace-nowrap">{t.ref || '—'}</td>
                      <td className="py-2.5 px-4 text-text!">{t.label}</td>
                      <td className="py-2.5 px-4 text-text-muted">{t.dateStart ? formatDate(t.dateStart) : '—'}</td>
                      <td className="py-2.5 px-4 text-text-muted">{t.dateEnd ? formatDate(t.dateEnd) : '—'}</td>
                      <td className="py-2.5 px-4 text-text-muted">{t.projectRef}</td>
                      <td className="py-2.5 px-4 text-text-muted">{formatWorkload(t.plannedWorkload)}</td>
                      <td className="py-2.5 px-4 text-text-muted">{t.progress != null ? `${t.progress}%` : '—'}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          title="Delete"
                          disabled={pendingId === t.id}
                          onClick={() => handleDelete(t.id, t.ref)}
                          className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger disabled:opacity-40"
                        >
                          {pendingId === t.id && deleteTask.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
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
