import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AddEventModal } from '../../agenda/components/AddEventModal'
import {
  Users,
  LoaderCircle,
  Save,
  Link2,
  Upload,
  Eye,
  CalendarPlus,
} from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { useWarehouses } from '../../warehouses/warehouseExtras.queries'
import { useProductOptions } from '../../products/products.queries'
import {
  useQuotationContacts,
  useAddQuotationContact,
  useQuotationNotes,
  useSetQuotationNote,
  useQuotationDocuments,
  useUploadQuotationDocument,
  useLinkQuotationDocument,
  useDeclareConsumption,
  useQuotationAgenda,
} from '../quotationDetail.queries'
import { selectCls, InfoRow, type TabKey } from './QuotationDetailShared'

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

export type LazyTabRendererProps = {
  tab: TabKey
  id: string
  socid?: number
}

export function LazyTabRenderer({ tab, id, socid }: LazyTabRendererProps) {
  switch (tab) {
    case 'contacts':
      return <ContactsTab id={id} />
    case 'consumptions':
      return <ConsumptionsTab id={id} />
    case 'notes':
      return <NotesTab id={id} />
    case 'files':
      return <DocumentsTab id={id} />
    case 'agenda':
      return <AgendaTab id={id} socid={socid} />
    default:
      return null
  }
}
