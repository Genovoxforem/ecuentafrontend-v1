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

// Mirrors Purchase Order Detail's own ContactsTab (comm/propal/contact.php
// renders the exact same generic core/tpl/contacts.tpl.php template — see
// quotationDetail.queries.ts's header comment) — same 2 add-rows (Users /
// Third-Party Contacts) plus the assigned-contacts table.
function ContactsTab({ id }: { id: string }) {
  const [company, setCompany] = useState<string | undefined>(undefined)
  const { data, isLoading, isError } = useQuotationContacts(id, company)
  const addContact = useAddQuotationContact(id)

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
                  No contacts have been assigned to this quotation yet.
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

// core/tpl/notes.tpl.php — two independent editable fields, each saved with
// its own real POST (core/actions_setnotes.inc.php). Saving the public note
// on this deployment shares the same auto-PDF-regeneration call that's
// already confirmed to crash for quotations (see this session's Create
// Quotation live-test finding) — that's a real backend bug, not something
// wrong with this form; the private note isn't affected.
function NotesTab({ id }: { id: string }) {
  const { data, isLoading, isError } = useQuotationNotes(id)
  const setNote = useSetQuotationNote(id)
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  const [publicDirty, setPublicDirty] = useState(false)
  const [privateDirty, setPrivateDirty] = useState(false)

  if (isLoading) return <p className="p-4 text-sm text-text-muted">Loading notes…</p>
  if (isError || !data) return <p className="p-4 text-sm text-danger">Could not load notes.</p>

  const publicValue = publicDirty ? notePublic : data.notePublic
  const privateValue = privateDirty ? notePrivate : data.notePrivate

  return (
    <Card className="!h-auto shrink-0">
      <h3 className="font-semibold text-text! mb-3">Notes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <span className="text-sm text-text">Note (public)</span>
          <textarea
            value={publicValue}
            onChange={(e) => {
              setNotePublic(e.target.value)
              setPublicDirty(true)
            }}
            rows={4}
            className={inputClasses}
          />
          <button
            type="button"
            disabled={setNote.isPending}
            onClick={() => setNote.mutate({ field: 'note_public', value: publicValue }, { onSuccess: () => setPublicDirty(false) })}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            {setNote.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
        </div>
        <div className="space-y-2">
          <span className="text-sm text-text">Note (private)</span>
          <textarea
            value={privateValue}
            onChange={(e) => {
              setNotePrivate(e.target.value)
              setPrivateDirty(true)
            }}
            rows={4}
            className={inputClasses}
          />
          <button
            type="button"
            disabled={setNote.isPending}
            onClick={() => setNote.mutate({ field: 'note_private', value: privateValue }, { onSuccess: () => setPrivateDirty(false) })}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            {setNote.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
        </div>
      </div>
      {setNote.isError && <p className="text-xs text-danger mt-3">{setNote.error instanceof Error ? setNote.error.message : 'Could not save this note.'}</p>}
    </Card>
  )
}

// Mirrors Purchase Order Detail's own DocumentsTab (comm/propal/document.php
// renders the exact same generic
// core/tpl/document_actions_post_headers.tpl.php template — see
// quotationDetail.queries.ts's header comment). Delete isn't exposed here —
// same reasoning as Purchase Orders' equivalent tab.
function DocumentsTab({ id }: { id: string }) {
  const { data, isLoading, isError } = useQuotationDocuments(id)
  const uploadDoc = useUploadQuotationDocument(id)
  const linkDoc = useLinkQuotationDocument(id)

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

// custom/consumption/card.php's real "Declare" form (action=conso) — read
// directly from that PHP source. The real page's own "List Of Consumption"
// table below this form is a full stock-movement ledger (its own
// custom/consumption module, unrelated to the quotation itself beyond the
// origin filter) — not scraped here; "View full history" opens the real
// page instead of reproducing that ledger.
function ConsumptionsTab({ id }: { id: string }) {
  const declare = useDeclareConsumption(id)
  const warehouses = useWarehouses()
  const { data: products } = useProductOptions()
  const productOptions = (products ?? []).map((p) => ({ value: p.id, label: `${p.ref} - ${p.label}` }))

  const [warehouseId, setWarehouseId] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('')
  const [lotSerial, setLotSerial] = useState('')
  const [label, setLabel] = useState(`Consumption for the proposal (${id})`)
  const [eatBy, setEatBy] = useState('')
  const [sellBy, setSellBy] = useState('')

  function handleDeclare() {
    if (!warehouseId || !productId || !qty || !lotSerial) return
    declare.mutate(
      { productId, warehouseId, qty: Number(qty), label, lotSerial, eatBy, sellBy },
      {
        onSuccess: () => {
          setQty('')
          setLotSerial('')
        },
      },
    )
  }

  return (
    <Card className="!h-auto shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">Consumptions</h3>
        <Link to={ROUTES.quotationConsumptionHistory.replace(':id', id)} className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          View full history
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
        <div>
          <span className="text-sm text-text">
            Warehouse<span className="text-danger">*</span>
          </span>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={`${inputClasses} mt-1`}>
            <option value="">Select a warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.ref}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-sm text-text">
            Product<span className="text-danger">*</span>
          </span>
          <div className="mt-1">
            <SearchableSelect value={productId} onChange={setProductId} options={productOptions} placeholder="Select Predefined Product/services" />
          </div>
        </div>
        <div>
          <span className="text-sm text-text">
            Number of units<span className="text-danger">*</span>
          </span>
          <input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputClasses} mt-1`} title="Negative reduces stock, positive corrects/increases it" />
        </div>
        <div>
          <span className="text-sm text-text">
            Lot/Serial number<span className="text-danger">*</span>
          </span>
          <input type="text" value={lotSerial} onChange={(e) => setLotSerial(e.target.value)} className={`${inputClasses} mt-1`} />
        </div>
        <div>
          <span className="text-sm text-text">Label of movement</span>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={`${inputClasses} mt-1`} />
        </div>
        <div>
          <span className="text-sm text-text">Eat-by date</span>
          <input type="date" value={eatBy} onChange={(e) => setEatBy(e.target.value)} className={`${inputClasses} mt-1`} />
        </div>
        <div>
          <span className="text-sm text-text">Sell-by date</span>
          <input type="date" value={sellBy} onChange={(e) => setSellBy(e.target.value)} className={`${inputClasses} mt-1`} />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          disabled={!warehouseId || !productId || !qty || !lotSerial || declare.isPending}
          onClick={handleDeclare}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {declare.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null} Declare
        </button>
      </div>
      {declare.isError && <p className="text-xs text-danger mt-2">{declare.error instanceof Error ? declare.error.message : 'Could not declare this consumption.'}</p>}
      {declare.isSuccess && <p className="text-xs text-success mt-2">Consumption declared.</p>}
    </Card>
  )
}

function AgendaTab({ id, socid }: { id: string; socid?: number }) {
  const { data, isLoading, isError, refetch } = useQuotationAgenda(id)
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
            {data.closingDate && <InfoRow label="Closing Date" value={data.closingDate} />}
          </tbody>
        </table>
      </Card>

      <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Events on proposal</h3>
          <button type="button" onClick={() => setShowAddEvent(true)} className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            <CalendarPlus size={14} /> Create Event
          </button>
        </div>
        {showAddEvent && (
          <AddEventModal
            elementtype="propal"
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
                    No events recorded for this quotation yet.
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

      {tab === 'contacts' && <ContactsTab id={id!} />}
      {tab === 'consumptions' && <ConsumptionsTab id={id!} />}
      {tab === 'notes' && <NotesTab id={id!} />}
      {tab === 'files' && <DocumentsTab id={id!} />}
      {tab === 'agenda' && <AgendaTab id={id!} socid={data.socid ?? undefined} />}
    </div>
  )
}
