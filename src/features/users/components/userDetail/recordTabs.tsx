import { useEffect, useState } from 'react'
import { Plus, Bell, Download, Trash2, Loader2, PhoneCall, Database } from 'lucide-react'
import { useUser, useUserDetail } from '../../users.queries'
import { useUserNotes, useSaveUserNotes, useUserDocuments, useUploadUserDocument, useDeleteUserDocument, useUserAgenda, useCreateUserAgendaEvent, useUserNotifications, useAddUserNotification, useDeleteUserNotification } from '../../userDetailTabs.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { Field, inputCls, primaryBtn } from './UserDetailShared'

function ReadOnlyNote({ children }: { children: string }) {
  return <p className="text-xs text-text-faint italic mt-1">{children}</p>
}

// Real via userprofile/api/notes.php.
export function NotesTab({ userId }: { userId: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useUserNotes(userId)
  const save = useSaveUserNotes(userId)
  const [value, setValue] = useState('')

  useEffect(() => {
    if (data) setValue(data.note)
  }, [data])

  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        disabled={!data.can_edit}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        placeholder="No note recorded."
        className={`${inputCls} resize-y`}
      />
      {data.can_edit && (
        <button type="button" disabled={save.isPending} onClick={() => save.mutate(value)} className={primaryBtn}>
          {save.isPending && <Loader2 size={13} className="animate-spin" />} Save
        </button>
      )}
      {save.isError && <p className="text-sm text-danger">{save.error instanceof Error ? save.error.message : 'Failed to save note.'}</p>}
      {save.isSuccess && <p className="text-sm text-success-fg">Note saved.</p>}
    </div>
  )
}

