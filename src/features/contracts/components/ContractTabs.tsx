import { useState } from 'react'
import { CalendarPlus, Eye, Link2, LoaderCircle, Trash2, Upload, Users } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyObjectLink } from '../../../shared/components/LegacyObjectLink'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { AddEventModal } from '../../agenda/components/AddEventModal'
import { useContractLines } from '../contractDetail.queries'
import {
  useChangeContractContact,
  useChangeContractFollowup,
  useContractAgenda,
  useContractContacts,
  useContractDocumentActions,
  useContractDocuments,
  useContractFollowup,
  useRecordNotes,
  useSaveRecordNotes,
} from '../contractTabs.queries'

const fieldCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5'
const primaryBtn = 'px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-50'
const th = 'font-medium py-2 px-3 text-left text-xs text-text-faint uppercase tracking-wide'

function TabTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-semibold text-brand">
      <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
      {children}
    </h3>
  )
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1.5 pr-4 text-xs text-text-faint whitespace-nowrap">{label}</td>
      <td className="py-1.5 text-sm text-text!">{value || '—'}</td>
    </tr>
  )
}

export function ContractContactsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useContractContacts(id)
  const change = useChangeContractContact(id)
  const [userid, setUserid] = useState('')
  const [userType, setUserType] = useState('')
  const [contactid, setContactid] = useState('')
  const [contactType, setContactType] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading contacts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contacts" message={errorText(error, 'Unknown error.')} onRetry={() => refetch()} />

  const { options, rows, can_edit: canEdit } = data
  const all = [...rows.internal, ...rows.external]
  const busy = change.isPending

  return (
    <div className="space-y-3">
      <TabTitle>Contacts/Addresses</TabTitle>
      {canEdit && (
        <Card className="!h-auto !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 px-4 whitespace-nowrap text-text!"><span className="flex items-center gap-1.5"><Users size={13} className="text-text-faint" /> Users</span></td>
                <td className="py-2 px-3 text-text-muted">{options.issuer_company || '—'}</td>
                <td className="py-2 px-3">
                  <select value={userid} onChange={(e) => setUserid(e.target.value)} className={fieldCls}>
                    <option value="" />
                    {options.users.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="py-2 px-3">
                  <select value={userType} onChange={(e) => setUserType(e.target.value)} className={fieldCls}>
                    <option value="" />
                    {options.internal_types.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="py-2 px-4 text-right">
                  <button type="button" disabled={!userid || !userType || busy} className={primaryBtn}
                    onClick={() => change.mutate({ action: 'add', source: 'internal', fk_user: Number(userid), type_contact: userType }, { onSuccess: () => { setUserid(''); setUserType('') } })}>
                    Add
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 whitespace-nowrap text-text!"><span className="flex items-center gap-1.5"><Users size={13} className="text-text-faint" /> Third-Party Contacts</span></td>
                <td className="py-2 px-3 text-text-muted">{options.companies.find((c) => String(c.value) === String(options.selected_company))?.label ?? '—'}</td>
                <td className="py-2 px-3">
                  <select value={contactid} onChange={(e) => setContactid(e.target.value)} disabled={!options.company_contacts.length} className={`${fieldCls} disabled:opacity-50`}>
                    <option value="" />
                    {options.company_contacts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="py-2 px-3">
                  <select value={contactType} onChange={(e) => setContactType(e.target.value)} className={fieldCls}>
                    <option value="" />
                    {options.external_types.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="py-2 px-4 text-right">
                  <button type="button" disabled={!contactid || !contactType || busy} className={primaryBtn}
                    onClick={() => change.mutate({ action: 'add', source: 'external', fk_socpeople: Number(contactid), type_contact: contactType }, { onSuccess: () => { setContactid(''); setContactType('') } })}>
                    Add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}
      {change.isError && <p role="alert" className="text-xs text-danger">{errorText(change.error, 'Could not update the contacts.')}</p>}
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Nature Of Contact</th>
                <th className={th}>Third-Party</th>
                <th className={th}>Users/Contacts/Addresses</th>
                <th className={th}>Contact Type</th>
                <th className={th}>Status</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {all.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-text-faint italic">No contacts have been assigned to this contract yet.</td></tr>
              ) : (
                all.map((row) => (
                  <tr key={`${row.nature_label}-${row.rowid}`} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text!">{row.nature_label}</td>
                    <td className="px-3 py-2 text-text-muted">{row.thirdparty}</td>
                    <td className="px-3 py-2 text-text-muted">{row.name}{row.phone ? <span className="block text-xs text-text-faint">{row.phone}</span> : null}</td>
                    <td className="px-3 py-2 text-text-muted">{row.type_label}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {canEdit ? (
                        <button type="button" disabled={busy} title="Activate / deactivate" onClick={() => change.mutate({ action: 'swap', rowid: row.rowid })} className="hover:underline">{row.status_label}</button>
                      ) : row.status_label}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canEdit && (
                        <button type="button" disabled={busy} title="Remove contact" onClick={() => change.mutate({ action: 'delete', rowid: row.rowid })} className="text-text-faint hover:text-danger disabled:opacity-50">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
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

// `base` selects the module (default: contracts; '/contact/fapi' serves the contact tabs).
export function ContractDocumentsTab({ id, base }: { id: string | undefined; base?: string }) {
  const { data, isLoading, isError, error, refetch } = useContractDocuments(id, base)
  const actions = useContractDocumentActions(id, base)
  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading linked files…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load linked files" message={errorText(error, 'Unknown error.')} onRetry={() => refetch()} />
  const { files, links, can_edit: canEdit } = data
  const totalKb = (files.reduce((sum, f) => sum + f.size_raw, 0) / 1024).toFixed(1)

  return (
    <div className="space-y-3">
      <TabTitle>Linked Files</TabTitle>
      <Card className="!h-auto">
        <table><tbody>
          <InfoRow label="Number of attached files/documents" value={String(files.length)} />
          <InfoRow label="Total size of attached files/documents" value={`${totalKb} Kb`} />
        </tbody></table>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="!h-auto">
          <p className="text-sm font-semibold text-text! mb-2">Attach a new file/document</p>
          <div className="space-y-2">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-surface-hover file:text-text" />
            <button type="button" disabled={!canEdit || !file || actions.upload.isPending} className={`${primaryBtn} flex items-center gap-1.5`}
              onClick={() => file && actions.upload.mutate(file, { onSuccess: () => setFile(null) })}>
              {actions.upload.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Upload size={13} />} Upload
            </button>
            {actions.upload.isError && <p role="alert" className="text-xs text-danger">{errorText(actions.upload.error, 'Could not upload the file.')}</p>}
          </div>
        </Card>
        <Card className="!h-auto">
          <p className="text-sm font-semibold text-text! mb-2">Link a new file/document</p>
          <div className="space-y-2">
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="URL to link" className={fieldCls} />
            <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label" className={fieldCls} />
            <button type="button" disabled={!canEdit || !linkUrl.trim() || actions.link.isPending} className={`${primaryBtn} flex items-center gap-1.5`}
              onClick={() => actions.link.mutate({ link: linkUrl.trim(), label: linkLabel.trim() }, { onSuccess: () => { setLinkUrl(''); setLinkLabel('') } })}>
              {actions.link.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Link2 size={13} />} Link
            </button>
            {actions.link.isError && <p role="alert" className="text-xs text-danger">{errorText(actions.link.error, 'Could not link the file.')}</p>}
          </div>
        </Card>
      </div>
      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2">Attached files and documents</p>
        {files.length === 0 ? <p className="text-sm text-text-faint italic text-center py-4">No Documents Uploaded</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className={th}>Documents</th><th className={th}>Size</th><th className={th}>Date</th><th className={th} /></tr></thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.url || f.name} className="border-b border-border last:border-0">
                  <td className="px-3 py-2"><a href={f.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">{f.name}</a></td>
                  <td className="px-3 py-2 text-text-muted">{f.size}</td>
                  <td className="px-3 py-2 text-text-muted">{f.date}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center justify-end gap-3">
                      <a href={f.url} target="_blank" rel="noreferrer" title="Preview" className="text-text-faint hover:text-text"><Eye size={14} /></a>
                      {canEdit && <button type="button" title="Delete" disabled={actions.removeFile.isPending} onClick={() => window.confirm(`Delete ${f.name}?`) && actions.removeFile.mutate(f.name)} className="text-text-faint hover:text-danger"><Trash2 size={14} /></button>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {actions.removeFile.isError && <p role="alert" className="text-xs text-danger mt-2">{errorText(actions.removeFile.error, 'Could not delete the file.')}</p>}
      </Card>
      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2">Linked files and documents</p>
        {links.length === 0 ? <p className="text-sm text-text-faint italic text-center py-4">No Registered Links</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className={th}>Links</th><th className={th}>Date</th><th className={th} /></tr></thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2"><a href={l.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">{l.label || l.url}</a></td>
                  <td className="px-3 py-2 text-text-muted">{l.date}</td>
                  <td className="px-3 py-2 text-right">
                    {canEdit && <button type="button" title="Remove link" disabled={actions.removeLink.isPending} onClick={() => actions.removeLink.mutate(l.id)} className="text-text-faint hover:text-danger"><Trash2 size={14} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {actions.removeLink.isError && <p role="alert" className="text-xs text-danger mt-2">{errorText(actions.removeLink.error, 'Could not remove the link.')}</p>}
      </Card>
    </div>
  )
}

// `eventElement` is the agenda element type events are raised on; leave it out to hide Create Event.
export function ContractAgendaTab({ id, socid, base, eventElement = 'contrat', subject = 'contract' }: { id: string | undefined; socid?: number; base?: string; eventElement?: string; subject?: string }) {
  const { data, isLoading, isError, error, refetch } = useContractAgenda(id, base)
  const [showAdd, setShowAdd] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading events…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load events" message={errorText(error, 'Unknown error.')} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>Events/Agenda</TabTitle>
      <Card className="!h-auto">
        <table><tbody>
          <InfoRow label="Created By" value={data.created_by} />
          <InfoRow label="Creation Date" value={data.creation_date} />
          <InfoRow label="Latest Modification Date" value={data.latest_modification_date} />
        </tbody></table>
      </Card>
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Events on {subject}</h3>
          {eventElement && <button type="button" onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"><CalendarPlus size={14} /> Create Event</button>}
        </div>
        {showAdd && eventElement && (
          <AddEventModal elementtype={eventElement} fkElement={Number(id)} socid={socid} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); refetch() }} />
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className={th}>Ref</th><th className={th}>Date</th><th className={th}>Owner</th><th className={th}>Label</th><th className={th}>Related Objects</th><th className={th}>Status</th></tr></thead>
            <tbody>
              {data.events.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-text-faint italic">No events recorded for this {subject} yet.</td></tr>
              ) : (
                data.events.map((e, i) => (
                  <tr key={`${e.ref}-${i}`} className="border-b border-border last:border-0">
                    <td className="px-3 py-2"><LegacyObjectLink url={e.url}>{e.ref}</LegacyObjectLink></td>
                    <td className="px-3 py-2 text-text-muted">{e.date}</td>
                    <td className="px-3 py-2 text-text-muted">{e.owner}</td>
                    <td className="px-3 py-2 text-text!">{e.label}</td>
                    <td className="px-3 py-2"><LegacyObjectLink url={e.related_object_url}>{e.related_object_ref}</LegacyObjectLink></td>
                    <td className="px-3 py-2 text-text-muted">{e.status_label}</td>
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

const humanize = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const scalar = (v: unknown): v is string | number | boolean => ['string', 'number', 'boolean'].includes(typeof v)

// contrat/fapi/followup.php. The reference publishes the write payloads (plan, set_status,
// reschedule, delete) but not the GET response, so the schedule is rendered from whichever list
// the answer carries, and a row gets its actions only when it carries an id (followup_id, or id).
// The plan form sends the month as YYYY-MM. Written from the documented payloads; not yet run
// against a contract that has a schedule.
export function ContractFollowUpTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useContractFollowup(id)
  const change = useChangeContractFollowup(id)
  const lines = useContractLines(id)
  const [lineId, setLineId] = useState('')
  const [month, setMonth] = useState('')
  const [editing, setEditing] = useState<{ rowId: number; field: 'date' | 'status'; value: string } | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading follow-up…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load follow-up" message={errorText(error, 'Unknown error.')} onRetry={() => refetch()} />

  const list = Object.values(data).find((v): v is Record<string, unknown>[] => Array.isArray(v) && v.every((x) => x && typeof x === 'object')) ?? []
  const columns = Array.from(new Set(list.flatMap((row) => Object.keys(row).filter((k) => scalar(row[k]))))).filter((k) => k !== 'id' && !k.endsWith('_id')).slice(0, 8)
  const rowIdOf = (row: Record<string, unknown>) => Number(row.followup_id ?? row.id ?? 0)
  const busy = change.isPending

  function submitEdit() {
    if (!editing) return
    const payload = editing.field === 'date'
      ? ({ action: 'reschedule', followup_id: editing.rowId, reschedule_date: editing.value } as const)
      : ({ action: 'set_status', followup_id: editing.rowId, comments_status: editing.value } as const)
    change.mutate(payload, { onSuccess: () => setEditing(null) })
  }

  return (
    <div className="space-y-3">
      <TabTitle>Follow Up</TabTitle>
      <Card className="!h-auto">
        <p className="text-sm font-semibold text-text! mb-2">Plan a follow-up</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-text-faint min-w-[200px]">
            Service line
            <select value={lineId} onChange={(e) => setLineId(e.target.value)} className={fieldCls}>
              <option value="" />
              {(lines.data?.lines ?? []).map((l) => (
                <option key={l.rowid} value={l.rowid}>{l.product_label || l.description || `Line ${l.rowid}`}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-faint">
            Month
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={fieldCls} />
          </label>
          <button type="button" disabled={!lineId || !month || busy} className={primaryBtn}
            onClick={() => change.mutate({ action: 'plan', contratdet_id: Number(lineId), plan_month: month }, { onSuccess: () => { setLineId(''); setMonth('') } })}>
            Plan
          </button>
        </div>
      </Card>
      {change.isError && <p role="alert" className="text-xs text-danger">{errorText(change.error, 'Could not update the follow-up.')}</p>}
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">{columns.map((c) => <th key={c} className={th}>{humanize(c)}</th>)}<th className={th} /></tr></thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="px-4 py-6 text-center text-text-faint italic">No follow-up has been scheduled for this contract.</td></tr>
              ) : (
                list.map((row, i) => {
                  const rowId = rowIdOf(row)
                  const active = editing?.rowId === rowId
                  return (
                    <tr key={i} className="border-b border-border last:border-0">
                      {columns.map((c) => <td key={c} className="px-3 py-2 text-text-muted">{scalar(row[c]) ? String(row[c]) : '—'}</td>)}
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {rowId > 0 && (active ? (
                          <span className="inline-flex items-center gap-1.5">
                            <input type={editing.field === 'date' ? 'date' : 'text'} value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} className={`${fieldCls} w-36`} />
                            <button type="button" disabled={!editing.value || busy} onClick={submitEdit} className={primaryBtn}>Save</button>
                            <button type="button" onClick={() => setEditing(null)} className="text-xs text-text-muted hover:underline">Cancel</button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-3 text-xs">
                            <button type="button" disabled={busy} onClick={() => setEditing({ rowId, field: 'date', value: '' })} className="text-brand hover:underline">Reschedule</button>
                            <button type="button" disabled={busy} onClick={() => setEditing({ rowId, field: 'status', value: '' })} className="text-brand hover:underline">Status</button>
                            <button type="button" disabled={busy} title="Delete" onClick={() => window.confirm('Delete this follow-up?') && change.mutate({ action: 'delete', followup_id: rowId })} className="text-text-faint hover:text-danger"><Trash2 size={14} /></button>
                          </span>
                        ))}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// Public / private notes through a module's own notes.php (contact/fapi/notes.php).
export function RecordNotesTab({ id, base }: { id: string | undefined; base: string }) {
  const { data, isLoading, isError, error, refetch } = useRecordNotes(base, id)
  const save = useSaveRecordNotes(base, id)
  const [draft, setDraft] = useState<{ pub: string; priv: string } | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={errorText(error, 'Unknown error.')} onRetry={() => refetch()} />

  const pub = draft?.pub ?? data.note_public
  const priv = draft?.priv ?? data.note_private
  const dirty = draft !== null && (pub !== data.note_public || priv !== data.note_private)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Note</TabTitle>
        <button
          type="button"
          disabled={!data.can_edit || !dirty || save.isPending}
          onClick={() => save.mutate({ note_public: pub, note_private: priv }, { onSuccess: () => setDraft(null) })}
          className={`${primaryBtn} flex items-center gap-1.5`}
        >
          {save.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
        </button>
      </div>
      {save.isError && <p role="alert" className="text-sm text-danger">{errorText(save.error, 'Could not save the notes.')}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="!h-auto">
          <p className="text-sm font-semibold text-text!">Note (public)</p>
          <textarea value={pub} readOnly={!data.can_edit} onChange={(e) => setDraft({ pub: e.target.value, priv })} rows={5} className={`${fieldCls} mt-2 px-3 py-2`} />
        </Card>
        <Card className="!h-auto">
          <p className="text-sm font-semibold text-text!">Note (private)</p>
          <textarea value={priv} readOnly={!data.can_edit} onChange={(e) => setDraft({ pub, priv: e.target.value })} rows={5} className={`${fieldCls} mt-2 px-3 py-2`} />
        </Card>
      </div>
    </div>
  )
}
