import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Plus, Search, Pencil, Trash2, Tag } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { useCustomerGroupsSummary, useDeleteCustomerGroup, formatDiscountMethod, type CustomerGroupRow } from '../customerGroups.queries'

const EXPORT_COLUMNS = ['Label', 'Discount Method', 'Discount Type', 'Description']

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

const METHOD_BADGE: Record<number, string> = {
  1: 'bg-warning-bg text-warning-fg',
  2: 'bg-info-bg text-info-fg',
}

const TYPE_LABEL: Record<number, string> = { 0: 'Decrease', 1: 'Increase' }
const TYPE_BADGE: Record<number, string> = { 0: 'bg-success-bg text-success-fg', 1: 'bg-danger-bg text-danger-fg' }

function matchesSearch(group: CustomerGroupRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [group.label, formatDiscountMethod(group), group.description ?? ''].some((field) => field.toLowerCase().includes(q))
}

export function CustomerGroupList() {
  const { data, isLoading } = useCustomerGroupsSummary()
  const deleteGroup = useDeleteCustomerGroup()

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredGroups = useMemo(() => data.groups.filter((g) => matchesSearch(g, search)), [data.groups, search])
  const pageGroups = filteredGroups.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function handleDelete(group: CustomerGroupRow) {
    const confirmed = window.confirm(`Delete customer group "${group.label}"? This can't be undone.`)
    if (!confirmed) return
    deleteGroup.mutate(group.id)
  }

  function getExportData() {
    const rows = filteredGroups.map((g) => [g.label, formatDiscountMethod(g), g.discountMethod === 1 ? TYPE_LABEL[g.discountType] : 'N/A', g.description ?? ''])
    return { headers: EXPORT_COLUMNS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Layers size={20} className="text-brand" /> Customer Group List
        </h2>
        <Link to={ROUTES.customerGroupCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Customer Group
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
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
            <TableExportButtons title="Customer Group List" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-4 py-2.5 w-14">S.No</th>
                  <th className="font-medium px-4 py-2.5">Label</th>
                  <th className="font-medium px-4 py-2.5">Discount Method</th>
                  <th className="font-medium px-4 py-2.5">Discount Type</th>
                  <th className="font-medium px-4 py-2.5">Description</th>
                  <th className="font-medium px-4 py-2.5 w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-text-faint" colSpan={6}>
                      Loading…
                    </td>
                  </tr>
                ) : data.groups.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10" colSpan={6}>
                      <div className="flex flex-col items-center gap-2 text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                          <Tag size={18} />
                        </span>
                        <p className="text-text-muted">No customer groups yet.</p>
                        <Link to={ROUTES.customerGroupCreate} className="text-sm text-brand hover:underline">
                          + Add your first customer group
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={6}>
                      No customer groups match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageGroups.map((g, i) => (
                    <tr key={g.id} className="border-b border-border hover:bg-surface-hover/60">
                      <td className="px-4 py-3 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3">
                        <Link to={ROUTES.customerGroupEdit.replace(':id', String(g.id))} className="font-medium text-brand hover:underline">
                          {g.label}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${g.discountMethod ? METHOD_BADGE[g.discountMethod] : 'bg-neutral-bg text-neutral-fg'}`}>
                          {formatDiscountMethod(g)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {g.discountMethod === 1 ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[g.discountType]}`}>{TYPE_LABEL[g.discountType]}</span>
                        ) : (
                          <span className="text-text-faint">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{g.description || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to={ROUTES.customerGroupEdit.replace(':id', String(g.id))}
                            title="Edit"
                            className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand"
                          >
                            <Pencil size={14} />
                          </Link>
                          <button type="button" title="Delete" onClick={() => handleDelete(g)} className="p-1.5 rounded-md text-text-faint hover:bg-danger-bg hover:text-danger-fg">
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
      <ListPagination page={page} perPage={perPage} total={filteredGroups.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
