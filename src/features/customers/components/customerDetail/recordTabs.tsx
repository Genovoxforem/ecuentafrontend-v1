import { useState } from 'react'
import { AddContactModal } from '../AddContactModal'
import { Check, Plus, Mail, Phone, Upload } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useSaveCustomerNotes, useUploadCustomerDocument, useAddCustomerNotification, type CustomerProfile } from '../../customerDetail.queries'
import { useCustomerContacts, useCustomerPricingGroups, useCustomerDocuments, useCustomerNotifications, stripBackendPrefix } from '../../customerDetailTabs.queries'
import { TabTitle } from './CustomerDetailShared'

// societe/api/notes.php — real, editable Public/Private notes (confirmed by
// reading that file directly: Societe::update_note() under the hood, real
// Dolibarr CSRF token required). Replaces the earlier read-only version,
// which only displayed CustomerProfile.notePublic/notePrivate.
export function NotesTab({ data, socid }: { data: CustomerProfile; socid: string | undefined }) {
  const [notePublic, setNotePublic] = useState(data.notePublic ?? '')
  const [notePrivate, setNotePrivate] = useState(data.notePrivate ?? '')
  const [saved, setSaved] = useState(false)
  const saveNotes = useSaveCustomerNotes(socid)

  return (
    <div className="space-y-3">
      <TabTitle>Notes</TabTitle>
      <Card className="!h-auto">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text! mb-1.5">Public note</label>
            <textarea
              value={notePublic}
              onChange={(e) => setNotePublic(e.target.value)}
              rows={3}
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text! mb-1.5">Private note</label>
            <textarea
              value={notePrivate}
              onChange={(e) => setNotePrivate(e.target.value)}
              rows={3}
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 resize-y"
            />
          </div>
          {saveNotes.isError && <p className="text-sm text-danger">{saveNotes.error instanceof Error ? saveNotes.error.message : 'Failed to save notes.'}</p>}
          <div className="flex items-center justify-end gap-2">
            {saved && <span className="text-xs text-success-fg">Saved.</span>}
            <button
              type="button"
              disabled={saveNotes.isPending}
              onClick={() =>
                saveNotes.mutate(
                  { note_public: notePublic, note_private: notePrivate },
                  {
                    onSuccess: () => {
                      setSaved(true)
                      setTimeout(() => setSaved(false), 2500)
                    },
                  },
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60"
            >
              <Check size={14} /> {saveNotes.isPending ? 'Saving…' : 'Save notes'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// The six tab components below all use the same real
// societe/api/{transactions,activities,contacts,contracts,customer,
// agenda}.php namespace — see customerDetailTabs.queries.ts's header
// comment for how it was found (watching societe/card.php?socid=X's own
// network traffic while switching tabs). This superseded an earlier version
// of this file that showed a session-local activity log here instead,
// mistakenly assumed to be the only real option before this real,
// per-third-party backend was found.

export function ContactsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerContacts(socid)
  const [showAddContact, setShowAddContact] = useState(false)
  if (isLoading) return <LegacyLoadingCard label="Loading contacts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contacts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <TabTitle>Contacts</TabTitle>
        <button
          type="button"
          onClick={() => setShowAddContact(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus size={14} /> Add contact
        </button>
      </div>
      {showAddContact && socid && <AddContactModal socid={socid} onClose={() => setShowAddContact(false)} />}
      <div className="p-4">
        {data.rows.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No contacts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 pr-3">Name</th>
                <th className="font-medium py-2 pr-3">Position</th>
                <th className="font-medium py-2 pr-3">Email</th>
                <th className="font-medium py-2">Phone</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 font-medium text-text!">{[c.firstname, c.lastname].filter(Boolean).join(' ')}</td>
                  <td className="py-2 pr-3 text-text-muted">{c.poste}</td>
                  <td className="py-2 pr-3 text-text-muted">
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {c.email}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-text-muted">
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {c.phone}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}

// societe/api/pricing_groups.php — global custom_group table (not scoped to
// one third party). Read-only: the classic page is a plain table with no
// inline create/edit UI.
export function PricingGroupsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerPricingGroups(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading pricing groups…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load pricing groups" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>Pricing groups</TabTitle>
      <Card className="!h-auto !p-0 overflow-hidden">
        {data.groups.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No pricing groups found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2.5 px-4">Label</th>
                  <th className="font-medium py-2.5 px-4">Discount</th>
                  <th className="font-medium py-2.5 px-4">Discount Type</th>
                  <th className="font-medium py-2.5 px-4">Customer Method</th>
                  <th className="font-medium py-2.5 px-4">Description</th>
                  <th className="font-medium py-2.5 px-4">Tms</th>
                </tr>
              </thead>
              <tbody>
                {data.groups.map((g) => (
                  <tr key={g.id} className={`border-b border-border last:border-0 ${g.id === data.group_id ? 'bg-brand/5' : ''}`}>
                    <td className="py-2.5 px-4 font-medium text-text!">{g.label}</td>
                    <td className="py-2.5 px-4 text-text-muted">{g.discount}</td>
                    <td className="py-2.5 px-4 text-text-muted">{g.discount_type}</td>
                    <td className="py-2.5 px-4 text-text-muted">{g.customer_method}</td>
                    <td className="py-2.5 px-4 text-text-muted">{g.description}</td>
                    <td className="py-2.5 px-4 text-text-muted whitespace-nowrap">{g.tms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// societe/api/documents.php — real files under documents/societe/<id>/,
// confirmed by reading that file directly (dol_dir_list against the real
// upload_dir, real multipart upload via dol_move_uploaded_file).
export function DocumentsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerDocuments(socid)
  const uploadDocument = useUploadCustomerDocument(socid)
  const [file, setFile] = useState<File | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading documents…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>Documents</TabTitle>
      <Card className="!h-auto">
        {data.documents.length === 0 ? (
          <p className="text-sm text-text-faint italic mb-4">No documents yet.</p>
        ) : (
          <ul className="divide-y divide-border mb-4">
            {data.documents.map((doc) => (
              <li key={doc.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a href={stripBackendPrefix(doc.download_url)} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                  {doc.name}
                </a>
                <span className="text-text-faint shrink-0 flex items-center gap-3">
                  <span>{doc.size}</span>
                  <span>{doc.date}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {data.can_edit && (
          <div>
            <label className="block text-sm font-semibold text-text! mb-1.5">Upload file</label>
            {uploadDocument.isError && <p className="text-sm text-danger mb-2">{uploadDocument.error instanceof Error ? uploadDocument.error.message : 'Failed to upload file.'}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-text file:mr-3 file:rounded-md file:border file:border-input-border file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text"
              />
              <button
                type="button"
                disabled={!file || uploadDocument.isPending}
                onClick={() =>
                  file &&
                  uploadDocument.mutate(file, {
                    onSuccess: () => setFile(null),
                  })
                }
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                <Upload size={14} /> {uploadDocument.isPending ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// societe/api/notify.php — real notify_def rows, confirmed by reading that
// file directly (real INNER JOIN against c_action_trigger/socpeople; POST
// action=add performs a real INSERT).
export function NotificationsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerNotifications(socid)
  const addNotification = useAddCustomerNotification(socid)
  const [actionId, setActionId] = useState('')
  const [contactId, setContactId] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading notifications…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notifications" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>Notifications</TabTitle>
      <Card className="!h-auto">
        {data.assigned.length === 0 ? (
          <p className="text-sm text-text-faint italic mb-4">No notifications assigned.</p>
        ) : (
          <ul className="divide-y divide-border mb-4">
            {data.assigned.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium text-text!">{n.label}</span>
                <span className="text-text-muted">{n.contact_name}</span>
              </li>
            ))}
          </ul>
        )}
        {data.can_edit && (
          <div>
            <h4 className="font-semibold text-text! mb-2">Add notification</h4>
            {addNotification.isError && <p className="text-sm text-danger mb-2">{addNotification.error instanceof Error ? addNotification.error.message : 'Failed to add notification.'}</p>}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-xs text-text-faint">Event</label>
                <select value={actionId} onChange={(e) => setActionId(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
                  <option value="">—</option>
                  {data.available.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-xs text-text-faint">Contact</label>
                <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
                  <option value="">—</option>
                  {data.contacts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name ?? o.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!actionId || !contactId || addNotification.isPending}
                onClick={() =>
                  addNotification.mutate(
                    { action_id: Number(actionId), contact_id: Number(contactId) },
                    {
                      onSuccess: () => {
                        setActionId('')
                        setContactId('')
                      },
                    },
                  )
                }
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {addNotification.isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
