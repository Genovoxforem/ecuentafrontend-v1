import { useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { LegacyErrorCard, LegacyLoadingCard } from '../../../products/components/LegacyReportStates'
import { useAddEmailTemplate, useDeleteEmailTemplate, useEmailTemplateForEdit, useEmailTemplates, useToggleEmailTemplate, useUpdateEmailTemplate, type EmailTemplateInput } from '../../emails/emails.queries'
import type { EmailTemplateRow, EmailTemplatesPage } from '../../emails/emailTemplatesParser'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function Toggle({ checked, busy, onChange, label }: { checked: boolean; busy: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors shrink-0 disabled:opacity-60 ${checked ? 'bg-brand' : 'bg-surface-alt border border-border'}`}
    >
      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

// A blank form with the defaults the backend's own add form starts from.
function blankForm(page: EmailTemplatesPage): EmailTemplateInput {
  const pick = (options: { value: string }[], preferred: string) => (options.some((o) => o.value === preferred) ? preferred : '')
  return {
    label: '',
    language: page.languageOptions ? pick(page.languageOptions, '0') : '',
    type: '',
    owner: pick(page.ownerOptions, '-1'),
    isPrivate: pick(page.privateOptions, '0'),
    position: '',
    subject: '',
    attachFiles: page.attachDefault,
    content: '',
  }
}

function TemplateForm({ page, editId, onDone }: { page: EmailTemplatesPage; editId: string | null; onDone: () => void }) {
  const add = useAddEmailTemplate()
  const update = useUpdateEmailTemplate()
  const edit = useEmailTemplateForEdit(editId)
  const [form, setForm] = useState<EmailTemplateInput>(() => blankForm(page))
  const [missing, setMissing] = useState('')
  const saving = add.isPending || update.isPending
  const failure = (editId ? update.error : add.error) as Error | null

  useEffect(() => {
    if (editId === null) {
      setForm(blankForm(page))
      return
    }
    if (edit.data) {
      const { rowId: _rowId, ...rest } = edit.data
      setForm(rest)
    }
    // Only when the edit target's data arrives; later list refreshes must not overwrite typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, edit.data])

  const set = <K extends keyof EmailTemplateInput>(key: K, value: EmailTemplateInput[K]) => setForm((cur) => ({ ...cur, [key]: value }))

  function submit() {
    if (!form.label.trim()) return setMissing('Code is required.')
    if (!form.type) return setMissing('Type of template is required.')
    if (!form.isPrivate) return setMissing('Private is required.')
    if (!form.subject.trim()) return setMissing('Subject is required.')
    setMissing('')
    if (editId) {
      update.mutate({ ...form, rowId: editId }, { onSuccess: onDone })
    } else {
      add.mutate(form, { onSuccess: () => setForm(blankForm(page)) })
    }
  }

  if (editId && edit.isLoading) return <LegacyLoadingCard label="Loading template…" />
  if (editId && (edit.isError || !edit.data)) {
    return <LegacyErrorCard title="Couldn't load this template" message={edit.error instanceof Error ? edit.error.message : 'Unknown error.'} onRetry={() => edit.refetch()} />
  }

  return (
    <Card className="!h-auto">
      <h3 className="text-base font-semibold text-text! mb-3">{editId ? 'Modify template' : 'New template'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
        <div>
          <label className="block text-xs text-text-faint mb-1">Code *</label>
          <input value={form.label} onChange={(e) => set('label', e.target.value)} className={inputCls + ' w-full'} />
        </div>
        {page.languageOptions && (
          <div>
            <label className="block text-xs text-text-faint mb-1">Language</label>
            <select value={form.language} onChange={(e) => set('language', e.target.value)} className={selectCls + ' w-full'}>
              {page.languageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-text-faint mb-1">Type of template *</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)} className={selectCls + ' w-full'}>
            <option value="">—</option>
            {page.typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Owner</label>
          <select value={form.owner} onChange={(e) => set('owner', e.target.value)} className={selectCls + ' w-full'}>
            {page.ownerOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Private *</label>
          <select value={form.isPrivate} onChange={(e) => set('isPrivate', e.target.value)} className={selectCls + ' w-full'}>
            {page.privateOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Position</label>
          <input value={form.position} onChange={(e) => set('position', e.target.value)} inputMode="numeric" className={inputCls + ' w-full'} />
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-xs text-text-faint mb-1">Subject *</label>
        <input value={form.subject} onChange={(e) => set('subject', e.target.value)} className={inputCls + ' w-full'} />
      </div>
      <label className="flex items-center gap-2 text-sm text-text-muted mb-3">
        <input type="checkbox" checked={form.attachFiles === '1'} onChange={(e) => set('attachFiles', e.target.checked ? '1' : '0')} />
        Attach the main document to the email by default (if applicable)
      </label>
      <div className="mb-3">
        <label className="block text-xs text-text-faint mb-1">Content</label>
        <textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={6} className={inputCls + ' w-full h-auto py-2'} />
      </div>
      {(missing || failure) && (
        <p role="alert" className="text-sm font-medium text-danger mb-2">
          {missing || failure?.message}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : editId ? null : <Plus size={14} />} {editId ? 'Modify' : 'Add'}
        </button>
        {editId && (
          <button type="button" onClick={onDone} disabled={saving} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-alt disabled:opacity-60">
            Cancel
          </button>
        )}
      </div>
    </Card>
  )
}

function TemplateRowView({ row, columns, onEdit }: { row: EmailTemplateRow; columns: Record<string, boolean>; onEdit: () => void }) {
  const toggle = useToggleEmailTemplate()
  const remove = useDeleteEmailTemplate()
  const confirm = useConfirm()
  const working = toggle.isPending || remove.isPending
  const error = (toggle.error ?? remove.error) as Error | null

  async function handleDelete() {
    if (!(await confirm({ title: 'Delete template?', message: `Delete the template "${row.label}"?`, confirmLabel: 'Delete' }))) return
    remove.mutate(row.rowId)
  }

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="py-2.5 px-4 text-brand whitespace-nowrap">{row.label}</td>
        {columns.language && <td className="py-2.5 px-4 text-text-muted">{row.language || '—'}</td>}
        <td className="py-2.5 px-4 text-text-muted">{row.type || '—'}</td>
        {columns.owner && <td className="py-2.5 px-4 text-text-muted">{row.owner || '—'}</td>}
        {columns.isPrivate && <td className="py-2.5 px-4 text-text-muted">{row.isPrivate || '—'}</td>}
        <td className="py-2.5 px-4 text-text-muted">{row.position || '—'}</td>
        <td className="py-2.5 px-4 text-text-muted break-words min-w-48">{row.subject}</td>
        <td className="py-2.5 px-4">
          <Toggle checked={row.active} busy={working} label={`${row.active ? 'Disable' : 'Enable'} ${row.label}`} onChange={(v) => toggle.mutate({ rowId: row.rowId, enable: v })} />
        </td>
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-1 justify-end">
            <button type="button" title="Edit" disabled={working} onClick={onEdit} className="p-1 rounded text-text-muted hover:text-brand hover:bg-surface-alt disabled:opacity-50">
              <Pencil size={14} />
            </button>
            <button type="button" title="Delete" disabled={working} onClick={handleDelete} className="p-1 rounded text-danger hover:bg-danger-bg disabled:opacity-50">
              {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={9} className="px-4 pb-2 text-sm text-danger-fg" role="alert">
            {error.message}
          </td>
        </tr>
      )}
    </>
  )
}

// Emails setup > Email templates (admin/mails_templates.php): the backend's own templates,
// with the same add, modify, enable/disable and delete requests as the page.
export function EmailTemplatesTab() {
  const { data: page, isLoading, isError, error, refetch } = useEmailTemplates()
  const [editId, setEditId] = useState<string | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading email templates…" />
  if (isError || !page) {
    return <LegacyErrorCard title="Couldn't load the email templates" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  // A column that is empty for every template is left out.
  const columns = {
    language: page.rows.some((r) => r.language),
    owner: page.rows.some((r) => r.owner),
    isPrivate: page.rows.some((r) => r.isPrivate),
  }

  return (
    <div className="space-y-4">
      <TemplateForm key={editId ?? 'new'} page={page} editId={editId} onDone={() => setEditId(null)} />

      <Card className="!h-auto !p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Code</th>
              {columns.language && <th className="font-medium py-2 px-4">Language</th>}
              <th className="font-medium py-2 px-4">Type Of Template</th>
              {columns.owner && <th className="font-medium py-2 px-4">Owner</th>}
              {columns.isPrivate && <th className="font-medium py-2 px-4">Private</th>}
              <th className="font-medium py-2 px-4">Position</th>
              <th className="font-medium py-2 px-4">Subject</th>
              <th className="font-medium py-2 px-4">Status</th>
              <th className="font-medium py-2 px-4 w-20" />
            </tr>
          </thead>
          <tbody>
            {page.rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-4 px-4 text-text-faint italic">
                  No templates.
                </td>
              </tr>
            ) : (
              page.rows.map((row) => <TemplateRowView key={row.rowId} row={row} columns={columns} onEdit={() => setEditId(row.rowId)} />)
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
