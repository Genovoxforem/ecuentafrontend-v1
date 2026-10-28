import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { RefreshCcw, LoaderCircle, Pencil, Plus, X, CheckCircle2, Copy, Trash2, ExternalLink, FileText, Banknote } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { LinkDocumentButton } from '../../../../shared/components/LinkDocumentButton'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { useProductOptions } from '../../../products/products.queries'
import { useAddSalesInvoiceLine, useUpdateSalesInvoiceLine, useDeleteSalesInvoiceLine, useSyncSalesInvoiceZra, fetchSalesProductPricing, type SalesLineInput } from '../../salesInvoice.queries'
import type { SalesInvoiceData, SalesInvoiceLine } from '../../salesInvoiceApi'
import { useGenerateSalesDocument, useSalesInvoiceZraPortal } from '../../salesInvoiceTabs.queries'
import { usePaymentTypeOptions, useBankAccountOptions, useRecordSalesPayment, type RecordPaymentInput } from '../../salesInvoiceActions.queries'
import { ActionButton, TabTitle, inputCls, parseMarginRows, selectCls } from './InvoiceDetailShared'
import { InvoiceActionButtons } from './actionButtons'

// inv.payment_status_class from the real API is a literal Bootstrap class
// (bg-success/bg-secondary/etc) — mapped the same way as statusBadgeCls.
function bootstrapBadgeCls(cls: string): string {
  if (cls.includes('success')) return 'bg-success-bg text-success-fg'
  if (cls.includes('danger')) return 'bg-danger-bg text-danger-fg'
  if (cls.includes('warning')) return 'bg-warning-bg text-warning-fg'
  if (cls.includes('info')) return 'bg-info-bg text-info-fg'
  return 'bg-surface-hover text-text-muted'
}

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

