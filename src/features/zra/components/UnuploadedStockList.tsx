import { useState } from 'react'
import { Boxes, LoaderCircle } from 'lucide-react'
import { useUnuploadedStockMovements, useUploadStockMovementsToZra } from '../zraLists.queries'
import { ListHeader, ListPagination, SearchBox, TableShell, EmptyRow, PER_PAGE } from './ZraListChrome'
import { isBackendUnavailable, BackendUnavailableInline } from '../../../shared/components/BackendUnavailable'

export function UnuploadedStockList() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const { data, isLoading, isError, error } = useUnuploadedStockMovements({ page, perPage: PER_PAGE, search })
  const upload = useUploadStockMovementsToZra()
  const rows = data?.items ?? []
  const total = data?.total ?? 0

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleUpload() {
    if (selected.size === 0) return
    const confirmed = window.confirm(
      `This will submit ${selected.size} stock movement(s) to the live ZRA government tax gateway. This is a real, non-repeatable filing. Continue?`,
    )
    if (!confirmed) return
    upload.mutate(Array.from(selected), {
      onSuccess: (result) => {
        if (result.succeeded) {
          setSelected(new Set())
        }
      },
    })
  }

  return (
    <div className="space-y-4">
      <ListHeader
        icon={<Boxes size={20} className="text-brand" />}
        title="Un-Uploaded Stock Movements"
        count={data?.total}
        action={
          <button
            type="button"
            onClick={handleUpload}
            disabled={selected.size === 0 || upload.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50"
          >
            {upload.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
            Upload TO ZRA ({selected.size})
          </button>
        }
      />

      {upload.isSuccess && (
        <p className={`text-sm ${upload.data.succeeded ? 'text-success-fg' : 'text-danger'}`}>
          {upload.data.succeeded ? 'Stock movements uploaded to ZRA successfully' : upload.data.statusMessage || 'Server Error! Please Contact Administrator'}
        </p>
      )}
      {upload.isError && (
        isBackendUnavailable(upload.error) ? (
          <BackendUnavailableInline feature="Uploading stock movements to ZRA" />
        ) : (
          <p className="text-sm text-danger">{upload.error instanceof Error ? upload.error.message : 'Upload failed — please try again.'}</p>
        )
      )}

      <div className="max-w-sm">
        <SearchBox
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={() => {
            setPage(1)
            setSearch(searchInput.trim())
          }}
          placeholder="Search product, batch, inventory code…"
        />
      </div>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-alt">
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-3 py-3 w-8"></th>
              <th className="font-medium px-3 py-3">Date</th>
              <th className="font-medium px-3 py-3">Product Ref</th>
              <th className="font-medium px-3 py-3">Product Label</th>
              <th className="font-medium px-3 py-3">Batch</th>
              <th className="font-medium px-3 py-3">Warehouse</th>
              <th className="font-medium px-3 py-3">Author</th>
              <th className="font-medium px-3 py-3">Inv./Mov. Code</th>
              <th className="font-medium px-3 py-3">Type</th>
              <th className="font-medium px-3 py-3">Qty</th>
            </tr>
          </thead>
          <tbody>
            <EmptyRow
              colSpan={10}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={rows.length === 0}
              emptyLabel="No unuploaded stock movements found."
              feature="Un-Uploaded Stock Movements"
            />
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} />
                </td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.date}</td>
                <td className="px-3 py-3 text-text! font-medium">{row.productRef}</td>
                <td className="px-3 py-3 text-text-muted">{row.productLabel}</td>
                <td className="px-3 py-3 text-text-muted">{row.batch || '-'}</td>
                <td className="px-3 py-3 text-text-muted">{row.warehouseRef || '-'}</td>
                <td className="px-3 py-3 text-text-muted">{row.authorName}</td>
                <td className="px-3 py-3 text-text-muted">{row.inventoryCode}</td>
                <td className="px-3 py-3 text-text-muted">{row.movementType}</td>
                <td className="px-3 py-3 text-text-muted">
                  {row.qty > 0 ? '+' : ''}
                  {row.qty}
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
