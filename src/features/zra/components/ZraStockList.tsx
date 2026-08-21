import { useState } from 'react'
import { Warehouse, X } from 'lucide-react'
import { useZraStockList, type ZraStockListItem } from '../zra.queries'
import { ListHeader, TableShell, EmptyRow } from './ZraListChrome'

const dash = (v: string | number | null | undefined) => (v === '' || v === null || v === undefined ? '-' : v)

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
  const items = data?.items ?? []
  const [selected, setSelected] = useState<ZraStockListItem | null>(null)

  return (
    <div className="space-y-4">
      <ListHeader icon={<Warehouse size={20} className="text-brand" />} title="ZRA Stock List" count={items.length} />

      {data?.resultMessage && (
        <p className={`text-sm ${data.resultCode === '000' ? 'text-text-faint' : 'text-warning-fg'}`}>
          {data.resultCode}-{data.resultMessage}
        </p>
      )}

      <TableShell>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-alt">
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-3 py-3">S No</th>
              <th className="font-medium px-3 py-3">Item Code</th>
              <th className="font-medium px-3 py-3">Item Classification Code</th>
              <th className="font-medium px-3 py-3">Item Name</th>
              <th className="font-medium px-3 py-3">Quantity</th>
              <th className="font-medium px-3 py-3">Supply Amount</th>
              <th className="font-medium px-3 py-3">Actions</th>
            </tr>
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
            {items.map((item) => (
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
      </TableShell>

      {selected && <DetailsModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
