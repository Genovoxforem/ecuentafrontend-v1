import { useState } from 'react'
import { Package } from 'lucide-react'
import { useUnuploadedProductsList } from '../zraLists.queries'
import { ListHeader, ListPagination, SearchBox, TableShell, EmptyRow, PER_PAGE } from './ZraListChrome'

// Real POST product/allproducts_ajax.php?zrastatus=unupload data (see
// zraLists.queries.ts) — confirmed live against llx_product WHERE
// p.zracode != '000' OR p.zracode IS NULL, matching the real "Un-uploaded
// Products/services" page. This page never had a backend wired at all
// before (not even on the old ecnta10 instance), so this is a fresh build.
// The real "Upload Products" action itself has not been traced/wired —
// only the list is real here.
export function UnuploadProductsList() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error } = useUnuploadedProductsList({ page, perPage: PER_PAGE, search })
  const rows = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-4">
      <ListHeader icon={<Package size={20} className="text-brand" />} title="Un-uploaded Products/services" count={total} />

      <div className="max-w-sm">
        <SearchBox
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={() => {
            setPage(1)
            setSearch(searchInput.trim())
          }}
          placeholder="Search ref, label, barcode…"
        />
      </div>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-alt">
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-3 py-3">Product</th>
              <th className="font-medium px-3 py-3">VAT Code</th>
              <th className="font-medium px-3 py-3">Price</th>
              <th className="font-medium px-3 py-3">Country</th>
              <th className="font-medium px-3 py-3">Created Date</th>
              <th className="font-medium px-3 py-3">ZRA Status</th>
            </tr>
          </thead>
          <tbody>
            <EmptyRow
              colSpan={6}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={rows.length === 0}
              emptyLabel="No un-uploaded products found."
              feature="Un-uploaded Products/services"
            />
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3 text-text! font-medium">
                  {row.productUrl ? (
                    <a href={row.productUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                      {row.name}
                    </a>
                  ) : (
                    row.name
                  )}
                </td>
                <td className="px-3 py-3 text-text-muted">{row.vatCode || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.priceLabel || '-'}</td>
                <td className="px-3 py-3 text-text-muted">{row.country || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.createdDate}</td>
                <td className="px-3 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-warning-bg text-warning-fg">{row.zraStatusMessage || 'Not uploaded'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <ListPagination page={page} perPage={PER_PAGE} total={total} onPageChange={setPage} />
    </div>
  )
}
