import { useState } from 'react'
import { Package } from 'lucide-react'
import { useZraItemDetails } from '../zra.queries'
import { ListHeader, TableShell, EmptyRow } from './ZraListChrome'

const dash = (v: string | number | null | undefined) => (v === '' || v === null || v === undefined ? '-' : v)

// Real "Item Details" page (custom/zra/selectItems.php) has a single search
// field literally labelled "Item Code" that is actually posted to ZRA as
// lastReqDt (format YYYYMMDDHHmmss) — not an item code filter at all. Kept
// as-is here (same real quirk, same label) rather than silently "fixed".
export function ZraItemDetailsList() {
  const [lastReqDtInput, setLastReqDtInput] = useState('')
  const [lastReqDt, setLastReqDt] = useState<string | undefined>(undefined)

  const { data, isLoading, isError, error } = useZraItemDetails(lastReqDt)
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <ListHeader icon={<Package size={20} className="text-brand" />} title="Item Details" count={items.length} />

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

      {data?.resultMessage && (
        <p className={`text-sm ${data.resultCode === '000' ? 'text-text-faint' : 'text-warning-fg'}`}>
          {data.resultCode}-{data.resultMessage}
        </p>
      )}

      <TableShell>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-alt">
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-3 py-3">Item Name</th>
              <th className="font-medium px-3 py-3">Item Code</th>
              <th className="font-medium px-3 py-3">Item Class Code</th>
              <th className="font-medium px-3 py-3">Item Type Code</th>
              <th className="font-medium px-3 py-3">Origin Country</th>
              <th className="font-medium px-3 py-3">Package Unit</th>
              <th className="font-medium px-3 py-3">Quantity Unit</th>
              <th className="font-medium px-3 py-3">Batch Number</th>
              <th className="font-medium px-3 py-3">Price</th>
              <th className="font-medium px-3 py-3">Safety Quantity</th>
              <th className="font-medium px-3 py-3">VAT</th>
              <th className="font-medium px-3 py-3">IPL</th>
              <th className="font-medium px-3 py-3">TL</th>
              <th className="font-medium px-3 py-3">Excise</th>
            </tr>
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
            {items.map((item, i) => (
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
      </TableShell>
    </div>
  )
}
