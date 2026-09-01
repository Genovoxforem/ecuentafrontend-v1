import { useMemo, useState } from 'react'
import { Warehouse, X } from 'lucide-react'
import { useZraStockList, type ZraStockListItem } from '../zra.queries'
import { ListHeader, EmptyRow, PER_PAGE } from './ZraListChrome'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'

const dash = (v: string | number | null | undefined) => (v === '' || v === null || v === undefined ? '-' : v)

type SortKey = 'itemCode' | 'itemClassCode' | 'itemName' | 'quantity' | 'supplyAmount'
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

function sortValue(item: ZraStockListItem, key: SortKey): string | number {
  switch (key) {
    case 'itemCode':
      return item.itemCode
    case 'itemClassCode':
      return item.itemClassCode
    case 'itemName':
      return item.itemName
    case 'quantity':
      return item.quantity
    case 'supplyAmount':
      return item.supplyAmount
  }
}

function DetailsModal({ item, onClose }: { item: ZraStockListItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[80vh] overflow-auto rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Item Details</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text!">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-2 py-2">S No</th>
                <th className="font-medium px-2 py-2">Item Seq</th>
                <th className="font-medium px-2 py-2">Item Code</th>
                <th className="font-medium px-2 py-2">Item Class Code</th>
                <th className="font-medium px-2 py-2">Item Name</th>
                <th className="font-medium px-2 py-2">Package Unit</th>
                <th className="font-medium px-2 py-2">Package</th>
                <th className="font-medium px-2 py-2">Quantity Unit</th>
                <th className="font-medium px-2 py-2">Quantity</th>
                <th className="font-medium px-2 py-2">Price</th>
                <th className="font-medium px-2 py-2">Supply Amount</th>
                <th className="font-medium px-2 py-2">Total Discount</th>
                <th className="font-medium px-2 py-2">Taxable Amount</th>
                <th className="font-medium px-2 py-2">VAT</th>
                <th className="font-medium px-2 py-2">VAT Amount</th>
                <th className="font-medium px-2 py-2">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {item.details.map((d) => (
                <tr key={d.sno} className="border-t border-border">
                  <td className="px-2 py-2 text-text-muted">{d.sno}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.itemSeq)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.itemCode)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.itemClassCode)}</td>
                  <td className="px-2 py-2 text-text!">{dash(d.itemName)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.packageUnit)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.package)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.quantityUnit)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.quantity)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.price)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.supplyAmount)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.totalDiscountAmount)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.taxableAmount)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.vat)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.vatAmount)}</td>
                  <td className="px-2 py-2 text-text-muted">{dash(d.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Real "ZRA Stock List" page (custom/zra/stocklist.php) is a live, read-only
// lookup against the ZRA gateway's /stock/selectStockItems endpoint —
// grouped by item code (server-side here, matching the real page's own
// client-side groupAndAggregateItems()), with a "View More" action opening
// the per-movement breakdown, same as the real page's modal.
export function ZraStockList() {
  const { data, isLoading, isError, error } = useZraStockList()
  const items = useMemo(() => data?.items ?? [], [data])
  const [selected, setSelected] = useState<ZraStockListItem | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(PER_PAGE)

  const { sorted: sortedItems, sort, toggleSort } = useSortableRows<ZraStockListItem, SortKey>(items, sortValue)
  const pageItems = sortedItems.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['S No', 'Item Code', 'Item Classification Code', 'Item Name', 'Quantity', 'Supply Amount'],
      rows: sortedItems.map((item) => [String(item.sno), String(dash(item.itemCode)), String(dash(item.itemClassCode)), String(dash(item.itemName)), String(item.quantity), String(item.supplyAmount)]),
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="sticky -top-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-b border-border space-y-4">
        <ListHeader icon={<Warehouse size={20} className="text-brand" />} title="ZRA Stock List" count={items.length} />
        {data?.resultMessage && (
          <p className={`text-sm ${data.resultCode === '000' ? 'text-text-faint' : 'text-warning-fg'}`}>
            {data.resultCode}-{data.resultMessage}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <TableExportButtons title="ZRA Stock List" getExportData={getExportData} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto my-4 rounded-xl border border-border bg-surface-alt soft-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <TheadRow>
              <Th>S No</Th>
              <Th sortKey="itemCode" sort={sort} onSort={toggleSort}>Item Code</Th>
              <Th sortKey="itemClassCode" sort={sort} onSort={toggleSort}>Item Classification Code</Th>
              <Th sortKey="itemName" sort={sort} onSort={toggleSort}>Item Name</Th>
              <Th sortKey="quantity" sort={sort} onSort={toggleSort}>Quantity</Th>
              <Th sortKey="supplyAmount" sort={sort} onSort={toggleSort}>Supply Amount</Th>
              <Th>Actions</Th>
            </TheadRow>
          </thead>
          <tbody>
            <EmptyRow
              colSpan={7}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={items.length === 0}
              emptyLabel="No data available"
              feature="ZRA Stock List"
            />
            {pageItems.map((item) => (
              <tr key={item.itemCode} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3 text-text-muted">{item.sno}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.itemCode)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.itemClassCode)}</td>
                <td className="px-3 py-3 text-text! font-medium">{dash(item.itemName)}</td>
                <td className="px-3 py-3 text-text-muted">{item.quantity}</td>
                <td className="px-3 py-3 text-text-muted">{item.supplyAmount}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-brand text-white hover:opacity-90"
                  >
                    View More
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} perPage={perPage} total={items.length} onPageChange={setPage} />

      {selected && <DetailsModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
