import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AddEventModal } from '../../agenda/components/AddEventModal'
import { SendPurchaseOrderEmailModal } from './SendPurchaseOrderEmailModal'
import {
  FileSignature,
  X,
  LoaderCircle,
  Users,
  PackageCheck,
  StickyNote,
  Paperclip,
  CalendarClock,
  Mail,
  RotateCcw,
  Copy,
  Trash2,
  FileCheck2,
  ReceiptText,
  ExternalLink,
  Upload,
  Link2,
  Eye,
  CalendarPlus,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney, formatNumber } from '../../../utils/format'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import {
  usePurchaseOrderCard,
  useReopenPurchaseOrder,
  useClassifyReceptionPurchaseOrder,
  useClassifyBilledPurchaseOrder,
  useClonePurchaseOrder,
  useDeletePurchaseOrder,
  useGeneratePurchaseOrderDoc,
  usePurchaseOrderContacts,
  useAddPurchaseOrderContact,
  usePurchaseOrderDispatch,
  usePurchaseOrderInfo,
  usePurchaseOrderDocuments,
  useUploadPurchaseOrderDocument,
  useLinkPurchaseOrderDocument,
} from '../purchaseOrderDetail.queries'

const selectCls = 'text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 w-full'

const TABS = [
  { key: 'order', label: 'Purchase Order', icon: FileSignature },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users },
  { key: 'receipts', label: 'Item Receipts', icon: PackageCheck },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'files', label: 'Linked Files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
] as const
type TabKey = (typeof TABS)[number]['key']

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2 pr-4 text-sm text-text-muted whitespace-nowrap align-top">{label}</td>
      <td className="py-2 text-sm text-text! align-top">{value || '—'}</td>
    </tr>
  )
}