// Real via userprofile/api/documents.php — lists actual files under this
// user's dol_dir_list() output directory, real upload/delete.
export function DocumentsTab({ userId }: { userId: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useUserDocuments(userId)
  const upload = useUploadUserDocument(userId)
  const del = useDeleteUserDocument(userId)

  if (isLoading) return <LegacyLoadingCard label="Loading documents…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      {data.canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload.mutate(file)
              e.target.value = ''
            }}
            className="text-sm text-text-muted"
          />
          {upload.isPending && (
            <span className="flex items-center gap-1 text-xs text-text-faint">
              <Loader2 size={12} className="animate-spin" /> Uploading…
            </span>
          )}
        </div>
      )}
      {upload.isError && <p className="text-sm text-danger">{upload.error instanceof Error ? upload.error.message : 'Upload failed.'}</p>}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface border-b border-border">
              <th className="font-medium px-3 py-2">Name</th>
              <th className="font-medium px-3 py-2">Size</th>
              <th className="font-medium px-3 py-2">Date</th>
              <th className="font-medium px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {data.documents.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-text-faint italic" colSpan={4}>
                  No documents uploaded.
                </td>
              </tr>
            ) : (
              data.documents.map((d) => (
                <tr key={d.name} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-text!">{d.name}</td>
                  <td className="px-3 py-2 text-text-muted whitespace-nowrap">{d.size}</td>
                  <td className="px-3 py-2 text-text-muted whitespace-nowrap">{d.date}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <a href={d.downloadUrl} target="_blank" rel="noreferrer" title="Download" className="text-text-faint hover:text-brand">
                        <Download size={14} />
                      </a>
                      {data.canEdit && (
                        <button type="button" title="Delete" onClick={() => del.mutate(d.name)} disabled={del.isPending} className="text-text-faint hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Real via userprofile/api/agenda.php — full event list plus real create.
export function AgendaTab({ userId, canEdit }: { userId: string | undefined; canEdit: boolean }) {
  const { data: events, isLoading, isError, error, refetch } = useUserAgenda(userId)
  const create = useCreateUserAgendaEvent(userId)
  const [form, setForm] = useState({ label: '', date: '', date_end: '', note: '' })

  if (isLoading) return <LegacyLoadingCard label="Loading agenda…" />
  if (isError || !events) return <LegacyErrorCard title="Couldn't load agenda" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="border border-border rounded-lg p-3 space-y-2">
          <p className="font-semibold text-text! text-sm">Add Event</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input placeholder="Label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className={inputCls} />
            <input type="datetime-local" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
            <input type="datetime-local" value={form.date_end} onChange={(e) => setForm((f) => ({ ...f, date_end: e.target.value }))} className={inputCls} />
            <input placeholder="Note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className={inputCls} />
          </div>
          <button
            type="button"
            disabled={create.isPending || !form.label || !form.date}
            onClick={() =>
              create.mutate(form, {
                onSuccess: () => setForm({ label: '', date: '', date_end: '', note: '' }),
              })
            }
            className={primaryBtn}
          >
            {create.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add Event
          </button>
          {create.isError && <p className="text-sm text-danger">{create.error instanceof Error ? create.error.message : 'Failed to create event.'}</p>}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface border-b border-border">
              <th className="font-medium px-3 py-2">Label</th>
              <th className="font-medium px-3 py-2">Date</th>
              <th className="font-medium px-3 py-2">Note</th>
              <th className="font-medium px-3 py-2">Progress</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-text-faint italic" colSpan={4}>
                  No events recorded.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-text!">{e.label}</td>
                  <td className="px-3 py-2 text-text-muted whitespace-nowrap">{e.date}</td>
                  <td className="px-3 py-2 text-text-muted">{e.note || '—'}</td>
                  <td className="px-3 py-2 text-text-muted">{e.percent}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Real via userprofile/api/notify.php — llx_notify_def rows for this user.
export function NotificationsTab({ userId }: { userId: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useUserNotifications(userId)
  const add = useAddUserNotification(userId)
  const del = useDeleteUserNotification(userId)
  const [selected, setSelected] = useState<number | ''>('')

  if (isLoading) return <LegacyLoadingCard label="Loading notifications…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notifications" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start gap-2 text-text-muted">
        <Bell size={15} className="text-text-faint shrink-0 mt-0.5" />
        <p>Email notifications sent automatically for Ecuenta events this user is subscribed to.</p>
      </div>

      {data.canEdit && (
        <div>
          <p className="font-semibold text-text! mb-2 pb-1.5 border-b border-border">Subscribe to a new event</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={selected} onChange={(e) => setSelected(e.target.value ? Number(e.target.value) : '')} className={`${inputCls} max-w-xs`}>
              <option value="">Select event…</option>
              {data.available.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selected || add.isPending}
              onClick={() => {
                if (selected) add.mutate(selected, { onSuccess: () => setSelected('') })
              }}
              className={primaryBtn}
            >
              {add.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
            </button>
          </div>
          {add.isError && <p className="text-sm text-danger mt-1">{add.error instanceof Error ? add.error.message : 'Failed to add.'}</p>}
        </div>
      )}

      <div>
        <p className="font-semibold text-text! mb-2 pb-1.5 border-b border-border">Active subscriptions ({data.assigned.length})</p>
        {data.assigned.length === 0 ? (
          <p className="text-text-faint italic">None</p>
        ) : (
          <div className="space-y-1">
            {data.assigned.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5">
                <span className="text-text!">{a.label}</span>
                {data.canEdit && (
                  <button type="button" title="Remove" onClick={() => del.mutate(a.id)} disabled={del.isPending} className="text-text-faint hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function LdapTab({ user }: { user: NonNullable<ReturnType<typeof useUser>['user']> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Database size={16} className="text-brand" />
        <h3 className="font-semibold text-text!">LDAP Account</h3>
      </div>
      <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
        <Field label="Username" value={user.login} />
        <Field label="Email Address" value={user.email} />
        <ReadOnlyNote>LDAP connection and synchronization controls are not exposed by the current user-profile API.</ReadOnlyNote>
      </div>
    </div>
  )
}

export function ClickToDialTab({ user, detail }: { user: NonNullable<ReturnType<typeof useUser>['user']>; detail: ReturnType<typeof useUserDetail>['detail'] }) {
  const phone = detail?.mobile || user.phone
  const officePhone = detail?.officePhone || ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <PhoneCall size={16} className="text-brand" />
        <h3 className="font-semibold text-text!">Click To Dial</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[['Mobile', phone], ['Office Phone', officePhone]].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-4">
            <p className="text-xs text-text-faint">{label}</p>
            {value ? (
              <a href={`tel:${value}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
                <PhoneCall size={14} /> {value}
              </a>
            ) : <p className="mt-1 text-sm text-text-faint">No phone number recorded.</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
