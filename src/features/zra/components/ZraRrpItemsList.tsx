import { useState } from 'react'
import { Tags } from 'lucide-react'
import { useZraRrpItems, type ZraRrpItem } from '../zra.queries'
import { ListHeader, EmptyRow, PER_PAGE } from './ZraListChrome'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'

const dash = (v: string | number | null | undefined) => (v === '' || v === null || v === undefined ? '-' : v)

type SortKey = 'manufacturerTpin' | 'manufacturerName' | 'itemCode' | 'itemClassCode' | 'itemName' | 'originCountry' | 'packageUnit' | 'quantityUnit' | 'rrp'
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

function sortValue(item: ZraRrpItem, key: SortKey): string | number {
  switch (key) {
    case 'manufacturerTpin':
      return item.manufacturerTpin ?? ''
    case 'manufacturerName':
      return item.manufacturerName ?? ''
    case 'itemCode':
      return item.itemCode ?? ''
    case 'itemClassCode':
      return item.itemClassCode ?? ''
    case 'itemName':
      return item.itemName ?? ''
    case 'originCountry':
      return item.originCountry ?? ''
    case 'packageUnit':
      return item.packageUnit ?? ''
    case 'quantityUnit':
      return item.quantityUnit ?? ''
    case 'rrp':
      return item.rrp ?? ''
  }
}

// Real "RRP Item Details" page (custom/zra/selectrrpItems.php) — same real
// quirk as Item Details: the single search field is labelled "Item Code"
// but is actually posted to ZRA as lastReqDt, not an item code filter.
// Live call to the real ZRA gateway on every "Fetch Details" click — see
// zra.queries.ts's useZraRrpItems.
export function ZraRrpItemsList() {
  const [lastReqDtInput, setLastReqDtInput] = useState('')
  const [lastReqDt, setLastReqDt] = useState<string | undefined>(undefined)

  const { data, isLoading, isError, error } = useZraRrpItems(lastReqDt)
  const items = data?.items ?? []
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(PER_PAGE)
  const { sorted: sortedItems, sort, toggleSort } = useSortableRows<ZraRrpItem, SortKey>(items, sortValue)
  const pageItems = sortedItems.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Manufacturer Tpin', 'Manufacturer Name', 'Item Code', 'Item Class Code', 'Item Name', 'Origin Country', 'Package Unit', 'Quantity Unit', 'Rrp'],
      rows: sortedItems.map((item) => [
        String(dash(item.manufacturerTpin)),
        String(dash(item.manufacturerName)),
        String(dash(item.itemCode)),
        String(dash(item.itemClassCode)),
        String(dash(item.itemName)),
        String(dash(item.originCountry)),
        String(dash(item.packageUnit)),
        String(dash(item.quantityUnit)),
        String(dash(item.rrp)),
      ]),
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="sticky -top-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-b border-border space-y-4">
        <ListHeader icon={<Tags size={20} className="text-brand" />} title="RRP Item Details" count={items.length} />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Item Code</span>
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
            <TableExportButtons title="RRP Item Details" getExportData={getExportData} />
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
              <Th sortKey="manufacturerTpin" sort={sort} onSort={toggleSort}>Manufacturer Tpin</Th>
              <Th sortKey="manufacturerName" sort={sort} onSort={toggleSort}>Manufacturer Name</Th>
              <Th sortKey="itemCode" sort={sort} onSort={toggleSort}>Item Code</Th>
              <Th sortKey="itemClassCode" sort={sort} onSort={toggleSort}>Item Class Code</Th>
              <Th sortKey="itemName" sort={sort} onSort={toggleSort}>Item Name</Th>
              <Th sortKey="originCountry" sort={sort} onSort={toggleSort}>Origin Country</Th>
              <Th sortKey="packageUnit" sort={sort} onSort={toggleSort}>Package Unit</Th>
              <Th sortKey="quantityUnit" sort={sort} onSort={toggleSort}>Quantity Unit</Th>
              <Th sortKey="rrp" sort={sort} onSort={toggleSort}>Rrp</Th>
            </TheadRow>
          </thead>
          <tbody>
            <EmptyRow
              colSpan={9}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={items.length === 0}
              emptyLabel="No RRP items found."
              feature="RRP Item Details"
            />
            {pageItems.map((item, i) => (
              <tr key={`${item.itemCode}-${i}`} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3 text-text-muted">{dash(item.manufacturerTpin)}</td>
                <td className="px-3 py-3 text-text! font-medium">{dash(item.manufacturerName)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.itemCode)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.itemClassCode)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.itemName)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.originCountry)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.packageUnit)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.quantityUnit)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.rrp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} perPage={perPage} total={items.length} onPageChange={setPage} />
    </div>
  )
}