// The 3 non-destructive status transitions (ReOpen/Classify Reception/
// Classify Billed) are real, plain GETs on the same card page — fired
// directly. Clone/Delete create or destroy real data, so they get a native
// confirm() first, matching the real page's own modal-confirmed behavior
// for exactly those two.
function ActionButtons({ id, socid }: { id: string; socid: number | null }) {
  const navigate = useNavigate()
  const reopen = useReopenPurchaseOrder()
  const classifyReception = useClassifyReceptionPurchaseOrder()
  const classifyBilled = useClassifyBilledPurchaseOrder()
  const clone = useClonePurchaseOrder()
  const del = useDeletePurchaseOrder()
  const { data } = usePurchaseOrderCard(id)
  const actions = data?.actions
  const [showSendEmail, setShowSendEmail] = useState(false)

  if (!actions) return null

  const btnCls = 'flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60'
  const dangerCls = 'flex items-center gap-1.5 rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-60'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.canSendMail && (
        <button type="button" onClick={() => setShowSendEmail(true)} className={btnCls}>
          <Mail size={14} /> Send Email
        </button>
      )}
      {showSendEmail && <SendPurchaseOrderEmailModal id={id} orderRef={data?.ref ?? id} onClose={() => setShowSendEmail(false)} />}
      {actions.canReopen && (
        <button type="button" disabled={reopen.isPending} onClick={() => reopen.mutate(id)} className={btnCls}>
          {reopen.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />} Re-Open
        </button>
      )}
      {actions.canCreateReception && (
        <Link to={ROUTES.purchaseOrderCreateReception.replace(':id', id)} className={btnCls}>
          <PackageCheck size={14} /> Create Reception
        </Link>
      )}
      {actions.canClassifyReception && (
        <button type="button" disabled={classifyReception.isPending} onClick={() => classifyReception.mutate(id)} className={btnCls}>
          {classifyReception.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <FileCheck2 size={14} />} Classify Reception
        </button>
      )}
      {actions.canCreateBill && (
        <Link to={ROUTES.vendorInvoiceCreate} className={btnCls}>
          <ReceiptText size={14} /> Create Invoice
        </Link>
      )}
      {actions.canClassifyBilled && (
        <button type="button" disabled={classifyBilled.isPending} onClick={() => classifyBilled.mutate(id)} className={btnCls}>
          {classifyBilled.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <FileCheck2 size={14} />} Classify Billed
        </button>
      )}
      {actions.canClone && (
        <button
          type="button"
          disabled={clone.isPending}
          onClick={() => {
            if (!window.confirm('Clone this purchase order into a new draft?')) return
            clone.mutate(
              { id, socid },
              { onSuccess: (newId) => newId && navigate(ROUTES.purchaseOrderDetail.replace(':id', newId)) },
            )
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
            if (!window.confirm('Delete this purchase order? This cannot be undone.')) return
            del.mutate(id, { onSuccess: () => navigate(ROUTES.purchaseOrderList) })
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
  const { data } = usePurchaseOrderCard(id)
  const generateDoc = useGeneratePurchaseOrderDoc(id)
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

function StubTab({ id, label, page }: { id: string; label: string; page: string }) {
  return (
    <Card className="!h-auto shrink-0 items-center text-center gap-2 !py-10">
      <p className="text-sm text-text-muted">The {label} tab isn't natively built yet — it's a much larger sub-page in the real backend (item-by-item reception/contact management/timeline).</p>
      <a href={`/fourn/commande/${page}?id=${id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        Open on the real legacy page <ExternalLink size={13} />
      </a>
    </Card>
  )
}

// Real per-tab page hrefs — read directly from core/lib/fourn.lib.php's
// ordersupplier_prepare_head(), the function that builds this exact tab bar
// on the real page. Only 'notes' is still stubbed — the note.php page
// itself hasn't been read/built yet.
const STUB_PAGES: Record<'notes', string> = {
  notes: 'note.php',
}

// Mirrors Sales Order Detail's own ContactsTab (fourn/commande/contact.php
// renders the exact same generic core/tpl/contacts.tpl.php template — see
// purchaseOrderDetail.queries.ts's header comment) — same 2 add-rows
// (Users / Third-Party Contacts) plus the assigned-contacts table.
function ContactsTab({ id }: { id: string }) {
  const [company, setCompany] = useState<string | undefined>(undefined)
  const { data, isLoading, isError } = usePurchaseOrderContacts(id, company)
  const addContact = useAddPurchaseOrderContact(id)

  const [userid, setUserid] = useState('')
  const [type, setType] = useState('')
  const [contactid, setContactid] = useState('')
  const [typecontact, setTypecontact] = useState('')

  if (isLoading) return <p className="p-4 text-sm text-text-muted">Loading contacts…</p>
  if (isError || !data) return <p className="p-4 text-sm text-danger">Could not load contacts.</p>
  const { rows, formOptions } = data
  const effectiveCompany = company ?? formOptions.selectedCompanyId

  return (
    <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Users size={14} className="text-brand" />
        <h3 className="font-semibold text-text!">Contacts / Addresses</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Nature of Contact</th>
              <th className="font-medium py-2 px-3">Third-Party</th>
              <th className="font-medium py-2 px-3">Users/Contacts/Addresses</th>
              <th className="font-medium py-2 px-3">Contact Type</th>
              <th className="font-medium py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2 px-4 text-text! whitespace-nowrap">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-text-faint" /> Users
                </span>
              </td>
              <td className="py-2 px-3 text-text-muted">{formOptions.issuerCompanyName || '—'}</td>
              <td className="py-2 px-3">
                <select value={userid} onChange={(e) => setUserid(e.target.value)} className={selectCls}>
                  <option value=""></option>
                  {formOptions.internalUserOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-3">
                <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                  {formOptions.internalTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-4 text-right">
                <button
                  type="button"
                  disabled={!userid || !type || type === '0' || addContact.isPending}
                  onClick={() => addContact.mutate({ source: 'internal', userid, type })}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  Add
                </button>
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 px-4 text-text! whitespace-nowrap">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-text-faint" /> Third-Party Contacts
                </span>
              </td>
              <td className="py-2 px-3">
                <select
                  value={effectiveCompany}
                  onChange={(e) => {
                    setCompany(e.target.value)
                    setContactid('')
                  }}
                  className={selectCls}
                >
                  {formOptions.companyOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-3">
                <select
                  value={contactid}
                  onChange={(e) => setContactid(e.target.value)}
                  disabled={!formOptions.hasRealExternalContact}
                  className={`${selectCls} disabled:opacity-50`}
                >
                  {formOptions.externalContactOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-3">
                <select value={typecontact} onChange={(e) => setTypecontact(e.target.value)} className={selectCls}>
                  {formOptions.externalTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-4 text-right">
                <button
                  type="button"
                  disabled={!formOptions.hasRealExternalContact || !contactid || !typecontact || typecontact === '0' || addContact.isPending}
                  onClick={() => addContact.mutate({ source: 'external', contactid, typecontact })}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {addContact.isError && (
        <p className="text-xs text-danger px-4 pb-3">{addContact.error instanceof Error ? addContact.error.message : 'Could not add this contact.'}</p>
      )}

      <div className="border-t border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Nature of Contact</th>
              <th className="font-medium py-2 px-3">Third-Party</th>
              <th className="font-medium py-2 px-3">Users/Contacts/Addresses</th>
              <th className="font-medium py-2 px-3">Contact Type</th>
              <th className="font-medium py-2 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-text-faint italic">
                  No contacts have been assigned to this order yet.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2 px-4 text-text!">{row.nature}</td>
                  <td className="py-2 px-3 text-text-muted">{row.thirdParty}</td>
                  <td className="py-2 px-3 text-text-muted">{row.contact}</td>
                  <td className="py-2 px-3 text-text-muted">{row.contactType}</td>
                  <td className="py-2 px-4 text-text-muted">{row.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// The interactive per-line "Qty To Dispatch" entry form above the real
// "Receipts for this order" table is its own large, stateful sub-workflow
// (per-line warehouse/lot/serial/eat-by/sell-by tracking) — not replicated
// natively; the Create Reception button on the main tab links straight to
// this same real page for that action instead.
function ReceiptsTab({ id }: { id: string }) {
  const { data, isLoading, isError } = usePurchaseOrderDispatch(id)
  if (isLoading) return <p className="p-4 text-sm text-text-muted">Loading item receipts…</p>
  if (isError || !data) return <p className="p-4 text-sm text-danger">Could not load item receipts.</p>

  return (
    <div className="flex flex-col gap-4">
      <Card className="!h-auto shrink-0">
        <table className="w-full">
          <tbody>
            <InfoRow label="Date" value={data.date} />
            {data.method && <InfoRow label="Method" value={data.method} />}
            <InfoRow label="Request author" value={data.requestAuthor} />
          </tbody>
        </table>
      </Card>

      <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Receipts for this order</h3>
          <Link to={ROUTES.purchaseOrderCreateReception.replace(':id', id)} className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            <PackageCheck size={14} /> Create reception
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Reception</th>
                <th className="font-medium px-4 py-2.5">Product</th>
                <th className="font-medium px-4 py-2.5">Creation Date</th>
                <th className="font-medium px-4 py-2.5">Planned Date Of Delivery</th>
                <th className="font-medium px-4 py-2.5 text-right">Qty Dispatched</th>
                <th className="font-medium px-4 py-2.5">Warehouse</th>
                <th className="font-medium px-4 py-2.5">Comment</th>
              </tr>
            </thead>
            <tbody>
              {data.receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-text-faint italic">
                    No receipts recorded for this order yet.
                  </td>
                </tr>
              ) : (
                data.receipts.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      {r.receptionUrl ? (
                        <a href={stripBackendPrefix(r.receptionUrl)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          {r.receptionRef}
                        </a>
                      ) : (
                        r.receptionRef
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text!">
                      {r.productRef}
                      {r.productLabel && ` - ${r.productLabel}`}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{r.creationDate}</td>
                    <td className="px-4 py-2.5 text-text-muted">{r.plannedDeliveryDate}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{r.qtyDispatched}</td>
                    <td className="px-4 py-2.5 text-text-muted">{r.warehouse}</td>
                    <td className="px-4 py-2.5 text-text-muted">{r.comment}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// Mirrors Sales Order Detail's own DocumentsTab (fourn/commande/document.php
// renders the exact same generic
// core/tpl/document_actions_post_headers.tpl.php template — see
// purchaseOrderDetail.queries.ts's header comment). Delete isn't exposed
// here (unlike Sales Orders' equivalent tab) — that fix relied on a
// Sales-Order-specific confirm-page quirk that hasn't been verified against
// this page yet; Preview (opening the file) still works.
function DocumentsTab({ id }: { id: string }) {
  const { data, isLoading, isError } = usePurchaseOrderDocuments(id)
  const uploadDoc = useUploadPurchaseOrderDocument(id)
  const linkDoc = useLinkPurchaseOrderDocument(id)

  const [file, setFile] = useState<File | null>(null)
  const [useMask, setUseMask] = useState(true)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  if (isLoading) return <p className="p-4 text-sm text-text-muted">Loading linked files…</p>
  if (isError || !data) return <p className="p-4 text-sm text-danger">Could not load linked files.</p>
  const { rows, meta } = data

  function handleUpload() {
    if (!file) return
    uploadDoc.mutate({ token: meta.attachToken, file, savingDocMask: meta.savingDocMask, useMask }, { onSuccess: () => setFile(null) })
  }
  function handleLink() {
    if (!linkUrl.trim()) return
    linkDoc.mutate(
      { token: meta.attachToken, link: linkUrl.trim(), label: linkLabel.trim() },
      { onSuccess: () => { setLinkUrl(''); setLinkLabel('') } },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="!h-auto shrink-0">
        <table className="w-full">
          <tbody>
            <InfoRow label="Number of attached files/documents" value={String(meta.attachedCount)} />
            <InfoRow label="Total size of attached files/documents" value={meta.totalSize} />
          </tbody>
        </table>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="!h-auto shrink-0">
          <h3 className="font-semibold text-text! mb-3">Attach a new file/document</h3>
          <div className="space-y-3">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-surface-hover file:text-text hover:file:bg-border"
            />
            {meta.savingDocMask && (
              <label className="flex items-start gap-2 text-xs text-text-faint">
                <input type="checkbox" checked={useMask} onChange={(e) => setUseMask(e.target.checked)} className="mt-0.5" />
                <span>
                  Save file on server with name "<b className="text-text-muted">{meta.savingDocMask}</b>" (otherwise original filename)
                </span>
              </label>
            )}
            <button
              type="button"
              disabled={!file || uploadDoc.isPending}
              onClick={handleUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {uploadDoc.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Upload size={13} />} Upload
            </button>
            {uploadDoc.isError && <p className="text-xs text-danger">Could not upload the file — please try again.</p>}
            {uploadDoc.isSuccess && <p className="text-xs text-success">File uploaded.</p>}
          </div>
        </Card>

        <Card className="!h-auto shrink-0">
          <h3 className="font-semibold text-text! mb-3">Link a new file/document</h3>
          <div className="space-y-3">
            <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="URL to link" className={selectCls} />
            <input type="text" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label" className={selectCls} />
            <button
              type="button"
              disabled={!linkUrl.trim() || linkDoc.isPending}
              onClick={handleLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {linkDoc.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Link2 size={13} />} Link
            </button>
            {linkDoc.isError && <p className="text-xs text-danger">Could not link the file — please try again.</p>}
            {linkDoc.isSuccess && <p className="text-xs text-success">Link added.</p>}
          </div>
        </Card>
      </div>

      <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Attached files and documents</h3>
        </div>
        <div className="p-4">
          {rows.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No documents uploaded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Documents</th>
                  <th className="font-medium py-2 pr-3">Size</th>
                  <th className="font-medium py-2">Date</th>
                  <th className="font-medium py-2 pl-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((doc) => (
                  <tr key={doc.url} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <a href={stripBackendPrefix(doc.url)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {doc.name}
                      </a>
                    </td>
                    <td className="py-2 pr-3 text-text-muted">{doc.size}</td>
                    <td className="py-2 text-text-muted">{doc.date}</td>
                    <td className="py-2 pl-3">
                      <div className="flex items-center justify-center gap-2">
                        <a href={stripBackendPrefix(doc.url)} target="_blank" rel="noreferrer" title="Preview" className="text-text-faint hover:text-text">
                          <Eye size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Linked files and documents</h3>
        </div>
        <div className="p-4">
          {meta.links.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No registered links.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Links</th>
                  <th className="font-medium py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {meta.links.map((link, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <a href={link.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {link.label}
                      </a>
                    </td>
                    <td className="py-2 text-text-muted">{link.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

function AgendaTab({ id, socid }: { id: string; socid?: number }) {
  const { data, isLoading, isError, refetch } = usePurchaseOrderInfo(id)
  const [showAddEvent, setShowAddEvent] = useState(false)
  if (isLoading) return <p className="p-4 text-sm text-text-muted">Loading events…</p>
  if (isError || !data) return <p className="p-4 text-sm text-danger">Could not load events.</p>

  return (
    <div className="flex flex-col gap-4">
      <Card className="!h-auto shrink-0">
        <table className="w-full">
          <tbody>
            <InfoRow label="Created By" value={data.createdBy} />
            <InfoRow label="Creation Date" value={data.creationDate} />
            <InfoRow label="Latest Modification Date" value={data.latestModificationDate} />
            {data.validatedBy && <InfoRow label="Validated By" value={data.validatedBy} />}
            {data.validationDate && <InfoRow label="Validation Date" value={data.validationDate} />}
            {data.approvedBy && <InfoRow label="Approved By" value={data.approvedBy} />}
            {data.approvingDate && <InfoRow label="Approving Date" value={data.approvingDate} />}
          </tbody>
        </table>
      </Card>

      <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Events on order</h3>
          <button type="button" onClick={() => setShowAddEvent(true)} className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            <CalendarPlus size={14} /> Create Event
          </button>
        </div>
        {showAddEvent && (
          <AddEventModal
            elementtype="order_supplier"
            fkElement={Number(id)}
            socid={socid}
            onClose={() => setShowAddEvent(false)}
            onCreated={() => {
              setShowAddEvent(false)
              refetch()
            }}
          />
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Ref</th>
                <th className="font-medium px-4 py-2.5">Date</th>
                <th className="font-medium px-4 py-2.5">Owner</th>
                <th className="font-medium px-4 py-2.5">Label</th>
                <th className="font-medium px-4 py-2.5">Related Objects</th>
                <th className="font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-text-faint italic">
                    No events recorded for this order yet.
                  </td>
                </tr>
              ) : (
                data.events.map((e, i) => (
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
                    <td className="px-4 py-2.5 text-text-muted">{e.owner}</td>
                    <td className="px-4 py-2.5 text-text!">{e.label}</td>
                    <td className="px-4 py-2.5">
                      {e.relatedObjectUrl ? (
                        <a href={stripBackendPrefix(e.relatedObjectUrl)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          {e.relatedObjectRef}
                        </a>
                      ) : (
                        e.relatedObjectRef
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{e.statusLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('order')
  const { data, isLoading, isError } = usePurchaseOrderCard(id)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted p-6">
        <LoaderCircle size={16} className="animate-spin" /> Loading purchase order…
      </div>
    )
  }
  if (isError || !data) {
    return <p className="p-6 text-sm text-danger">Could not load this purchase order.</p>
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <Card className="!h-auto shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
              <FileSignature size={20} className="text-brand" /> {data.ref}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Ref. vendor: {data.refSupplier || '—'} · Third-party:{' '}
              {data.socid ? (
                <Link to={`${ROUTES.customerDetail.replace(':id', String(data.socid))}?tab=vendor`} className="text-brand hover:underline">
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
            <Link to={ROUTES.purchaseOrderList} className="p-2 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
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

      {tab === 'order' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="!h-auto shrink-0">
              <table className="w-full">
                <tbody>
                  <InfoRow label="Date" value={data.date} />
                  {data.method && <InfoRow label="Method" value={data.method} />}
                  <InfoRow label="Request author" value={data.requestAuthor} />
                  <InfoRow label="Discounts" value={data.discountsText} />
                  <InfoRow label="Payment Terms" value={data.paymentTermsLabel} />
                  <InfoRow label="Payment Type" value={data.paymentTypeLabel} />
                  <InfoRow label="Currency" value={data.currencyLabel} />
                  <InfoRow label="Planned date of delivery" value={data.deliveryDate} />
                  <InfoRow label="No. of Days To Delivery" value={data.noDaysToDelivery} />
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
                    <th className="font-medium px-4 py-2.5">Supplier Ref</th>
                    <th className="font-medium px-4 py-2.5">VAT</th>
                    <th className="font-medium px-4 py-2.5 text-right">Unit Price (Excl.)</th>
                    <th className="font-medium px-4 py-2.5 text-right">Unit Price (Inc. Tax)</th>
                    <th className="font-medium px-4 py-2.5 text-center">Qty</th>
                    <th className="font-medium px-4 py-2.5 text-center">Disc.</th>
                    <th className="font-medium px-4 py-2.5 text-right">Total (Incl.)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-text-faint italic">
                        No lines on this order.
                      </td>
                    </tr>
                  ) : (
                    data.lines.map((l) => (
                      <tr key={l.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-text!">{l.productLabel || l.description}</td>
                        <td className="px-4 py-2.5 text-text-muted">{l.supplierRef || '—'}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">
                          {l.vatRate}%{l.vatCode ? `(${l.vatCode})` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(l.unitPriceExcl)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(l.unitPriceExcl * (1 + l.vatRate / 100))}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">{formatNumber(l.qty)}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">{l.discountPercent || 0}%</td>
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
        </>
      )}

      {tab === 'contacts' && <ContactsTab id={id!} />}
      {tab === 'receipts' && <ReceiptsTab id={id!} />}
      {tab === 'files' && <DocumentsTab id={id!} />}
      {tab === 'agenda' && <AgendaTab id={id!} socid={data.socid ?? undefined} />}

      {tab === 'notes' && <StubTab id={id!} label="Notes" page={STUB_PAGES.notes} />}
    </div>
  )
}