// Real contract: POST compta/sales/api/payment.php action=create_payment —
// scoped to a single invoice rather than the real page's full multi-invoice
// batch UI (see salesInvoiceActions.queries.ts header).
function RecordPaymentModal({ data, onCancel }: { data: SalesInvoiceData; onCancel: () => void }) {
  const inv = data.invoice
  const paymentTypes = usePaymentTypeOptions(true)
  const bankAccounts = useBankAccountOptions(true)
  const recordPayment = useRecordSalesPayment(inv.id)

  const [amount, setAmount] = useState(data.balance_raw ? String(data.balance_raw) : '0')
  const [datepaid, setDatepaid] = useState(todayIsoDate())
  const [paiementcode, setPaiementcode] = useState('')
  const [accountid, setAccountid] = useState('')
  const [numPaiement, setNumPaiement] = useState('')
  const [comment, setComment] = useState('')
  const [closepaidinvoices, setClosepaidinvoices] = useState(true)

  const submit = () => {
    const input: RecordPaymentInput = {
      facid: inv.id,
      socid: inv.socid,
      invoiceType: inv.type,
      amount,
      datepaid,
      paiementcode,
      accountid,
      numPaiement,
      comment,
      closepaidinvoices,
    }
    recordPayment.mutate(input, { onSuccess: () => setTimeout(onCancel, 800) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Record Payment</h3>
          <button type="button" onClick={onCancel} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {recordPayment.isSuccess ? (
          <p className="text-sm text-success">Payment recorded.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Amount</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Date</span>
                <input type="date" value={datepaid} onChange={(e) => setDatepaid(e.target.value)} className={`${inputCls} text-left`} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Payment Type</span>
                <select value={paiementcode} onChange={(e) => setPaiementcode(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  {(paymentTypes.data ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Bank Account</span>
                <select value={accountid} onChange={(e) => setAccountid(e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  {(bankAccounts.data ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm col-span-2">
                <span className="mb-1 block text-xs font-medium text-text-muted">Payment Number / Ref</span>
                <input value={numPaiement} onChange={(e) => setNumPaiement(e.target.value)} className={`${inputCls} text-left`} />
              </label>
              <label className="block text-sm col-span-2">
                <span className="mb-1 block text-xs font-medium text-text-muted">Comment</span>
                <input value={comment} onChange={(e) => setComment(e.target.value)} className={`${inputCls} text-left`} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={closepaidinvoices} onChange={(e) => setClosepaidinvoices(e.target.checked)} /> Close invoice if fully paid
            </label>
            {recordPayment.isError && <p className="text-xs text-danger">{recordPayment.error instanceof Error ? recordPayment.error.message : 'Could not record this payment.'}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
              <ActionButton tone="success" icon={Banknote} onClick={submit} pending={recordPayment.isPending} disabled={!paiementcode || !accountid || Number(amount) <= 0}>
                Record
              </ActionButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Real contract: POST compta/sales/api/zra.php, action=selectinvoice,
// facid — read verbatim from the inline ZRAOffcanvas script on the real
// page (see salesInvoiceTabs.queries.ts).
function ZraPortalModal({ facid, onCancel }: { facid: string; onCancel: () => void }) {
  const { data, isLoading, isError, error } = useSalesInvoiceZraPortal(facid, true)
  const rows: [string, string | undefined][] = data
    ? [
        ['Customer', data.customer],
        ['Invoice Ref', data.invoice_ref],
        ['Invoice No', data.portal.invoice_no],
        ['Receipt No', data.portal.receipt_no],
        ['Date', data.portal.date],
        ['Internal Data', data.portal.internal_data],
        ['Signature', data.portal.signature],
        ['SDC ID', data.portal.sdc_id],
        ['MRC', data.portal.mrc],
        ['Error Code', data.portal.errorcode],
        ['Error Message', data.portal.errormessage],
      ]
    : []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">ZRA Portal Details</h3>
          <button type="button" onClick={onCancel} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {isLoading && <p className="text-sm text-text-muted">Loading…</p>}
        {isError && <p className="text-xs text-danger">{error instanceof Error ? error.message : 'Could not load ZRA portal details.'}</p>}
        {data?.portal.qr_url && (
          <div className="flex justify-center">
            <a href={data.portal.qr_url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline break-all text-center">
              {data.portal.qr_url}
            </a>
          </div>
        )}
        <div className="space-y-2 text-sm">
          {rows
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-text-muted">{label}</span>
                <span className="font-medium text-text! text-right break-all">{value}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// Compact "Linked Files" card on the main Customer Invoice tab — not just a
// read-only file list: the classic card.php has its own Doc
// Template/Language/Generate mini-form here (InvoiceTab.generateMiniPDF(),
// separate from the full version on the Linked Files tab), see
// sales_invoice.js's own renderLinkedFilesCard().
export function LinkedFilesMiniCard({ data }: { data: SalesInvoiceData }) {
  const facid = data.invoice.id
  const generateDoc = useGenerateSalesDocument(facid)
  const [model, setModel] = useState('')
  const selectedModel = model || data.models.find((m) => m.selected)?.value || data.models[0]?.value || ''
  const [lang, setLang] = useState('en_US')

  return (
    <Card className="!h-auto">
      <TabTitle count={data.files.length}>Linked Files</TabTitle>
      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide">Generate PDF</p>
        <div className="grid grid-cols-2 gap-2">
          <select value={selectedModel} onChange={(e) => setModel(e.target.value)} className={selectCls}>
            {data.models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className={selectCls}>
            <option value="en_US">English</option>
            <option value="fr_FR">French</option>
            <option value="es_ES">Spanish</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!selectedModel || generateDoc.isPending}
            onClick={() => generateDoc.mutate({ model: selectedModel, lang, token: '' })}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {generateDoc.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <FileText size={13} />} Generate
          </button>
          <button
            type="button"
            disabled={!selectedModel || generateDoc.isPending}
            title="Generate Copy"
            onClick={() => generateDoc.mutate({ model: selectedModel, lang, token: '', copy: true })}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-input-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            <Copy size={13} />
          </button>
        </div>
        {generateDoc.isError && <p className="text-xs text-danger">{generateDoc.error instanceof Error ? generateDoc.error.message : 'Could not generate the document.'}</p>}
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Files</p>
        {data.files.length === 0 ? (
          <p className="text-sm text-text-faint italic">No files yet. Generate PDF above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a href={f.download_url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                  {f.name}
                </a>
                <span className="text-text-muted shrink-0 text-xs">{f.size}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

export function InvoiceMainTab({ data }: { data: SalesInvoiceData }) {
  const queryClient = useQueryClient()
  const inv = data.invoice
  const facid = inv.id
  const zraSync = useSyncSalesInvoiceZra(facid)
  const marginRows = data.margin.enabled ? (data.margin.rows ?? parseMarginRows(data.margin.margin_info)) : []
  const [showZraPortal, setShowZraPortal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  // Backend bug: inv.currency_symbol always returns the company's base
  // currency (ZMW) regardless of the invoice's own currency, and
  // total_ht_f/total_tva_f/total_ttc_f are always base-currency amounts —
  // the classic compta/sales/card.php page itself pairs these base amounts
  // with the multicurrency_symbol label (showing "100 INR" for what is
  // actually 100 ZMW), which is wrong. Handled here by switching to the
  // multicurrency_total_*_f fields (the foreign-currency amounts) whenever
  // the invoice carries a foreign currency — those fields come back as "0"
  // for base-currency invoices, which is how this is detected.
  const isForeignCurrency = Number(inv.multicurrency_total_ttc) > 0
  const amountHt = isForeignCurrency ? inv.multicurrency_total_ht_f : inv.total_ht_f
  const amountTva = isForeignCurrency ? inv.multicurrency_total_tva_f : inv.total_tva_f
  const amountTtc = isForeignCurrency ? inv.multicurrency_total_ttc_f : inv.total_ttc_f
  const amountSymbol = isForeignCurrency ? inv.multicurrency_symbol : inv.currency_symbol

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="!h-auto">
          <TabTitle>Invoice Details</TabTitle>
          {/* Three columns with hairline dividers between cells; label above, value below. */}
          <div className="mt-3 grid grid-cols-1 text-sm sm:grid-cols-3">
            {[
              ['Type', inv.type_label],
              ['Discounts', inv.discount_info],
              ['Invoice Date', inv.date],
              ['Payment Terms', inv.cond_reglement_label],
              ['Payment Due On', inv.date_due],
              ['Payment Type', inv.mode_reglement_label],
              ['Currency', inv.currency],
              ['Bank Account', inv.bank_label],
              ['Incoterms', inv.incoterms],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border-t border-border px-4 py-3 first:border-t-0 sm:border-l sm:[&:nth-child(-n+3)]:border-t-0 sm:[&:nth-child(3n+1)]:border-l-0 sm:[&:nth-child(3n+1)]:pl-0"
              >
                <p className="text-xs text-text-faint">{label}</p>
                <p className="mt-0.5 font-semibold text-text!">{value || '—'}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-hover text-text-muted text-xs font-medium">
              {inv.ventil_compta ? 'Posted to Ledger' : 'Not Posted to Ledger'}
            </span>
          </div>
        </Card>

        <ItemTableCard data={data} />

        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <TabTitle>Payment Details</TabTitle>
              {inv.payment_status && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bootstrapBadgeCls(inv.payment_status_class)}`}>{inv.payment_status}</span>}
            </div>
            {Number(inv.statut) === 1 && (
              <ActionButton tone="success" icon={Banknote} onClick={() => setShowPaymentModal(true)}>
                Record Payment
              </ActionButton>
            )}
          </div>
          {data.payments.length === 0 ? (
            <p className="text-sm text-text-faint italic p-4">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium px-4 py-2.5">Payment</th>
                    <th className="font-medium px-4 py-2.5">Date</th>
                    <th className="font-medium px-4 py-2.5">Type</th>
                    <th className="font-medium px-4 py-2.5">Bank Account</th>
                    <th className="font-medium px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.rowid} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium text-text!">{p.ref}</td>
                      <td className="px-4 py-2.5 text-text-muted">{p.date}</td>
                      <td className="px-4 py-2.5 text-text-muted">{p.type}</td>
                      <td className="px-4 py-2.5 text-text-muted">{p.bank || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-text!">{p.amount_f}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="space-y-1.5 px-4 py-3 border-t border-border text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Already Paid (Without Credit Notes And Down Payments)</span>
              <span className="font-medium text-text!">{data.total_paid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Billed</span>
              <span className="font-medium text-text!">
                {amountTtc} {amountSymbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-text!">Remaining Unpaid</span>
              <span className={`font-bold ${data.balance_raw > 0 ? 'text-danger' : 'text-success'}`}>{data.balance}</span>
            </div>
          </div>
        </Card>

        {inv.online_pay_url && (
          <Card className="!h-auto">
            <TabTitle>URL for Online Payment</TabTitle>
            <div className="flex items-center gap-2 mt-3">
              <input
                readOnly
                value={inv.online_pay_url}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 min-w-0 text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(inv.online_pay_url)}
                className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-surface-hover"
              >
                Copy
              </button>
              <a href={inv.online_pay_url} target="_blank" rel="noreferrer" className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-surface-hover">
                Open
              </a>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card className="!h-auto">
          <TabTitle>Price Details</TabTitle>
          <div className="space-y-1.5 mt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Subtotal (Excl. Tax)</span>
              <span className="font-medium text-text!">
                {amountHt} {amountSymbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">VAT</span>
              <span className="font-medium text-text!">
                {amountTva} {amountSymbol}
              </span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-border">
              <span className="font-semibold text-text!">Total (Incl. Tax)</span>
              <span className="font-bold text-brand">
                {amountTtc} {amountSymbol}
              </span>
            </div>
          </div>
        </Card>

        <Card className="!h-auto">
          <div className="flex items-center justify-between">
            <TabTitle>ZRA Invoice Details</TabTitle>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowZraPortal(true)}
                title="View ZRA Portal Details"
                className="flex items-center gap-1 rounded-md border border-input-border p-1.5 text-text-muted hover:bg-surface-hover"
              >
                <ExternalLink size={12} />
              </button>
              {data.zra.errorcode && data.zra.errorcode !== '000' && (
                <button
                  type="button"
                  disabled={zraSync.isPending}
                  onClick={() => zraSync.mutate()}
                  title="Query ZRA for this invoice's latest status"
                  className="flex items-center gap-1.5 rounded-md border border-input-border px-2.5 py-1 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60"
                >
                  {zraSync.isPending ? <LoaderCircle size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                  Sync
                </button>
              )}
            </div>
          </div>
          {zraSync.isError && <p className="text-xs text-danger mt-2">{zraSync.error instanceof Error ? zraSync.error.message : 'Sync failed.'}</p>}
          <div className="space-y-2 mt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">ZRA Invoice Status</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${data.zra.errorcode === '000' ? 'bg-success-bg text-success-fg' : data.zra.errorcode ? 'bg-danger-bg text-danger-fg' : 'bg-warning-bg text-warning-fg'}`}>
                {data.zra.errorcode === '000' ? 'IT IS SUCCEEDED' : data.zra.status || 'Not Submitted'}
              </span>
            </div>
            {[
              ['Receipt No', data.zra.receipt_no],
              ['Internal Data', data.zra.internal_data],
              ['Invoice Signature', data.zra.signature],
              ['Invoice No', data.zra.invoice_no],
              ['SDC ID', data.zra.sdc_id],
              ['MRC', data.zra.mrc],
              ['Date', data.zra.date],
            ].map(([label, value]) =>
              value ? (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-text-muted">{label}</span>
                  <span className="font-medium text-text! text-right break-all">{value}</span>
                </div>
              ) : null,
            )}
          </div>
        </Card>

        <LinkedFilesMiniCard data={data} />

        <Card className="!h-auto">
          <div className="flex items-center justify-between gap-2">
            <TabTitle>Related Objects</TabTitle>
            <LinkDocumentButton element="facture" id={Number(data.invoice.id)} onLinked={() => void queryClient.invalidateQueries({ queryKey: ['salesInvoice', String(data.invoice.id)] })} />
          </div>
          {data.related.length === 0 ? <p className="text-sm text-text-faint italic mt-2">None</p> : <p className="text-sm text-text-faint italic mt-2">{data.related.length} linked object(s).</p>}
        </Card>

        {marginRows.length > 0 && (
          <Card className="!h-auto !p-0 overflow-hidden">
            <p className="text-sm font-semibold text-text! px-4 pt-4 pb-2">Margin Details</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Margins</th>
                  <th className="font-medium py-2 px-3 text-right">Selling Price</th>
                  <th className="font-medium py-2 px-3 text-right">Cost Price</th>
                  <th className="font-medium py-2 px-4 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {marginRows.map((r) => (
                  <tr key={r.label} className={r.label === 'TotalMargin' ? '' : 'border-b border-border'}>
                    <td className={`py-2 px-4 ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.label}</td>
                    <td className={`py-2 px-3 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.sellingPrice}</td>
                    <td className={`py-2 px-3 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.costPrice}</td>
                    <td className={`py-2 px-4 text-right ${r.label === 'TotalMargin' ? 'font-semibold text-text!' : 'text-text-muted'}`}>{r.margin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
      {showZraPortal && <ZraPortalModal facid={facid} onCancel={() => setShowZraPortal(false)} />}
      {showPaymentModal && <RecordPaymentModal data={data} onCancel={() => setShowPaymentModal(false)} />}
    </div>
  )
}

interface EditingLineState {
  lineId: string
  desc: string
  qty: string
  priceHt: string
  vatDisplay: string
  vatRateStr: string
  discount: string
}

// Real Item Table: view/add/edit/delete lines against compta/sales/api/
// invoice.php (action=addline/updateline/deleteline — see
// salesInvoice.queries.ts), plus the real per-status action button row.
function ItemTableCard({ data }: { data: SalesInvoiceData }) {
  const inv = data.invoice
  const facid = inv.id
  const socid = inv.socid
  const isDraft = inv.statut === '0'
  // See InvoiceMainTab's own isForeignCurrency comment — same real bug,
  // same fix, applied per-line here.
  const isForeignCurrency = Number(inv.multicurrency_total_ttc) > 0

  const [showAddRow, setShowAddRow] = useState(false)
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('1')
  const [priceHt, setPriceHt] = useState('0')
  const [vatDisplay, setVatDisplay] = useState('0%')
  const [vatRateStr, setVatRateStr] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [pricingError, setPricingError] = useState('')

  const [editingLine, setEditingLine] = useState<EditingLineState | null>(null)
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null)

  // Products for sale, from /api/products/ — fetched once the add row opens.
  const { data: products } = useProductOptions(showAddRow)
  const productOptions = (products ?? []).filter((p) => p.forSale).map((p) => ({ value: p.id, text: p.ref ? `${p.ref} - ${p.label}` : p.label, label: p.label }))
  const addLine = useAddSalesInvoiceLine(facid)
  const updateLine = useUpdateSalesInvoiceLine(facid)
  const deleteLine = useDeleteSalesInvoiceLine(facid)

  const resetAddRow = () => {
    setProductId('')
    setQty('1')
    setPriceHt('0')
    setVatDisplay('0%')
    setVatRateStr('0')
    setDiscount('0')
  }

  const handleProductChange = async (value: string) => {
    setProductId(value)
    if (!value) return
    setLoadingPricing(true)
    setPricingError('')
    try {
      const pricing = await fetchSalesProductPricing(value, socid)
      setPriceHt(pricing.priceHt.toFixed(2))
      setVatDisplay(`${pricing.vatRate}%`)
      setVatRateStr(pricing.vatCode ? `${pricing.vatRate} (${pricing.vatCode})` : String(pricing.vatRate))
    } catch {
      setPricingError("Could not load this product's price/VAT.")
    } finally {
      setLoadingPricing(false)
    }
  }

  const submitAddLine = () => {
    if (!productId || Number(qty) <= 0) return
    const label = productOptions.find((p) => p.value === productId)?.label ?? ''
    const input: SalesLineInput = { productId, desc: label, qty: Number(qty), priceHt: Number(priceHt), vatRateStr, discountPercent: Number(discount) || 0, discountType: '1' }
    addLine.mutate(input, { onSuccess: () => { resetAddRow(); setShowAddRow(false) } })
  }

  const startEditLine = (line: SalesInvoiceLine) => {
    const vatRate = Number(line.tva_tx) || 0
    setEditingLine({
      lineId: line.rowid,
      desc: line.desc || line.label,
      qty: line.qty,
      priceHt: String(line.pu_ht),
      vatDisplay: `${vatRate}%${line.vat_src_code ? ` (${line.vat_src_code})` : ''}`,
      vatRateStr: line.vat_src_code ? `${vatRate} (${line.vat_src_code})` : String(vatRate),
      discount: line.remise_percent || '0',
    })
  }

  const submitEditLine = () => {
    if (!editingLine) return
    updateLine.mutate(
      {
        lineId: editingLine.lineId,
        productId: '',
        desc: editingLine.desc,
        qty: Number(editingLine.qty),
        priceHt: Number(editingLine.priceHt),
        vatRateStr: editingLine.vatRateStr,
        discountPercent: Number(editingLine.discount) || 0,
        discountType: '1',
      },
      { onSuccess: () => setEditingLine(null) },
    )
  }

  const confirmDeleteLine = () => {
    if (!deletingLineId) return
    deleteLine.mutate(deletingLineId, { onSuccess: () => setDeletingLineId(null) })
  }

  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <TabTitle>Item Table</TabTitle>
        {isDraft && (
          <button
            type="button"
            onClick={() => setShowAddRow((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={14} /> Add Line
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-4 py-2.5">Product/Service</th>
              <th className="font-medium px-4 py-2.5">Lot/Batch</th>
              <th className="font-medium px-4 py-2.5">VAT</th>
              <th className="font-medium px-4 py-2.5 text-right">Unit Price (Excl.)</th>
              <th className="font-medium px-4 py-2.5 text-right">Unit Price (Inc. Tax)</th>
              <th className="font-medium px-4 py-2.5 text-right">Qty</th>
              <th className="font-medium px-4 py-2.5 text-right">Disc.</th>
              <th className="font-medium px-4 py-2.5 text-right">Total (Inc. Tax)</th>
              {isDraft && <th className="font-medium px-4 py-2.5 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.lines.length === 0 && (
              <tr>
                <td colSpan={isDraft ? 9 : 8} className="px-4 py-6 text-center text-text-faint italic">
                  No lines on this invoice.
                </td>
              </tr>
            )}
            {data.lines.map((l) => (
              <tr key={l.rowid} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">
                  {l.product_id && Number(l.product_id) > 0 ? (
                    <Link to={ROUTES.productDetail.replace(':id', l.product_id)} className="font-medium text-brand hover:underline">
                      {l.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-text!">{l.label}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-text-muted">{l.lot_number || '—'}</td>
                <td className="px-4 py-2.5 text-text-muted">
                  {Number(l.tva_tx)}%{l.vat_src_code ? ` (${l.vat_src_code})` : ''}
                </td>
                <td className="px-4 py-2.5 text-right text-text-muted">{isForeignCurrency ? l.multicurrency_subprice_f : l.pu_ht_f}</td>
                <td className="px-4 py-2.5 text-right text-text-muted">
                  {isForeignCurrency ? (Number(l.multicurrency_subprice) * (1 + Number(l.tva_tx) / 100)).toFixed(2) : l.pu_ttc_f}
                </td>
                <td className="px-4 py-2.5 text-right text-text-muted">{l.qty}</td>
                <td className="px-4 py-2.5 text-right text-text-muted">{Number(l.remise_percent) > 0 ? `${l.remise_percent}%` : '—'}</td>
                <td className="px-4 py-2.5 text-right text-text!">{isForeignCurrency ? l.multicurrency_total_ttc_f : l.total_ttc_f}</td>
                {isDraft && (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" onClick={() => startEditLine(l)} title="Edit" className="rounded-md border border-input-border p-1.5 text-text-muted hover:bg-surface-hover">
                        <Pencil size={13} />
                      </button>
                      <button type="button" onClick={() => setDeletingLineId(l.rowid)} title="Delete" className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger-bg">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {isDraft && showAddRow && (
              <tr className="bg-surface-hover/40">
                <td className="px-3 py-2" colSpan={2}>
                  <select className={selectCls} value={productId} onChange={(e) => handleProductChange(e.target.value)}>
                    <option value="">Select product…</option>
                    {productOptions.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.text}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2 text-text-muted text-xs whitespace-nowrap">{loadingPricing ? '…' : vatDisplay}</td>
                <td className="px-2 py-2">
                  <input className={inputCls} value={priceHt} onChange={(e) => setPriceHt(e.target.value)} />
                </td>
                <td className="px-2 py-2 text-text-faint text-xs text-right">—</td>
                <td className="px-2 py-2">
                  <input className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} />
                </td>
                <td className="px-2 py-2">
                  <input className={inputCls} value={discount} onChange={(e) => setDiscount(e.target.value)} />
                </td>
                <td className="px-2 py-2 text-right text-text-faint text-xs">—</td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={submitAddLine}
                    disabled={!productId || loadingPricing || addLine.isPending}
                    className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {addLine.isPending ? <LoaderCircle size={12} className="animate-spin" /> : <Plus size={12} />} Add
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pricingError && <p className="text-xs text-danger px-4 pt-2">{pricingError}</p>}
      {addLine.isError && <p className="text-xs text-danger px-4 pt-2">{addLine.error instanceof Error ? addLine.error.message : 'Could not add this line.'}</p>}

      <InvoiceActionButtons data={data} />

      {editingLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingLine(null)}>
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text!">Edit Line</h3>
              <button type="button" onClick={() => setEditingLine(null)} className="text-text-faint hover:text-text" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-text-muted">
              {editingLine.desc} <span className="text-xs text-text-faint">· VAT {editingLine.vatDisplay} (fixed to product)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Qty</span>
                <input className={inputCls} value={editingLine.qty} onChange={(e) => setEditingLine({ ...editingLine, qty: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-text-muted">Unit Price (Excl.)</span>
                <input className={inputCls} value={editingLine.priceHt} onChange={(e) => setEditingLine({ ...editingLine, priceHt: e.target.value })} />
              </label>
              <label className="block text-sm col-span-2">
                <span className="mb-1 block text-xs font-medium text-text-muted">Discount %</span>
                <input className={inputCls} value={editingLine.discount} onChange={(e) => setEditingLine({ ...editingLine, discount: e.target.value })} />
              </label>
            </div>
            {updateLine.isError && <p className="text-xs text-danger">{updateLine.error instanceof Error ? updateLine.error.message : 'Could not update this line.'}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingLine(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
              <ActionButton tone="success" icon={CheckCircle2} onClick={submitEditLine} pending={updateLine.isPending}>
                Save
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {deletingLineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeletingLineId(null)}>
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-text!">Delete this line?</h3>
            {deleteLine.isError && <p className="text-xs text-danger">{deleteLine.error instanceof Error ? deleteLine.error.message : 'Could not delete this line.'}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingLineId(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
              <ActionButton tone="danger" icon={Trash2} onClick={confirmDeleteLine} pending={deleteLine.isPending}>
                Delete
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
