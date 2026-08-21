import { useState } from 'react'
import { FileText, LoaderCircle, Package, Trash2, X } from 'lucide-react'
import {
  useAsycudaPurchaseReferenceData,
  useDeclarationProducts,
  useAssignAsycudaProducts,
  useDeleteAsycudaPurchaseLine,
  useSaveAsycudaPurchaseInvoice,
  useDeleteAsycudaPurchaseInvoice,
  type AsycudaInvoiceState,
} from '../asycudaPurchaseInvoice.queries'
import { isBackendUnavailable, BackendUnavailableCard, BackendUnavailableInline } from '../../../shared/components/BackendUnavailable'

// POST /api/zra/asycuda-purchase/* mutations below (assign/lines/delete/save/delete)
// all 404 on this backend (see BackendUnavailable.tsx) — a single honest message,
// reused at each call site instead of a raw "Request failed with status code 404".
function describeAsycudaPurchaseError(err: unknown, fallback: string): string {
  return isBackendUnavailable(err) ? "This action isn't available on this backend yet." : err instanceof Error ? err.message : fallback
}

const inputCls = 'h-10 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const labelCls = 'text-sm text-text-muted'
const money = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function ProductsPanel({
  declaration,
  onClose,
  onAssign,
  assigning,
}: {
  declaration: string
  onClose: () => void
  onAssign: (productIds: number[]) => void
  assigning: boolean
}) {
  const { data, isLoading, isError, error } = useDeclarationProducts(declaration)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-surface border-l border-border p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text!">View Asycuda Products</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text!">
            <X size={18} />
          </button>
        </div>

        {isLoading && <p className="text-sm text-text-faint">Loading…</p>}
        {isError && (isBackendUnavailable(error) ? <BackendUnavailableInline feature="Asycuda declaration products" /> : <p className="text-sm text-danger">Could not load declaration products.</p>)}

        {data && (
          <>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase border-b border-border">
                  <th className="py-2 pr-2">Ref/Label</th>
                  <th className="py-2 pr-2">Selling Price (Incl. tax)</th>
                  <th className="py-2 pr-2">Tax</th>
                </tr>
              </thead>
              <tbody>
                {data.products.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-text-faint">
                      No products linked to this declaration.
                    </td>
                  </tr>
                )}
                {data.products.map((p) => (
                  <tr key={p.productId} className="border-t border-border">
                    <td className="py-2 pr-2 text-text!">{p.refLabel}</td>
                    <td className="py-2 pr-2 text-text-muted">{p.sellingPrice !== null ? money(p.sellingPrice) : 'N/A'}</td>
                    <td className="py-2 pr-2 text-text-muted">{p.tax ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.alreadyAssigned ? (
              <p className="text-sm text-text-faint">An invoice already exists for this declaration.</p>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={assigning || data.products.length === 0}
                  onClick={() => onAssign(data.products.map((p) => p.productId))}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50"
                >
                  {assigning ? <LoaderCircle size={14} className="animate-spin" /> : null}
                  Assign Products To Invoice
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function AsycudaPurchaseInvoiceCreate() {
  const { data: refData, isLoading: refLoading, error: refError } = useAsycudaPurchaseReferenceData()

  const [vendorId, setVendorId] = useState<number | null>(null)
  const [declaration, setDeclaration] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [projectId, setProjectId] = useState<number | null>(null)

  const [place, setPlace] = useState<number | null>(null)
  const [invoice, setInvoice] = useState<AsycudaInvoiceState | null>(null)
  const [showProductsPanel, setShowProductsPanel] = useState(false)

  const [fkAccount, setFkAccount] = useState<number | null>(null)
  const [modeReglementId, setModeReglementId] = useState<number | null>(null)
  const [condReglementId, setCondReglementId] = useState<number | null>(null)
  const [multicurrencyCode, setMulticurrencyCode] = useState('ZMW')
  const [paymentNote, setPaymentNote] = useState('')
  const [receivedAmount, setReceivedAmount] = useState('')
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const assign = useAssignAsycudaProducts()
  const deleteLine = useDeleteAsycudaPurchaseLine()
  const save = useSaveAsycudaPurchaseInvoice()
  const deleteInvoice = useDeleteAsycudaPurchaseInvoice()

  const selectedVendor = refData?.vendors.find((v) => v.id === vendorId)
  const isDraft = invoice ? invoice.status === 0 : true
  const canEdit = isDraft

  function resetForm() {
    setPlace(null)
    setInvoice(null)
    setVendorId(null)
    setDeclaration('')
    setFkAccount(null)
    setModeReglementId(null)
    setCondReglementId(null)
    setPaymentNote('')
    setReceivedAmount('')
  }

  function handleAssign(productIds: number[]) {
    if (!vendorId || !declaration) return
    assign.mutate(
      { socid: vendorId, declaration, invoiceDate, productIds },
      {
        onSuccess: (result) => {
          setPlace(result.invoiceId)
          setInvoice(result)
          setShowProductsPanel(false)
        },
      },
    )
  }

  function handleDeleteLine(lineId: number) {
    if (!place) return
    if (!window.confirm('Delete this product line from the invoice?')) return
    deleteLine.mutate(
      { place, lineId },
      {
        onSuccess: (result) => {
          if (result.invoiceId === null) {
            setPlace(null)
            setInvoice(null)
          } else {
            setInvoice(result)
          }
        },
        onError: (err) => window.alert(describeAsycudaPurchaseError(err, 'Could not delete this line — please try again.')),
      },
    )
  }

  function handleSave(mode: 'draft' | 'valid') {
    if (!place) return
    if (mode === 'valid' && !fkAccount) {
      setSaveMessage({ ok: false, text: 'A bank account is required to save as invoice.' })
      return
    }
    const confirmed = window.confirm(
      mode === 'draft'
        ? 'Save this purchase invoice as a draft? This writes a real record to the backend.'
        : 'Save and validate this purchase invoice? This finalizes a real invoice record on the backend.',
    )
    if (!confirmed) return
    save.mutate(
      {
        place,
        mode,
        fkAccount: fkAccount ?? 0,
        modeReglementId: modeReglementId ?? 0,
        condReglementId: condReglementId ?? 0,
        multicurrencyCode,
        projectId: projectId ?? undefined,
        paymentNote,
        receivedAmount: Number(receivedAmount) || 0,
      },
      {
        onSuccess: (result) => {
          setInvoice(result)
          setSaveMessage(
            result.succeeded
              ? { ok: true, text: mode === 'draft' ? 'Draft saved successfully.' : `Invoice ${result.ref} created successfully.` }
              : { ok: false, text: 'Could not save — check bank account, payment mode, and payment terms.' },
          )
        },
        onError: (err) => setSaveMessage({ ok: false, text: describeAsycudaPurchaseError(err, 'Could not save — please try again.') }),
      },
    )
  }

  function handleDeleteInvoice() {
    if (!place) return
    if (!window.confirm('Delete this draft purchase invoice? This removes the real record from the backend.')) return
    deleteInvoice.mutate(place, {
      onSuccess: (result) => {
        if (result.succeeded) resetForm()
      },
      onError: (err) => window.alert(describeAsycudaPurchaseError(err, 'Could not delete this invoice — please try again.')),
    })
  }

  const lines = invoice?.lines ?? []

  // GET /api/zra/asycuda-purchase/reference-data/ 404s on this backend (see
  // BackendUnavailable.tsx) — without vendors/declarations/bank accounts/payment
  // types this screen has nothing usable to offer, so it's treated as the whole
  // page being unavailable rather than a form full of empty dropdowns.
  if (isBackendUnavailable(refError)) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text! mb-4">
          <FileText size={20} className="text-brand" />
          Create Asycuda Purchase Invoice
        </h2>
        <BackendUnavailableCard feature="Create Asycuda Purchase Invoice" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Sticky header */}
      <div className="sticky -top-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-b border-border space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text!">
          <FileText size={20} className="text-brand" />
          Create Asycuda Purchase Invoice
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="space-y-1">
            <span className={labelCls}>Vendor *</span>
            <select
              className={inputCls}
              value={vendorId ?? ''}
              disabled={!canEdit}
              onChange={(e) => {
                setVendorId(e.target.value ? Number(e.target.value) : null)
                setDeclaration('')
              }}
            >
              <option value="">Select a third party</option>
              {refData?.vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {selectedVendor && (
              <p className={selectedVendor.tpin ? 'text-xs text-success-fg' : 'text-xs text-danger'}>
                {selectedVendor.tpin ? `Tpin: ${selectedVendor.tpin}  Branch: ${selectedVendor.branchCode || '-'}` : 'Vendor Not Registered With ZRA'}
              </p>
            )}
          </label>

          <label className="space-y-1">
            <span className={labelCls}>Declaration reference *</span>
            <select className={inputCls} value={declaration} disabled={!canEdit} onChange={(e) => setDeclaration(e.target.value)}>
              <option value="">Select Declaration/Task Code</option>
              {refData?.declarations.map((d) => (
                <option key={d.taskcodeGroup} value={d.taskcodeGroup}>
                  {d.declarationRef} - Taskcode: {d.taskcodeGroup}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelCls}>Invoice date *</span>
            <input type="date" className={inputCls} value={invoiceDate} disabled={!canEdit} onChange={(e) => setInvoiceDate(e.target.value)} />
          </label>

          <label className="space-y-1">
            <span className={labelCls}>Project</span>
            <select className={inputCls} value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select a project</option>
              {refData?.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ref} - {p.title}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelCls}>Type *</span>
            <select className={inputCls} value="0" disabled>
              <option value="0">Standard invoice</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setShowProductsPanel(true)}
              disabled={!vendorId || !declaration || !canEdit}
              className="flex items-center gap-1.5 h-10 px-4 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50"
            >
              <Package size={16} />
              View Products
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable middle: line items */}
      <div className="flex-1 overflow-y-auto py-4">
        {refLoading && <p className="text-sm text-text-faint">Loading reference data…</p>}

        <div className="rounded-xl border border-border bg-surface-alt overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface-alt">
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-3 py-3">Products</th>
                <th className="font-medium px-3 py-3">Tax</th>
                <th className="font-medium px-3 py-3">Disc.</th>
                <th className="font-medium px-3 py-3">Qty</th>
                <th className="font-medium px-3 py-3">Unit Price (Excl.Tax)</th>
                <th className="font-medium px-3 py-3">Unit Price</th>
                <th className="font-medium px-3 py-3">Total (Inc. Tax)</th>
                <th className="font-medium px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-text-faint">
                    Empty
                  </td>
                </tr>
              )}
              {lines.map((line) => (
                <tr key={line.id} className="border-t border-border hover:bg-surface-hover">
                  <td className="px-3 py-3 text-text!">
                    {line.productRef} - {line.productLabel}
                  </td>
                  <td className="px-3 py-3 text-text-muted">{line.vatRate}%</td>
                  <td className="px-3 py-3 text-text-muted">{line.discountPercent}%</td>
                  <td className="px-3 py-3 text-text-muted">{line.qty}</td>
                  <td className="px-3 py-3 text-text-muted">{money(line.unitPriceExclTax)}</td>
                  <td className="px-3 py-3 text-text-muted">{money(line.unitPriceInclTax)}</td>
                  <td className="px-3 py-3 text-text-muted">{money(line.totalInclTax)}</td>
                  <td className="px-3 py-3">
                    {canEdit && (
                      <button type="button" onClick={() => handleDeleteLine(line.id)} className="text-danger hover:opacity-70" title="Delete line">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky -bottom-6 z-20 -mx-6 px-6 pt-4 pb-4 bg-white dark:bg-gray-950 border-t border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="space-y-1">
            <span className={labelCls}>Bank account *</span>
            <select className={inputCls} value={fkAccount ?? ''} onChange={(e) => setFkAccount(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select a bank account</option>
              {refData?.bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelCls}>Payment Type *</span>
            <select className={inputCls} value={modeReglementId ?? ''} onChange={(e) => setModeReglementId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select a payment type</option>
              {refData?.paymentTypes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelCls}>Payment Terms</span>
            <select className={inputCls} value={condReglementId ?? ''} onChange={(e) => setCondReglementId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select payment terms</option>
              {refData?.paymentTerms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className={labelCls}>Currency</span>
            <select className={inputCls} value={multicurrencyCode} onChange={(e) => setMulticurrencyCode(e.target.value)}>
              {refData?.currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="space-y-1 flex-1 min-w-[240px]">
            <span className={labelCls}>Payment Note</span>
            <input type="text" className={inputCls} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Note" />
          </label>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span>
              VAT: <b className="text-text!">{money(invoice?.totalVat ?? 0)}</b>
            </span>
            <span>
              Total (excl.): <b className="text-text!">{money(invoice?.totalExclTax ?? 0)}</b>
            </span>
            <span>
              Items: <b className="text-text!">{lines.length}</b>
            </span>
            <span>
              Total (incl.): <b className="text-text!">{money(invoice?.totalInclTax ?? 0)}</b>
            </span>
          </div>

          <label className="space-y-1">
            <span className={labelCls}>Received Amount ({multicurrencyCode})</span>
            <input
              type="text"
              className={`${inputCls} w-40 text-right`}
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
            />
          </label>
        </div>

        {saveMessage && <p className={`text-sm ${saveMessage.ok ? 'text-success-fg' : 'text-danger'}`}>{saveMessage.text}</p>}
        {assign.isError && <p className="text-sm text-danger">{describeAsycudaPurchaseError(assign.error, 'Could not assign products.')}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            Total Amount: <b className="text-text!">{money(invoice?.totalInclTax ?? 0)}</b>
            {' '}{multicurrencyCode}
          </div>
          <div className="flex gap-2">
            {place && isDraft && (
              <>
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  disabled={save.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border border-border text-text! hover:bg-surface-hover disabled:opacity-50"
                >
                  {save.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('valid')}
                  disabled={save.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50"
                >
                  {save.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
                  Save as Invoice
                </button>
                <button
                  type="button"
                  onClick={handleDeleteInvoice}
                  disabled={deleteInvoice.isPending}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-danger text-white hover:opacity-90 disabled:opacity-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showProductsPanel && (
        <ProductsPanel declaration={declaration} onClose={() => setShowProductsPanel(false)} onAssign={handleAssign} assigning={assign.isPending} />
      )}
    </div>
  )
}
