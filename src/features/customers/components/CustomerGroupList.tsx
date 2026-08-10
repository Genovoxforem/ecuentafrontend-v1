import { useMemo, useState } from 'react'
import { Layers, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'

interface CustomerGroupRow {
  label: string
  discountMethod: string
  discountType: string
  description: string
}

// Visual scaffold — Customer Group (a discount-tier lookup, distinct from
// the local-only "Customer Group" select shown on the third-party create
// form) isn't modeled anywhere in this app yet, so this is static
// placeholder data rather than a real collection.
const GROUPS: CustomerGroupRow[] = [{ label: 'Yyyyy', discountMethod: 'Product Price', discountType: 'N/A', description: '' }]

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(group: CustomerGroupRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [group.label, group.discountMethod, group.discountType].some((field) => field.toLowerCase().includes(q))
}

export function CustomerGroupList() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredGroups = useMemo(() => GROUPS.filter((g) => matchesSearch(g, search)), [search])
  const pageGroups = filteredGroups.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Layers size={20} className="text-brand" /> Customer Group List
        </h2>
        <button type="button" disabled title="Not built yet" className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white opacity-60 cursor-default">
          <Plus size={14} /> Customer Group
        </button>
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
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
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
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={6}>
                      {search ? `No customer groups match "${search}".` : 'No Data Available In Table'}
                    </td>
                  </tr>
                ) : (
                  pageGroups.map((g, i) => (
                    <tr key={g.label} className="border-b border-border">
                      <td className="px-4 py-3 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3 text-brand">{g.label}</td>
                      <td className="px-4 py-3 text-text-muted">{g.discountMethod}</td>
                      <td className="px-4 py-3 text-text-muted">{g.discountType}</td>
                      <td className="px-4 py-3 text-text-muted">{g.description || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" disabled title="Not built yet" className="p-1.5 rounded-md text-text-faint cursor-default">
                            <Pencil size={14} />
                          </button>
                          <button type="button" disabled title="Not built yet" className="p-1.5 rounded-md text-text-faint cursor-default">
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
