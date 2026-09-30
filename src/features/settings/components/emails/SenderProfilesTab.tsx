import { useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { LegacyErrorCard, LegacyLoadingCard } from '../../../products/components/LegacyReportStates'
import { useDeleteSenderProfile, useSaveSenderProfile, useSenderProfileForm, useSenderProfiles, type SenderProfileInput } from '../../emails/emails.queries'
import type { SenderProfileRow } from '../../emails/senderProfilesParser'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function ProfileForm({ target, onDone }: { target: string; onDone: () => void }) {
  const isNew = target === 'new'
  const { data, isLoading, isError, error, refetch } = useSenderProfileForm(target)
  const save = useSaveSenderProfile()
  const [form, setForm] = useState<SenderProfileInput>({ label: '', email: '', signature: '', user: '-1', position: '', active: '1' })
  const [missing, setMissing] = useState('')

  useEffect(() => {
    if (data) setForm({ label: data.label, email: data.email, signature: data.signature, user: data.user, position: data.position, active: data.active })
  }, [data])

  if (isLoading) return <LegacyLoadingCard label="Loading form…" />
  if (isError || !data) {
    return <LegacyErrorCard title="Couldn't load the sender profile form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  const set = <K extends keyof SenderProfileInput>(key: K, value: SenderProfileInput[K]) => setForm((cur) => ({ ...cur, [key]: value }))

  function submit() {
    if (!form.label.trim()) return setMissing('Label is required.')
    setMissing('')
    save.mutate({ ...form, id: isNew ? null : target }, { onSuccess: onDone })
  }

  return (
    <Card className="!h-auto">
      <h3 className="text-base font-semibold text-text! mb-3">{isNew ? 'New sender profile' : 'Modify sender profile'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs text-text-faint mb-1">Label *</label>
          <input value={form.label} onChange={(e) => set('label', e.target.value)} className={inputCls + ' w-full'} />
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls + ' w-full'} />
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Position</label>
          <input value={form.position} onChange={(e) => set('position', e.target.value)} inputMode="numeric" className={inputCls + ' w-full'} />
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">User</label>
          <select value={form.user} onChange={(e) => set('user', e.target.value)} className={selectCls + ' w-full'}>
            {data.userOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Status</label>
          <select value={form.active} onChange={(e) => set('active', e.target.value)} className={selectCls + ' w-full'}>
            {data.activeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-xs text-text-faint mb-1">Signature</label>
        <textarea value={form.signature} onChange={(e) => set('signature', e.target.value)} rows={4} className={inputCls + ' w-full h-auto py-2'} />
      </div>
      {(missing || save.isError) && (
        <p role="alert" className="text-sm font-medium text-danger mb-2">
          {missing || (save.error instanceof Error ? save.error.message : 'The sender profile could not be saved.')}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={save.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {save.isPending && <Loader2 size={14} className="animate-spin" />} Save
        </button>
        <button type="button" onClick={onDone} disabled={save.isPending} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-alt disabled:opacity-60">
          Cancel
        </button>
      </div>
    </Card>
  )
}

function ProfileRowView({ row, onEdit }: { row: SenderProfileRow; onEdit: () => void }) {
  const remove = useDeleteSenderProfile()
  const confirm = useConfirm()

  async function handleDelete() {
    if (!(await confirm({ title: 'Delete sender profile?', message: `Delete the sender profile "${row.label}"?`, confirmLabel: 'Delete' }))) return
    remove.mutate(row.id)
  }

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="py-2.5 px-4 text-text!">{row.label}</td>
        <td className="py-2.5 px-4 text-text-muted break-all">{row.email || '—'}</td>
        <td className="py-2.5 px-4 text-text-muted">{row.position || '—'}</td>
        <td className="py-2.5 px-4 text-text-muted">{row.active ? 'Enabled' : 'Disabled'}</td>
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-1 justify-end">
            <button type="button" title="Edit" disabled={remove.isPending} onClick={onEdit} className="p-1 rounded text-text-muted hover:text-brand hover:bg-surface-alt disabled:opacity-50">
              <Pencil size={14} />
            </button>
            <button type="button" title="Delete" disabled={remove.isPending} onClick={handleDelete} className="p-1 rounded text-danger hover:bg-danger-bg disabled:opacity-50">
              {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        </td>
      </tr>
      {remove.isError && (
        <tr>
          <td colSpan={5} className="px-4 pb-2 text-sm text-danger-fg" role="alert">
            {remove.error instanceof Error ? remove.error.message : 'The sender profile could not be deleted.'}
          </td>
        </tr>
      )}
    </>
  )
}

// Emails setup > Emails sender profiles (admin/mails_senderprofile_list.php).
export function SenderProfilesTab() {
  const { data, isLoading, isError, error, refetch } = useSenderProfiles()
  // `null` = closed, 'new' = create form, otherwise the id being edited.
  const [target, setTarget] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">You can keep this section empty. If you enter some emails here, they will be added to the list of possible senders into the combobox when you write a new email.</p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setTarget('new')}
          disabled={target === 'new'}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          <Plus size={14} /> New
        </button>
      </div>

      {target !== null && <ProfileForm key={target} target={target} onDone={() => setTarget(null)} />}

      {isLoading ? (
        <LegacyLoadingCard label="Loading sender profiles…" />
      ) : isError || !data ? (
        <LegacyErrorCard title="Couldn't load the sender profiles" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      ) : (
        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 px-4">Label</th>
                <th className="font-medium py-2 px-4">Email</th>
                <th className="font-medium py-2 px-4">Position</th>
                <th className="font-medium py-2 px-4">Status</th>
                <th className="font-medium py-2 px-4 w-20" />
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 px-4 text-text-faint italic">
                    No sender profiles.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => <ProfileRowView key={row.id} row={row} onEdit={() => setTarget(row.id)} />)
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
