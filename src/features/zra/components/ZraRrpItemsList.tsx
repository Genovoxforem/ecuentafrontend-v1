import { useState } from 'react'
import { Tags } from 'lucide-react'
import { useZraRrpItems } from '../zra.queries'
import { ListHeader, TableShell, EmptyRow } from './ZraListChrome'

const dash = (v: string | number | null | undefined) => (v === '' || v === null || v === undefined ? '-' : v)

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

  return (
    <div className="space-y-4">
      <ListHeader icon={<Tags size={20} className="text-brand" />} title="RRP Item Details" count={items.length} />

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
              <th className="font-medium px-3 py-3">Manufacturer Tpin</th>
              <th className="font-medium px-3 py-3">Manufacturer Name</th>
              <th className="font-medium px-3 py-3">Item Code</th>
              <th className="font-medium px-3 py-3">Item Class Code</th>
              <th className="font-medium px-3 py-3">Item Name</th>
              <th className="font-medium px-3 py-3">Origin Country</th>
              <th className="font-medium px-3 py-3">Package Unit</th>
              <th className="font-medium px-3 py-3">Quantity Unit</th>
              <th className="font-medium px-3 py-3">Rrp</th>
            </tr>
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
            {items.map((item, i) => (
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
      </TableShell>
    </div>
  )
}
