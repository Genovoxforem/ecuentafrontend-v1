import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { usePurchaseItems } from '../purchaseItems.data'

// The classic "Invoice No : N - Item Details" drawer of ZRA > Automatic Purchase, read only (see purchaseItems.data.ts).
const HEADERS = ['Item Sequence', 'Item Name', 'Qty / Pkg', 'Tax Details', 'Taxable Amount', 'Tax Amount', 'Price', 'Supply Amount', 'Discount', 'Total Amount', 'ZRA Status']

export function PurchaseItemsModal({ invoiceId, onClose }: { invoiceId: number; onClose: () => void }) {
  const { data, isLoading, isError, error } = usePurchaseItems(invoiceId)
  // Through a portal: inside the page the dialog sits under the sidebar panel.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl border border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="font-semibold text-text!">Invoice No : {data?.invoiceNo ?? '…'} - Item Details</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-auto p-5">
          {isLoading && <p className="text-sm italic text-text-faint">Loading the items…</p>}
          {isError && <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Could not load the items.'}</p>}
          {data && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div>
                  <div className="text-text!">
                    <span className="text-text-muted">Supplier Name:</span> {data.supplierName}
                  </div>
                  <div className="text-text-muted">
                    Supplier Tpin: <span className="text-text!">{data.supplierTpin}</span>
                  </div>
                  <div className="text-text-muted">
                    Branch: <span className="text-text!">{data.supplierBranch}</span>
                  </div>
                </div>
                {data.supplierNote && <span className="rounded-md bg-warning-bg px-2.5 py-1 text-xs font-medium text-warning-fg">{data.supplierNote}</span>}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold">
                    {HEADERS.map((h) => (
                      <th key={h} className="px-3 py-2 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={HEADERS.length} className="px-3 py-6 text-center italic text-text-faint">
                        No items on this purchase.
                      </td>
                    </tr>
                  )}
                  {data.items.map((i) => (
                    <tr key={i.sequence} className="border-b border-border align-top last:border-0">
                      <td className="px-3 py-2.5 text-text-muted">{i.sequence}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-text!">{i.name}</div>
                        <div className="text-xs text-text-faint">Item Code: {i.itemCode}</div>
                        <div className="text-xs text-text-faint">Class Code: {i.classCode}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-text-muted">
                        <div>
                          {i.quantity} / {i.packageQuantity}
                        </div>
                        <div className="text-xs text-text-faint">Qty Unit: {i.quantityUnit}</div>
                        <div className="text-xs text-text-faint">Pkg Unit: {i.packageUnit}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-text-muted">
                        <div>Vat Code: {i.vatCode}</div>
                        <div>Ipl: {i.ipl}</div>
                        <div>TL: {i.tl}</div>
                        <div>Excise: {i.excise}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-text-muted">
                        <div>Vat Taxable Amo: {i.vatTaxable}</div>
                        <div>Ipl Taxable Amo: {i.iplTaxable}</div>
                        <div>TL Taxable Amo: {i.tlTaxable}</div>
                        <div>Excise Taxable Amo: {i.exciseTaxable}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-text-muted">
                        <div>Vat Tax Amo: {i.vatTax}</div>
                        <div>Ipl Tax Amo: {i.iplTax}</div>
                        <div>TL Tax Amo: {i.tlTax}</div>
                        <div>Excise Tax Amo: {i.exciseTax}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{i.price}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{i.supplyAmount}</td>
                      <td className="px-3 py-2.5 text-right text-text-muted">{i.discount}</td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums text-text!">{i.total}</td>
                      <td className="px-3 py-2.5 text-xs text-text-muted">{i.zraStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
