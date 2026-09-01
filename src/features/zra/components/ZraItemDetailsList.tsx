import { useState } from 'react'
import { Package } from 'lucide-react'
import { useZraItemDetails, type ZraItemDetail } from '../zra.queries'
import { ListHeader, EmptyRow, PER_PAGE } from './ZraListChrome'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'

const dash = (v: string | number | null | undefined) => (v === '' || v === null || v === undefined ? '-' : v)

type SortKey =
  | 'itemName'
  | 'itemCode'
  | 'itemClassCode'
  | 'itemTypeCode'
  | 'originCountry'
  | 'packageUnit'
  | 'quantityUnit'
  | 'batchNumber'
  | 'price'
  | 'safetyQuantity'
  | 'vat'
  | 'ipl'
  | 'tl'
  | 'excise'
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

function sortValue(item: ZraItemDetail, key: SortKey): string | number {
  switch (key) {
    case 'itemName':
      return item.itemName
    case 'itemCode':
      return item.itemCode
    case 'itemClassCode':
      return item.itemClassCode
    case 'itemTypeCode':
      return item.itemTypeCode
    case 'originCountry':
      return item.originCountry
    case 'packageUnit':
      return item.packageUnit
    case 'quantityUnit':
      return item.quantityUnit
    case 'batchNumber':
      return item.batchNumber
    case 'price':
      return item.price ?? 0
    case 'safetyQuantity':
      return item.safetyQuantity ?? 0
    case 'vat':
      return item.vat
    case 'ipl':
      return item.ipl
    case 'tl':
      return item.tl
    case 'excise':
      return item.excise
  }
}

// Real "Item Details" page (custom/zra/selectItems.php) has a single search
// field literally labelled "Item Code" that is actually posted to ZRA as
// lastReqDt (format YYYYMMDDHHmmss) — not an item code filter at all. Kept
// as-is here (same real quirk, same label) rather than silently "fixed".
export function ZraItemDetailsList() {
  const [lastReqDtInput, setLastReqDtInput] = useState('')
  const [lastReqDt, setLastReqDt] = useState<string | undefined>(undefined)

  const { data, isLoading, isError, error } = useZraItemDetails(lastReqDt)
  const items = data?.items ?? []
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(PER_PAGE)
  const { sorted: sortedItems, sort, toggleSort } = useSortableRows<ZraItemDetail, SortKey>(items, sortValue)
  const pageItems = sortedItems.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Item Name', 'Item Code', 'Item Class Code', 'Item Type Code', 'Origin Country', 'Package Unit', 'Quantity Unit', 'Batch Number', 'Price', 'Safety Quantity', 'VAT', 'IPL', 'TL', 'Excise'],
      rows: sortedItems.map((item) => [
        String(dash(item.itemName)),
        String(dash(item.itemCode)),
        String(dash(item.itemClassCode)),
        String(dash(item.itemTypeCode)),
        String(dash(item.originCountry)),
        String(dash(item.packageUnit)),
        String(dash(item.quantityUnit)),
        String(dash(item.batchNumber)),
        String(dash(item.price)),
        String(dash(item.safetyQuantity)),
        String(dash(item.vat)),
        String(dash(item.ipl)),
        String(dash(item.tl)),
        String(dash(item.excise)),
      ]),
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="sticky -top-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-b border-border space-y-4">
        <ListHeader icon={<Package size={20} className="text-brand" />} title="Item Details" count={items.length} />

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
            <TableExportButtons title="Item Details" getExportData={getExportData} />
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
              <Th sortKey="itemName" sort={sort} onSort={toggleSort}>Item Name</Th>
              <Th sortKey="itemCode" sort={sort} onSort={toggleSort}>Item Code</Th>
              <Th sortKey="itemClassCode" sort={sort} onSort={toggleSort}>Item Class Code</Th>
              <Th sortKey="itemTypeCode" sort={sort} onSort={toggleSort}>Item Type Code</Th>
              <Th sortKey="originCountry" sort={sort} onSort={toggleSort}>Origin Country</Th>
              <Th sortKey="packageUnit" sort={sort} onSort={toggleSort}>Package Unit</Th>
              <Th sortKey="quantityUnit" sort={sort} onSort={toggleSort}>Quantity Unit</Th>
              <Th sortKey="batchNumber" sort={sort} onSort={toggleSort}>Batch Number</Th>
              <Th sortKey="price" sort={sort} onSort={toggleSort}>Price</Th>
              <Th sortKey="safetyQuantity" sort={sort} onSort={toggleSort}>Safety Quantity</Th>
              <Th sortKey="vat" sort={sort} onSort={toggleSort}>VAT</Th>
              <Th sortKey="ipl" sort={sort} onSort={toggleSort}>IPL</Th>
              <Th sortKey="tl" sort={sort} onSort={toggleSort}>TL</Th>
              <Th sortKey="excise" sort={sort} onSort={toggleSort}>Excise</Th>
            </TheadRow>
          </thead>
          <tbody>
            <EmptyRow
              colSpan={14}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={items.length === 0}
              emptyLabel="No items found."
              feature="Item Details"
            />
            {pageItems.map((item, i) => (
              <tr key={`${item.itemCode}-${i}`} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3 text-text! font-medium">{dash(item.itemName)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.itemCode)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.itemClassCode)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.itemTypeCode)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.originCountry)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.packageUnit)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.quantityUnit)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.batchNumber)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.price)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.safetyQuantity)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.vat)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.ipl)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.tl)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.excise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} perPage={perPage} total={items.length} onPageChange={setPage} />
    </div>
  )
}
