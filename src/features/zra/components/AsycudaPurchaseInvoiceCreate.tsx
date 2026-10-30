import { useState, type ReactNode } from 'react'
import { Calculator, FileText, ListChecks, NotebookPen, ShoppingBag, SlidersHorizontal, User } from 'lucide-react'
import { useAsycudaVendorOptions } from '../asycudaPurchaseInvoice.queries'
import { usePurchaseOrderFormOptions } from '../../purchaseOrders/purchaseOrderFapi'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const disabledCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text-faint text-sm cursor-not-allowed'
const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const labelCls = 'text-xs font-medium text-text-muted'

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className={required ? 'text-xs font-medium text-danger' : labelCls}>
        {label}
        {required && '*'}
      </span>
      {children}
    </label>
  )
}

// A date box the classic page fills with today, with its "Now" button.
function DateNow({ value, onChange, today }: { value: string; onChange: (value: string) => void; today: string }) {
  return (
    <div className="flex items-stretch">
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} rounded-r-none`} />
      <button type="button" onClick={() => onChange(today)} className="inline-flex shrink-0 items-center rounded-r-md border border-l-0 border-input-border px-3 text-xs text-text-muted hover:bg-surface-hover">
        Now
      </button>
    </div>
  )
}

function SectionHead({ icon: Icon, title, subtitle, action }: { icon: typeof User; title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
          <Icon size={16} />
        </span>
        <div>
          <p className="font-semibold text-text!">{title}</p>
          <p className="text-xs text-text-faint">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

// fourn/facture/asycudapurchase.php ("Create Asycuda purchase invoice"), laid out like the classic page: Customer & Invoice
// Details, Item Details and Additional Information on the left; Invoice Summary, Totals and Notes on the right.
// The classic page picks the Supplier Invoice No from the vendor's ASYCUDA declarations ("Select Declaration/Task Code"),
// loads the declaration's products from asycudaproduct_ajax.php and adds lines / saves the draft or invoice / deletes
// through invoiceajax.php — all session pages answering HTML, with no JSON (key-authenticated) endpoint. So only the
// Vendor, the option lists (fourn/commande/fapi/form_options.php, the same lists the classic selects offer) and the plain fields are
// live here and keep what is typed; the Supplier Invoice No (declaration list), View Products and the three Save/Delete buttons stay
// disabled until those endpoints exist.
export function AsycudaPurchaseInvoiceCreate() {
  const { data: vendors, isLoading, isError } = useAsycudaVendorOptions()
  const [vendorId, setVendorId] = useState('')
  const { data: options } = usePurchaseOrderFormOptions(vendorId || undefined)
  const selectedVendor = vendors?.find((v) => v.id === Number(vendorId))
  const today = new Date().toISOString().slice(0, 10)
  const d = options?.defaults
  // The fields the backend's own option lists feed hold their value here (the classic defaults until the user changes one).
  const [vals, setVals] = useState<Record<string, string>>({})
  const val = (key: string, fallback?: string | number) => vals[key] ?? (fallback != null && fallback !== '' ? String(fallback) : '')
  const setVal = (key: string) => (e: { target: { value: string } }) => setVals((prev) => ({ ...prev, [key]: e.target.value }))
  const pick = (list: Array<{ value: number | string; label: string }> | undefined, id: number | string | undefined) => list?.find((o) => String(o.value) === String(id ?? ''))?.label

  const select = (key: string, placeholder: string, list: Array<{ value: number | string; label: string }> | undefined, current?: number | string) => (
    <select className={inputCls} value={val(key, current != null && pick(list, current) ? current : undefined)} onChange={setVal(key)}>
      <option value="">{placeholder}</option>
      {list?.map((o, i) => (
        <option key={`${String(o.value)}-${i}`} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  )

  return (
    <div className="-m-6 flex flex-1 flex-col">
      <div className="flex-1 px-[16px] py-3">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text!">
          <ShoppingBag size={18} className="text-brand" />
          Create Asycuda purchase invoice
        </h2>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Card className="!h-auto">
              <SectionHead icon={User} title="Customer & InvoiceDetails" subtitle="Customer, reference, date, type, currency & project" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  {selectedVendor && <p className={`text-xs ${selectedVendor.tpin ? 'text-success-fg' : 'text-danger'}`}>{selectedVendor.tpin ? `Tpin: ${selectedVendor.tpin}` : 'Vendor Not Registered With ZRA'}</p>}
                </Field>
                <Field label="Supplier Invoice No" required>
                  <select disabled className={disabledCls}>
                    <option>Select Declaration/Task Code</option>
                  </select>
                </Field>
                <Field label="Invoice date" required>
                  <DateNow value={val('invoiceDate', today)} onChange={(v) => setVals((p) => ({ ...p, invoiceDate: v }))} today={today} />
                </Field>
                <Field label="Project">{select('project', 'Select a project', options?.projects, d?.project_id || undefined)}</Field>
                <Field label="Type" required>
                  <select className={inputCls} value="standard" onChange={() => undefined}>
                    <option value="standard">Standard invoice</option>
                  </select>
                </Field>
                <Field label="Incoterms">
                  <div className="flex items-stretch gap-2">
                    {select('incoterm', 'Select a incoterms', options?.incoterms, d?.incoterm_id || undefined)}
                    <input className={inputCls} aria-label="Incoterms location" value={val('incotermLocation')} onChange={setVal('incotermLocation')} />
                  </div>
                </Field>
                <Field label="Payment due on">
                  <DateNow value={val('dueDate', today)} onChange={(v) => setVals((p) => ({ ...p, dueDate: v }))} today={today} />
                </Field>
              </div>
            </Card>

            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 pt-4">
                <SectionHead
                  icon={User}
                  title="Item Details"
                  subtitle="Add products or services to this invoice"
                  action={
                    <button type="button" disabled className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white opacity-60 cursor-not-allowed">
                      <FileText size={14} /> View Products
                    </button>
                  }
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                      <th className="font-medium px-3 py-2">Products</th>
                      <th className="font-medium px-3 py-2 text-right">Tax</th>
                      <th className="font-medium px-3 py-2 text-right">Disc.</th>
                      <th className="font-medium px-3 py-2 text-right">Qty</th>
                      <th className="font-medium px-3 py-2 text-right">Unit Price (Excl.Tax)</th>
                      <th className="font-medium px-3 py-2 text-right">Unit Price</th>
                      <th className="font-medium px-3 py-2 text-right">Total (Inc. Tax)</th>
                      <th className="px-3 py-2 text-right" title="Columns">
                        <ListChecks size={14} className="ml-auto text-text-faint" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={8} className="px-3 py-3 text-text-faint">
                        Empty
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="!h-auto">
              <SectionHead icon={SlidersHorizontal} title="Additional Information" subtitle="Warehouse, payment" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Warehouse" required>
                  {select('warehouse', 'Select a warehouse', options?.warehouses, d?.warehouse_id || undefined)}
                </Field>
                <Field label="Bank account" required>
                  {select('bank', 'Select a bank account', options?.bank_accounts, d?.bank_account_id || undefined)}
                </Field>
                <Field label="Date" required>
                  <DateNow value={val('date', today)} onChange={(v) => setVals((p) => ({ ...p, date: v }))} today={today} />
                </Field>
                <Field label="Payment Type" required>
                  {select('paymentMode', 'Select a payment type', options?.payment_modes, d?.payment_mode_id || undefined)}
                </Field>
                <Field label="Payment Terms" required>
                  {select('paymentTerm', 'Select payment terms', options?.payment_terms, d?.payment_term_id || undefined)}
                </Field>
                <Field label="Currency" required>
                  {/* form_options.php lists a currency once per stored rate (17 USD rows on newecuenta); shown once per code. */}
                  {select('currency', 'Select a currency', options?.currencies.filter((c, i, all) => all.findIndex((x) => x.value === c.value) === i), d?.currency_code || undefined)}
                </Field>
                <Field label="Upload Documents">
                  {/* File boxes are left out of the shared control-height rule in index.css, so the height is set here to match the selects and text boxes beside it. */}
                  <input type="file" className={inputCls} style={{ height: 'var(--page-control-height, 2.25rem)', minHeight: 'var(--page-control-height, 2.25rem)', paddingTop: '0.3rem', paddingBottom: 0 }} />
                </Field>
                <Field label="Payment Note">
                  <input placeholder="Note" className={inputCls} value={val('paymentNote')} onChange={setVal('paymentNote')} />
                </Field>
              </div>
            </Card>
          </div>

          {/* A flex column: the Notes card takes the height left under the other two, so the right side ends level with the left. */}
          <div className="flex flex-col gap-4">
            <Card className="!h-auto space-y-2 text-sm">
              <SectionHead icon={Calculator} title="Invoice Summary" subtitle="Totals, VAT & balance" />
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
                  <span className="font-semibold text-text!">{value}</span>
                </div>
              ))}
              <label className="flex items-center gap-2 text-text-muted">
                <input type="checkbox" checked={val('advance') === '1'} onChange={(e) => setVals((p) => ({ ...p, advance: e.target.checked ? '1' : '' }))} /> UseAdvancePayment :
              </label>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold text-text!">Total(ZMW)</span>
                <span className="text-lg font-bold text-brand">0.00 ZMW</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="whitespace-nowrap text-text-muted">Received Amount (ZMW)</span>
                <input type="text" inputMode="decimal" value={val('received', '0.00')} onChange={setVal('received')} className={`${inputCls} !w-28 shrink-0 text-right`} />
              </div>
              <div className="flex items-center justify-between text-danger">
                <span>Balance Amount (ZMW)</span>
                <span>0</span>
              </div>
            </Card>

            <Card className="!h-auto">
              <SectionHead icon={ListChecks} title="Totals" subtitle="" />
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-surface-hover p-2">
                  <p className="text-xs text-text-muted">Total Quantity</p>
                  <p className="text-lg font-bold text-text!">0</p>
                </div>
                <div className="rounded-md bg-surface-hover p-2">
                  <p className="text-xs text-text-muted">Items</p>
                  <p className="text-lg font-bold text-text!">0</p>
                </div>
              </div>
            </Card>

            <Card className="min-h-0 flex-1">
              <SectionHead icon={NotebookPen} title="Notes" subtitle="" />
              <textarea rows={3} value={val('notes')} onChange={setVal('notes')} placeholder="Add any additional notes here..." className="min-h-24 w-full flex-1 resize-none rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30" />
            </Card>
          </div>
        </div>
      </div>

      <div className="sticky -bottom-6 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-[16px] py-3">
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
              title="Needs a JSON endpoint for the Asycuda purchase invoice (the classic page posts invoiceajax.php)"
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
