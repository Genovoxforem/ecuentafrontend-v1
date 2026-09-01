import { UploadCloud, Boxes, Info } from 'lucide-react'
import { useWarehouses } from '../../warehouses/warehouseExtras.queries'
import { notWiredYet } from './ZraListChrome'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const disabledCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text-faint text-sm cursor-not-allowed'

// product/stock/movement_listunuploaded.php has no JSON read API at all (see
// this file's own longer note further down) — there is no real row shape to
// pull a TypeScript interface from, so this local shape exists purely to
// name the columns the real page itself shows; `rows` stays permanently
// empty rather than inventing data. Sorting/exporting an always-empty array
// is harmless (useSortableRows and TableExportButtons both handle it fine),
// which is why the header/sort/export treatment is still worth wiring up
// here even with nothing behind it yet.
interface UnuploadedStockRow {
  date: string
  productRef: string
  productLabel: string
  lotSerial: string
  warehouse: string
  docCode: string
  movementType: string
}
const rows: UnuploadedStockRow[] = []

type SortKey = 'date' | 'productRef' | 'productLabel' | 'lotSerial' | 'warehouse' | 'docCode' | 'movementType'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Date', key: 'date' },
  { label: 'Product Ref', key: 'productRef' },
  { label: 'Product Label', key: 'productLabel' },
  { label: 'Lot/Serial', key: 'lotSerial' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Inv./Doc Code', key: 'docCode' },
  { label: 'Type of Movement', key: 'movementType' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)

function sortValue(row: UnuploadedStockRow, key: SortKey): string {
  return row[key]
}

function getExportData() {
  return { headers: COLUMN_LABELS, rows: [] as string[][] }
}

// product/stock/movement_listunuploaded.php (read directly, not guessed) has
// no JSON read API at all — its result table is a plain PHP loop rendered
// once at page load, re-run on a full form submit for every filter change,
// with no ajax/DataTables config anywhere in its ~1,460 lines. Its "Upload
// TO ZRA" button IS real (POST product/stock/zraallupdatestock.php, a
// genuine JSON endpoint) — but it submits selected rows straight to the
// live ZRA government sandbox, so it's guarded the same way every other
// ZRA upload/sync action in this app is (see notWiredYet in ZraListChrome).
// Warehouse is the one field with a real source (this app's own warehouse
// list); everything else here matches the real form's fields without a
// live source to back it. No perPage/search controls are added below (unlike
// the other ZRA lists) since there is no real query behind them to drive —
// only the header/sort/height/export treatment applies here.
export function UnuploadedStockList() {
  const warehouses = useWarehouses()
  const { sort, toggleSort } = useSortableRows<UnuploadedStockRow, SortKey>(rows, sortValue)

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="sticky -top-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-b border-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text!">
            <Boxes size={20} className="text-brand" />
            Un-uploaded Stock Movements
          </h2>
          <div className="flex items-center gap-2">
            <TableExportButtons title="Un-uploaded Stock Movements" getExportData={getExportData} />
            <button type="button" onClick={notWiredYet} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90">
              <UploadCloud size={14} /> Upload TO ZRA
            </button>
          </div>
        </div>

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">product/stock/movement_listunuploaded.php</code> — a classic server-rendered list with no JSON read
            API, so results can't be listed here without scraping. "Upload TO ZRA" is real (it posts to the live ZRA gateway), so it's guarded like every
            other ZRA upload action in this app rather than fired directly.
          </p>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-text-muted">Start Date</span>
            <input disabled type="date" className={disabledCls} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-text-muted">End Date</span>
            <input disabled type="date" className={disabledCls} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-text-muted">Product Ref</span>
            <input disabled className={disabledCls} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-text-muted">Product Label</span>
            <input disabled className={disabledCls} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-text-muted">Lot/Serial</span>
            <input disabled className={disabledCls} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-text-muted">Warehouse</span>
            <select className={inputCls} defaultValue="">
              <option value="">Select a Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.ref} value={w.ref}>
                  {w.shortName || w.ref}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-xs font-medium text-text-muted">Type of movement</span>
            <select disabled className={disabledCls}>
              <option>Select a type</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" disabled className="h-9 px-4 rounded-md text-sm font-medium bg-brand text-white opacity-60 cursor-not-allowed w-full">
              Filter
            </button>
          </div>
        </div>
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
            <tr>
              <td colSpan={COLUMN_LABELS.length} className="px-3 py-6 text-center text-text-faint">
                No data available here.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
