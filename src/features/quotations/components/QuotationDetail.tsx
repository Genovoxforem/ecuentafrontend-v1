import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SendQuotationEmailModal } from './SendQuotationEmailModal'
import {
  FileBadge,
  X,
  LoaderCircle,
  Mail,
  RotateCcw,
  Copy,
  Trash2,
  Check,
  CheckCircle,
  ShoppingCart,
  Wrench,
  FileSignature,
  ReceiptText,
  FileCheck2,
  Link2,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { formatMoney, formatNumber } from '../../../utils/format'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import {
  useQuotationCard,
  useValidateQuotation,
  useReopenQuotation,
  useCloseAsQuotation,
  useClassifyBilledQuotation,
  useCloneQuotation,
  useDeleteQuotation,
  useGenerateQuotationDoc,
} from '../quotationDetail.queries'
import { TABS, type TabKey, InfoRow } from './QuotationDetailShared'

const LazyTabRenderer = lazy(() => import('./QuotationDetailTabs').then(m => ({ default: m.LazyTabRenderer })))

function CloseAsForm({ id }: { id: string }) {
  const closeAs = useCloseAsQuotation()
  const [statut, setStatut] = useState<'2' | '3'>('2')
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover">
        <CheckCircle size={14} /> Set Accepted/Refused
      </button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
      <select value={statut} onChange={(e) => setStatut(e.target.value as '2' | '3')} className={inputClasses}>
        <option value="2">Signed (needs billing)</option>
        <option value="3">Not signed (closed)</option>
      </select>
      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className={inputClasses} />
      <button
        type="button"
        disabled={closeAs.isPending}
        onClick={() => closeAs.mutate({ id, statut, notePrivate: note }, { onSuccess: () => setOpen(false) })}
        className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {closeAs.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Confirm
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-muted hover:text-text">
        Cancel
      </button>
    </div>
  )
}

function ActionButtons({ id, socid }: { id: string; socid: number | null }) {
  const navigate = useNavigate()
  const validate = useValidateQuotation()
  const reopen = useReopenQuotation()
  const classifyBilled = useClassifyBilledQuotation()
  const clone = useCloneQuotation()
  const del = useDeleteQuotation()
  const { data } = useQuotationCard(id)
  const [showSendEmail, setShowSendEmail] = useState(false)
  const actions = data?.actions
  if (!actions) return null

  const btnCls = 'flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60'
  const dangerCls = 'flex items-center gap-1.5 rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-60'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.canValidate && (
        <button type="button" disabled={validate.isPending} onClick={() => validate.mutate(id)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {validate.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Validate
        </button>
      )}
      {actions.canReopen && (
        <button type="button" disabled={reopen.isPending} onClick={() => reopen.mutate(id)} className={btnCls}>
          {reopen.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />} Re-Open
        </button>
      )}
      {actions.canSendMail && (
        <button type="button" onClick={() => setShowSendEmail(true)} className={btnCls}>
          <Mail size={14} /> Send Email
        </button>
      )}
      {showSendEmail && <SendQuotationEmailModal id={id} quotationRef={data?.ref ?? id} onClose={() => setShowSendEmail(false)} />}
      {actions.canCloseAsAcceptedRefused && <CloseAsForm id={id} />}
      {actions.canCreateOrder && (
        <Link to={ROUTES.orderCreate} className={btnCls}>
          <ShoppingCart size={14} /> Create Order
        </Link>
      )}
      {actions.canCreateIntervention && (
        <Link to={ROUTES.quotationCreateIntervention.replace(':id', id)} className={btnCls}>
          <Wrench size={14} /> Create Intervention
        </Link>
      )}
      {actions.canCreateContract && (
        <Link to={ROUTES.quotationCreateContract.replace(':id', id)} className={btnCls}>
          <FileSignature size={14} /> Create Contract
        </Link>
      )}
      {actions.canCreateInvoice && (
        <Link to={ROUTES.quotationCreateInvoice.replace(':id', id)} className={btnCls}>
          <ReceiptText size={14} /> Create Invoice Or Credit Note
        </Link>
      )}
      {actions.canClassifyBilled && (
        <button type="button" disabled={classifyBilled.isPending} onClick={() => classifyBilled.mutate({ id, socid })} className={btnCls}>
          {classifyBilled.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <FileCheck2 size={14} />} Classify Billed
        </button>
      )}
      {actions.canClone && (
        <button
          type="button"
          disabled={clone.isPending}
          onClick={() => {
            if (!window.confirm('Clone this quotation into a new draft?')) return
            clone.mutate({ id, socid }, { onSuccess: (newId) => newId && navigate(ROUTES.quotationDetail.replace(':id', newId)) })
          }}
          className={btnCls}
        >
          {clone.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Copy size={14} />} Clone
        </button>
      )}
      {actions.canDelete && (
        <button
          type="button"
          disabled={del.isPending}
          onClick={() => {
            if (!window.confirm('Delete this quotation? This cannot be undone.')) return
            del.mutate(id, { onSuccess: () => navigate(ROUTES.quotationList) })
          }}
          className={dangerCls}
        >
          {del.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
        </button>
      )}
    </div>
  )
}

function LinkedFilesSection({ id }: { id: string }) {
  const { data } = useQuotationCard(id)
  const generateDoc = useGenerateQuotationDoc(id)
  const [model, setModel] = useState('')
  const [langId, setLangId] = useState('')
  if (!data) return null
  const { docGen, linkedFiles } = data
  const selectedModel = model || docGen.modelOptions[0]?.value || ''
  const selectedLang = langId || docGen.defaultLang

  return (
    <Card className="!h-auto shrink-0">
      <h3 className="font-semibold text-text! mb-3">Linked files</h3>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={selectedModel} onChange={(e) => setModel(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
          {docGen.modelOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={selectedLang} onChange={(e) => setLangId(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
          {docGen.langOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={generateDoc.isPending}
          onClick={() => generateDoc.mutate({ token: docGen.token, model: selectedModel, langId: selectedLang })}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {generateDoc.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null} Generate
        </button>
      </div>
      {linkedFiles.length === 0 ? (
        <p className="text-sm text-text-faint">No documents generated yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {linkedFiles.map((f) => (
            <li key={f.name}>
              <a href={f.url} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline">
                {f.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// Form::showLinkedObjectBlock() — the real "Related Objects" table showing
// other documents linked to/from this quotation (e.g. a Contract created
// via the "Create Contract" button above). Generic across every Dolibarr
// document type, not propal-specific — see quotationCardParser.ts's
// RelatedObjectRow comment. No native detail page exists yet for these
// other document types, so each ref opens the real legacy page.
function RelatedObjectsSection({ id }: { id: string }) {
  const { data } = useQuotationCard(id)
  if (!data) return null
  const { relatedObjects } = data

  return (
    <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-text!">Related Objects</h3>
      </div>
      {relatedObjects.length === 0 ? (
        <p className="px-4 py-4 text-sm text-text-faint italic">No related objects.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Type</th>
                <th className="font-medium px-4 py-2.5">Ref</th>
                <th className="font-medium px-4 py-2.5">Date</th>
                <th className="font-medium px-4 py-2.5 text-right">Amount (Excl.)</th>
                <th className="font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {relatedObjects.map((o, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-text-muted">{o.type}</td>
                  <td className="px-4 py-2.5">
                    <a href={stripBackendPrefix(o.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline">
                      <Link2 size={12} /> {o.ref}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-text-muted">{o.date}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(o.amount)}</td>
                  <td className="px-4 py-2.5 text-text-muted">{o.statusLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// FormMargin::displayMarginInfos() — only rendered on the real page when
// the margin module is enabled and the user has margins->liretous rights.
function MarginDetailsSection({ id }: { id: string }) {
  const { data } = useQuotationCard(id)
  if (!data || data.marginRows.length === 0) return null

  return (
    <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-text!">Margin Details</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Margins</th>
              <th className="font-medium px-4 py-2.5 text-right">Selling Price</th>
              <th className="font-medium px-4 py-2.5 text-right">Cost Price</th>
              <th className="font-medium px-4 py-2.5 text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {data.marginRows.map((m, i) => {
              const isTotal = m.label.toLowerCase().includes('total')
              return (
                <tr key={i} className={`border-b border-border last:border-0 ${isTotal ? 'font-semibold' : ''}`}>
                  <td className="px-4 py-2.5 text-text!">{m.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(m.sellingPrice)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(m.costPrice)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(m.margin)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// FormActions::showactions($object, 'propal', $socid, 1) — the compact
// "Latest linked events" mini-widget (distinct from the full Events/Agenda
// tab).
function LatestLinkedEventsSection({ id }: { id: string }) {
  const { data } = useQuotationCard(id)
  if (!data) return null
  const { latestLinkedEvents } = data

  return (
    <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-text!">Latest linked events</h3>
      </div>
      {latestLinkedEvents.length === 0 ? (
        <p className="px-4 py-4 text-sm text-text-faint italic">No linked events.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Ref</th>
                <th className="font-medium px-4 py-2.5">Date</th>
                <th className="font-medium px-4 py-2.5">By</th>
                <th className="font-medium px-4 py-2.5">Type</th>
                <th className="font-medium px-4 py-2.5">Title</th>
              </tr>
            </thead>
            <tbody>
              {latestLinkedEvents.map((e, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    {e.url ? (
                      <a href={stripBackendPrefix(e.url)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {e.ref}
                      </a>
                    ) : (
                      e.ref
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted">{e.date}</td>
                  <td className="px-4 py-2.5 text-text-muted">{e.by}</td>
                  <td className="px-4 py-2.5 text-text-muted">{e.type}</td>
                  <td className="px-4 py-2.5 text-text-muted">{e.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export function QuotationDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('quotation')
  const { data, isLoading, isError } = useQuotationCard(id)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted p-6">
        <LoaderCircle size={16} className="animate-spin" /> Loading quotation…
      </div>
    )
  }
  if (isError || !data) {
    return <p className="p-6 text-sm text-danger">Could not load this quotation.</p>
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <Card className="!h-auto shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
              <FileBadge size={20} className="text-brand" /> {data.ref}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Ref. customer: {data.refCustomer || '—'} · Third-party:{' '}
              {data.socid ? (
                <Link to={`${ROUTES.customerDetail.replace(':id', String(data.socid))}?tab=customer`} className="text-brand hover:underline">
                  {data.thirdPartyName}
                </Link>
              ) : (
                data.thirdPartyName
              )}
              {data.projectRef && <> · Project: {data.projectRef}</>}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {data.statusLabel && <span className="rounded-full bg-surface-alt border border-border px-3 py-1 text-xs font-medium text-text">{data.statusLabel}</span>}
            <Link to={ROUTES.quotationList} className="p-2 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
              <X size={16} />
            </Link>
          </div>
        </div>

        <div className="mt-3 -mx-4 -mb-4 border-t border-border">
          <div className="flex items-center gap-0 overflow-x-auto px-4">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                }`}
              >
                <Icon size={14} className="shrink-0" /> {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {tab === 'quotation' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="!h-auto shrink-0">
              <table className="w-full">
                <tbody>
                  <InfoRow label="Discounts" value={data.discountsText} />
                  <InfoRow label="Date" value={data.date} />
                  <InfoRow label="Validity Ending Date" value={data.validityEndingDate} />
                  <InfoRow label="Payment Terms" value={data.paymentTerms} />
                  <InfoRow label="Delivery Date" value={data.deliveryDate} />
                  <InfoRow label="Availability Delay (After Order)" value={data.availabilityDelay} />
                  {data.shippingMethod && <InfoRow label="Shipping Method" value={data.shippingMethod} />}
                  <InfoRow label="Source" value={data.source} />
                  <InfoRow label="Payment Type" value={data.paymentType} />
                  {data.currency && <InfoRow label="Currency" value={data.currency} />}
                  {data.bankAccount && <InfoRow label="Bank Account" value={data.bankAccount} />}
                  <InfoRow label="Calculated Weight" value={data.calculatedWeight} />
                  {data.incotermLabel && <InfoRow label="Incoterms" value={data.incotermLabel} />}
                </tbody>
              </table>
            </Card>
            <Card className="!h-auto shrink-0">
              <table className="w-full">
                <tbody>
                  <InfoRow label="Amount (Excl. Tax)" value={`${formatMoney(data.amountHt)} ZMW`} />
                  <InfoRow label="VAT" value={`${formatMoney(data.amountVat)} ZMW`} />
                  <InfoRow label="Amount (Inc. Tax)" value={`${formatMoney(data.amountTtc)} ZMW`} />
                </tbody>
              </table>
            </Card>
          </div>

          <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text!">Item Table</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium px-4 py-2.5">Product / Service</th>
                    <th className="font-medium px-4 py-2.5">VAT</th>
                    <th className="font-medium px-4 py-2.5 text-right">Unit Price (Excl.)</th>
                    <th className="font-medium px-4 py-2.5 text-right">Unit Price (Inc. Tax)</th>
                    <th className="font-medium px-4 py-2.5 text-center">Qty</th>
                    <th className="font-medium px-4 py-2.5 text-center">Disc.</th>
                    <th className="font-medium px-4 py-2.5 text-right">Cost Price</th>
                    <th className="font-medium px-4 py-2.5 text-right">Total (Incl.)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-text-faint italic">
                        No lines on this quotation.
                      </td>
                    </tr>
                  ) : (
                    data.lines.map((l) => (
                      <tr key={l.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-text!">{l.productLabel || l.description}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">
                          {l.vatRate}%{l.vatCode ? `(${l.vatCode})` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(l.unitPriceExcl)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(l.unitPriceExcl * (1 + l.vatRate / 100))}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">{formatNumber(l.qty)}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">
                          {l.discountValue}
                          {l.discountType === '1' ? '%' : ' (flat)'}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{l.buyingPrice ? formatMoney(l.buyingPrice) : '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text!">{formatMoney(l.totalTtc)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="!h-auto shrink-0">
            <ActionButtons id={id!} socid={data.socid} />
          </Card>

          <LinkedFilesSection id={id!} />

          <RelatedObjectsSection id={id!} />

          <MarginDetailsSection id={id!} />

          <LatestLinkedEventsSection id={id!} />
        </>
      )}

      {tab !== 'quotation' && (
        <Suspense fallback={<LegacyLoadingCard label="Loading…" />}>
          <LazyTabRenderer tab={tab} id={id!} socid={data.socid ?? undefined} />
        </Suspense>
      )}
    </div>
  )
}
