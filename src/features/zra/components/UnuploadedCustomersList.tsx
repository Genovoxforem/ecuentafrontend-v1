import { useState } from 'react'
import { Users, LoaderCircle } from 'lucide-react'
import { useUnuploadedCustomersList, useUploadCustomersToZra } from '../zraLists.queries'
import { ListHeader, ListPagination, SearchBox, TableShell, EmptyRow, PER_PAGE } from './ZraListChrome'
import { isBackendUnavailable, BackendUnavailableInline } from '../../../shared/components/BackendUnavailable'

export function UnuploadedCustomersList() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const { data, isLoading, isError, error } = useUnuploadedCustomersList({ page, perPage: PER_PAGE, search })
  const upload = useUploadCustomersToZra()
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
      `This will submit ${selected.size} customer/vendor record(s) to the live ZRA government tax gateway. This is a real, non-repeatable filing. Continue?`,
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
        icon={<Users size={20} className="text-brand" />}
        title="ZRA Un-Uploaded Customers/Vendor"
        count={data?.total}
        action={
          <button
            type="button"
            onClick={handleUpload}
            disabled={selected.size === 0 || upload.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50"
          >
            {upload.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
            Upload Selected ({selected.size})
          </button>
        }
      />

      {upload.isSuccess && (
        <p className={`text-sm ${upload.data.succeeded ? 'text-success-fg' : 'text-danger'}`}>
          {upload.data.succeeded ? "Customer's Uploaded In ZRA Server Successfully" : 'Server Error! Please Contact Administrator'}
        </p>
      )}
      {upload.isError && (
        isBackendUnavailable(upload.error) ? (
          <BackendUnavailableInline feature="Uploading customers/vendors to ZRA" />
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
          placeholder="Search name, TPIN…"
        />
      </div>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-alt">
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-3 py-3 w-8"></th>
              <th className="font-medium px-3 py-3">Third-Party Name</th>
              <th className="font-medium px-3 py-3">Role</th>
              <th className="font-medium px-3 py-3">Country</th>
              <th className="font-medium px-3 py-3">Tpin</th>
              <th className="font-medium px-3 py-3">Phone</th>
              <th className="font-medium px-3 py-3">Created</th>
              <th className="font-medium px-3 py-3">ZRA Status</th>
            </tr>
          </thead>
          <tbody>
            <EmptyRow
              colSpan={8}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={rows.length === 0}
              emptyLabel="No unuploaded records found."
              feature="ZRA Un-Uploaded Customers/Vendor"
            />
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} />
                </td>
                <td className="px-3 py-3 text-text! font-medium">{row.name}</td>
                <td className="px-3 py-3 text-text-muted">{row.role}</td>
                <td className="px-3 py-3 text-text-muted">{row.countryLabel || '-'}</td>
                <td className="px-3 py-3 text-text-muted">{row.tpin || '-'}</td>
                <td className="px-3 py-3 text-text-muted">{row.phone || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">
                  {row.createdAt}
                  <div className="text-text-faint">by {row.creatorName}</div>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${row.zraSucceeded ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}
                  >
                    {row.zraStatusMessage || (row.zraSucceeded ? 'Succeeded' : 'Unsynced')}
                  </span>
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
