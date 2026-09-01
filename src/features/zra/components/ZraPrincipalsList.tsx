import { useState } from 'react'
import { Users } from 'lucide-react'
import { useZraPrincipals, type ZraPrincipal } from '../zra.queries'
import { ListHeader, ListPagination, EmptyRow } from './ZraListChrome'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'

const dash = (v: string | number | null | undefined) => (v === '' || v === null || v === undefined ? '-' : v)

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

type SortKey = 'id' | 'tpin' | 'tin' | 'name' | 'address' | 'email' | 'telephone' | 'registerDate' | 'modifyDate' | 'accountNo'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Id', key: 'id' },
  { label: 'Tpin', key: 'tpin' },
  { label: 'Tin', key: 'tin' },
  { label: 'Name', key: 'name' },
  { label: 'Address', key: 'address' },
  { label: 'Email', key: 'email' },
  { label: 'Telephone No', key: 'telephone' },
  { label: 'Register Date', key: 'registerDate' },
  { label: 'Modify Date', key: 'modifyDate' },
  { label: 'AccountNo', key: 'accountNo' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)

function sortValue(item: ZraPrincipal, key: SortKey): string {
  return item[key]
}

// Real "RVAT transactions" / Principals page (custom/zra/rvat_agent.php) —
// live call to the real ZRA gateway's /trnsSales/selectPrincipals endpoint
// on every "Fetch Details" click — see zra.queries.ts's useZraPrincipals.
// An empty search (matching the real page's own default) commonly comes
// back as a real "001-There is no search result" response from ZRA itself.
// The gateway returns every matching principal in one response (no
// page/perPage params of its own), so pagination below is applied
// client-side over that already-fetched real array, same as the sort.
export function ZraPrincipalsList() {
  const [lastReqDtInput, setLastReqDtInput] = useState('')
  const [lastReqDt, setLastReqDt] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(PAGE_SIZE_OPTIONS[2])

  const { data, isLoading, isError, error } = useZraPrincipals(lastReqDt)
  const items = data?.items ?? []
  const { sorted: sortedItems, sort, toggleSort } = useSortableRows<ZraPrincipal, SortKey>(items, sortValue)
  const pageItems = sortedItems.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: COLUMN_LABELS,
      rows: sortedItems.map((item) => [
        String(dash(item.id)),
        String(dash(item.tpin)),
        String(dash(item.tin)),
        String(dash(item.name)),
        String(dash(item.address)),
        String(dash(item.email)),
        String(dash(item.telephone)),
        String(dash(item.registerDate)),
        String(dash(item.modifyDate)),
        String(dash(item.accountNo)),
      ]),
    }
  }

  return (
    // Full available height — see PendingPurchaseInvoicesList.tsx for the write-up on why
    // the sticky header block and ListPagination are flex-column siblings around the one
    // scrolling middle region, instead of a short fixed-height box.
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="sticky -top-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-b border-border space-y-4">
        <ListHeader icon={<Users size={20} className="text-brand" />} title="RVAT transactions" count={items.length} />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Last Request Date</span>
              <input
                type="text"
                value={lastReqDtInput}
                onChange={(e) => setLastReqDtInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setLastReqDt(lastReqDtInput.trim() || undefined)}
                className="h-10 w-64 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
            <button
              type="button"
              onClick={() => setLastReqDt(lastReqDtInput.trim() || undefined)}
              className="h-10 px-4 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90"
            >
              Fetch Details
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
                className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              entries per page
            </label>
            <TableExportButtons title="RVAT Transactions" getExportData={getExportData} />
          </div>
        </div>

        {data?.resultMessage && (
          <p className={`text-sm ${data.resultCode === '000' ? 'text-text-faint' : 'text-warning-fg'}`}>
            {data.resultCode}-{data.resultMessage}
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto my-4 rounded-xl border border-border bg-surface-alt soft-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <TheadRow>
              {COLUMNS.map((col) => (
                <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                  {col.label}
                </Th>
              ))}
            </TheadRow>
          </thead>
          <tbody>
            <EmptyRow
              colSpan={COLUMN_LABELS.length}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={items.length === 0}
              emptyLabel="No data available."
              feature="RVAT transactions"
            />
            {pageItems.map((item, i) => (
              <tr key={`${item.id}-${i}`} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3 text-text-muted">{dash(item.id)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.tpin)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.tin)}</td>
                <td className="px-3 py-3 text-text! font-medium">{dash(item.name)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.address)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.email)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.telephone)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.registerDate)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.modifyDate)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.accountNo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} perPage={perPage} total={items.length} onPageChange={setPage} />
    </div>
  )
}
