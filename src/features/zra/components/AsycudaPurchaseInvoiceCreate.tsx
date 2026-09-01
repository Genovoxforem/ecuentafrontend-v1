import { useState } from 'react'
import { FileText, Info, Lock, Plus } from 'lucide-react'
import { useAsycudaVendorOptions } from '../asycudaPurchaseInvoice.queries'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const disabledCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text-faint text-sm cursor-not-allowed'
const labelCls = 'text-xs font-medium text-text-muted'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className={labelCls}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  )
}

// The real fourn/facture/asycudapurchase.php page's line-item table, save/
// draft/delete actions, and credit-note flow all go through
// fourn/facture/invoiceajax.php — a single 3,300-line handler that renders
// the ENTIRE invoice panel as an HTML fragment per action
// (addline/updateprice/updatetax/draft/valid/delete/creditnote), not JSON.
// Its declaration/bank-account/payment-type/payment-terms/currency
// dropdowns are also plain server-rendered <select> markup with no API of
// their own. Only the Vendor field has a real JSON source — see
// asycudaPurchaseInvoice.queries.ts — so everything below it is an honest
// disabled reproduction of the real page's fields rather than a form that
// looks live but has nothing real to submit to.
export function AsycudaPurchaseInvoiceCreate() {
  const { data: vendors, isLoading, isError } = useAsycudaVendorOptions()
  const [vendorId, setVendorId] = useState('')

  const selectedVendor = vendors?.find((v) => v.id === Number(vendorId))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text!">
          <Lock size={16} className="text-text-faint" />
          Create Asycuda purchase invoice
        </h2>
        <button type="button" disabled className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-brand text-white opacity-60 cursor-not-allowed">
          <Plus size={14} /> New Purchase
        </button>
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">fourn/facture/asycudapurchase.php</code>. Its line-item table and Save/Draft/Delete actions all go
          through <code className="font-mono">invoiceajax.php</code>, which renders the whole panel as an HTML fragment on every action, not JSON — no data
          contract to wire without scraping a 3,000+ line handler, so those fields are disabled. Vendor is real: it comes from{' '}
          <code className="font-mono">societe/api/list.php</code>, the same live endpoint the Customers list uses.
        </p>
      </Card>

      <Card className="!h-auto">
        <Field label="Vendor" required>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputCls} disabled={isLoading}>
            <option value="">{isLoading ? 'Loading vendors…' : 'Select a third party'}</option>
            {vendors?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {isError && <p className="text-xs text-danger">Could not load vendors.</p>}
          {selectedVendor && (
            <p className={`text-xs ${selectedVendor.tpin ? 'text-success-fg' : 'text-danger'}`}>
              {selectedVendor.tpin ? `Tpin: ${selectedVendor.tpin}` : 'Vendor Not Registered With ZRA'}
            </p>
          )}
        </Field>
      </Card>

      <Card className="!h-auto space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Supplier Invoice No" required>
            <input disabled className={disabledCls} />
          </Field>
          <Field label="Invoice date" required>
            <input disabled type="date" className={disabledCls} />
          </Field>
          <Field label="Project">
            <select disabled className={disabledCls}>
              <option>Select a project</option>
            </select>
          </Field>
          <Field label="Type" required>
            <select disabled className={disabledCls}>
              <option>Standard invoice</option>
            </select>
          </Field>
          <Field label="Incoterms">
            <select disabled className={disabledCls}>
              <option>Select a incoterms</option>
            </select>
          </Field>
          <Field label="Payment due on">
            <input disabled type="date" className={disabledCls} />
          </Field>
        </div>

        <button type="button" disabled className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-brand text-white opacity-60 cursor-not-allowed">
          <FileText size={14} /> View Products
        </button>
      </Card>

      <Card className="!h-auto overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-3 py-2">Products</th>
              <th className="font-medium px-3 py-2">Tax</th>
              <th className="font-medium px-3 py-2">Disc.</th>
              <th className="font-medium px-3 py-2">Qty</th>
              <th className="font-medium px-3 py-2">Unit Price (Excl.Tax)</th>
              <th className="font-medium px-3 py-2">Unit Price</th>
              <th className="font-medium px-3 py-2">Total (Inc. Tax)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-3 py-4 text-center text-text-faint">
                Empty
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="!h-auto lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Bank account" required>
              <select disabled className={disabledCls}>
                <option>Select a bank account</option>
              </select>
            </Field>
            <Field label="Date" required>
              <input disabled type="date" className={disabledCls} />
            </Field>
            <Field label="Payment Type" required>
              <select disabled className={disabledCls}>
                <option>Select a payment type</option>
              </select>
            </Field>
            <Field label="Payment Terms">
              <select disabled className={disabledCls}>
                <option>Due Upon Receipt</option>
              </select>
            </Field>
            <Field label="Currency">
              <select disabled className={disabledCls}>
                <option>Zambian Kwacha (ZMW)</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Upload Documents">
              <input disabled type="file" className={disabledCls} />
            </Field>
            <Field label="Payment Note">
              <input disabled placeholder="Note" className={disabledCls} />
            </Field>
          </div>
        </Card>

        <Card className="!h-auto space-y-2 text-sm">
          {(
            [
              ['VAT', '0.00 ZMW'],
              ['Total (excl. tax)', '0.00 ZMW'],
              ['Items', '0 (0)'],
              ['Total (inc. tax)', '0.00 ZMW'],
              ['Paid Amount', '0.00 ZMW'],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-text-muted">
              <span>{label} :</span>
              <span className="text-text-faint">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="font-semibold text-text!">Total (ZMW)</span>
            <span className="text-lg font-bold text-text-faint">0.00</span>
          </div>
          <Field label="Received Amount (ZMW)">
            <input disabled type="text" defaultValue="0" className={`${disabledCls} text-right`} />
          </Field>
          <div className="flex items-center justify-between text-danger opacity-70">
            <span>Balance Amount (ZMW)</span>
            <span>0</span>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-text-muted">
          Total Amount: <span className="text-text-faint">0.00 ZMW</span>
          <br />
          Total Quantity: <span className="text-text-faint">0</span>
        </div>
        <div className="flex gap-2">
          {(['Save as Draft', 'Save as Invoice', 'Delete'] as const).map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className={`px-4 py-2 rounded-md text-sm font-medium opacity-60 cursor-not-allowed ${
                label === 'Delete' ? 'bg-danger text-white' : label === 'Save as Invoice' ? 'bg-brand text-white' : 'border border-border text-text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
