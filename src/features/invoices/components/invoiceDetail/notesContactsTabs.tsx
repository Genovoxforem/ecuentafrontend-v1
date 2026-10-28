import { useState } from 'react'
import { Users2, RefreshCcw, Pencil, Trash2 } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useInvoiceNotes, useUpdateInvoiceNote, useInvoiceContacts, useAddInvoiceContact, useChangeInvoiceContact, useInvoiceStandingOrders } from '../../invoiceDetail.queries'
import { EmptyState, TabTitle } from './InvoiceDetailShared'

export function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceNotes(id)
  const [editingField, setEditingField] = useState<'public' | 'private' | null>(null)
  const [value, setValue] = useState('')
  const updateNote = useUpdateInvoiceNote(id)

  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function startEdit(field: 'public' | 'private') {
    setEditingField(field)
    setValue(field === 'public' ? data!.rawPublic : data!.rawPrivate)
  }

  // notes.php saves both notes at once: the other one goes back unchanged.
  function submit() {
    if (!editingField || !data) return
    const next = editingField === 'public' ? { notePublic: value, notePrivate: data.rawPrivate } : { notePublic: data.rawPublic, notePrivate: value }
    updateNote.mutate(next, { onSuccess: () => setEditingField(null) })
  }

  function NoteCard({ field, label, hint, content }: { field: 'public' | 'private'; label: string; hint: string; content: string }) {
    const editing = editingField === field
    return (
      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-text!">{label}</p>
            <p className="text-xs text-text-faint">{hint}</p>
          </div>
          {!editing && (
            <button type="button" onClick={() => startEdit(field)} className="shrink-0 w-7 h-7 rounded-md bg-brand text-white flex items-center justify-center hover:bg-brand-hover">
              <Pencil size={12} />
            </button>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={4}
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2"
            />
            {updateNote.isError && <p className="text-xs text-danger">{updateNote.error instanceof Error ? updateNote.error.message : 'Failed to save.'}</p>}
            <div className="flex gap-2">
              <button type="button" disabled={updateNote.isPending} onClick={submit} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60">
                {updateNote.isPending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditingField(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text! whitespace-pre-wrap">{content || <span className="text-text-faint italic">Empty.</span>}</p>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <TabTitle>Notes</TabTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NoteCard field="public" label="Public Note" hint="Visible to customer on printed documents" content={data.notePublic} />
        <NoteCard field="private" label="Private Note" hint="Internal use only — not visible on documents" content={data.notePrivate} />
      </div>
    </div>
  )
}

// Real Add-Contact form (Users + Third-Party Contacts rows) — same generic
// Dolibarr contacts.tpl.php mechanism Sales Orders' own ContactsTab already
// uses (see OrderDetailTabs.tsx), just pointed at this invoice's own
// contact.php.
export function ContactsTab({ id }: { id: string | undefined }) {
  const [company, setCompany] = useState<string | undefined>(undefined)
  const { data, isLoading, isError, error, refetch } = useInvoiceContacts(id, company)
  const addContact = useAddInvoiceContact(id)
  const changeContact = useChangeInvoiceContact(id)

  const [userid, setUserid] = useState('')
  const [type, setType] = useState('')
  const [contactid, setContactid] = useState('')
  const [typecontact, setTypecontact] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading contacts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contacts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  const { rows, formOptions } = data
  const effectiveCompany = company ?? formOptions.selectedCompanyId
  const selectCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'

  return (
    <div className="space-y-3">
      <TabTitle count={rows.length}>Contacts/Addresses</TabTitle>
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 px-4">Nature of Contact</th>
                <th className="font-medium py-2 px-3">Third-Party</th>
                <th className="font-medium py-2 px-3">Users/Contacts</th>
                <th className="font-medium py-2 px-3">Type</th>
                <th className="font-medium py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 px-4 text-text! whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Users2 size={13} className="text-text-faint" /> Users
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
                    <Users2 size={13} className="text-text-faint" /> Third-Party Contacts
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
                <th className="font-medium py-2 px-4">Nature</th>
                <th className="font-medium py-2 px-3">Third Party</th>
                <th className="font-medium py-2 px-3">Contact</th>
                <th className="font-medium py-2 px-3">Type</th>
                <th className="font-medium py-2 px-4">Status</th>
                <th className="py-2 px-4" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-text-faint italic">
                    No contacts linked to this invoice yet.
                  </td>
                </tr>
              ) : (
                rows.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 px-4 font-medium text-text!">{c.nature}</td>
                    <td className="py-2 px-3 text-text-muted">{c.thirdParty}</td>
                    <td className="py-2 px-3 text-text-muted">{c.contact}</td>
                    <td className="py-2 px-3 text-text-muted">{c.contactType}</td>
                    <td className="py-2 px-3 text-text-muted">
                      {c.rowid != null ? (
                        <button type="button" disabled={changeContact.isPending} title="Activate / deactivate" onClick={() => changeContact.mutate({ action: 'swap', rowid: c.rowid! })} className="hover:underline disabled:opacity-50">
                          {c.status}
                        </button>
                      ) : (
                        c.status
                      )}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {c.rowid != null && (
                        <button type="button" disabled={changeContact.isPending} title="Remove this contact" onClick={() => changeContact.mutate({ action: 'delete', rowid: c.rowid! })} className="text-text-faint hover:text-danger disabled:opacity-50">
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

export function StandingOrdersTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useInvoiceStandingOrders(id)
  if (isLoading) return <LegacyLoadingCard label="Loading direct debit orders…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load direct debit orders" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle count={data.length}>Direct Debit Orders</TabTitle>
      <Card className="!h-auto">
        {data.length === 0 ? (
          <EmptyState icon={RefreshCcw} message="No direct debit orders found for this invoice." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2.5">Request Date</th>
                <th className="font-medium px-4 py-2.5">User</th>
                <th className="font-medium px-4 py-2.5">Amount</th>
                <th className="font-medium px-4 py-2.5">Direct Debit Order</th>
                <th className="font-medium px-4 py-2.5">Process Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-text-muted">{o.requestDate}</td>
                  <td className="px-4 py-2.5 text-text-muted">{o.user}</td>
                  <td className="px-4 py-2.5 text-text-muted">{o.amount}</td>
                  <td className="px-4 py-2.5 font-medium text-text!">{o.ref}</td>
                  <td className="px-4 py-2.5 text-text-muted">{o.processDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
