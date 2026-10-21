import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Loader2, Pencil, Plus, Save, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { ROUTES } from '../../../routes'
import { useAttributeAction, useVariantAttribute, type AttributeAction } from '../productTools.queries'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const iconBtn = 'flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-surface-hover disabled:opacity-40'

// One variant attribute and its values — variants/fapi/attributes.php?id= with
// update / delete / add_value / update_value / delete_value (the classic
// variants/card.php only ever answered 302, so this page used to be inert).
// Delete is refused (409) while a product combination uses the attribute, so
// the button is greyed out from is_used before anyone clicks it.
export function VariantAttributeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { data: attr, isLoading, isError, error, refetch } = useVariantAttribute(id)
  const action = useAttributeAction()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ref: '', label: '' })
  const [newValue, setNewValue] = useState({ ref: '', value: '' })
  const [editValue, setEditValue] = useState<{ id: number; ref: string; value: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  function run(key: string, a: AttributeAction, onDone?: () => void) {
    setActionError('')
    setBusy(key)
    action.mutate(a, {
      onSuccess: () => onDone?.(),
      onError: (e) => setActionError(e instanceof Error ? e.message : 'The action failed.'),
      onSettled: () => setBusy(null),
    })
  }

  const back = (
    <Link to={ROUTES.variantAttributes} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-brand">
      <ArrowLeft size={14} /> Variant attributes
    </Link>
  )

  if (isLoading) return <LegacyLoadingCard label="Loading the attribute…" />
  if (isError || !attr)
    return (
      <div className="space-y-3">
        {back}
        <LegacyErrorCard title="Couldn't load this attribute" message={error instanceof Error ? error.message : 'Attribute not found.'} onRetry={() => refetch()} />
      </div>
    )

  const values = attr.values ?? []

  async function removeAttribute() {
    const ok = await confirm({ title: 'Delete attribute?', message: `Delete the attribute "${attr!.label}" and its ${values.length} value(s)?` })
    if (ok) run('delete', { action: 'delete', id: attr!.id }, () => navigate(ROUTES.variantAttributes))
  }

  async function removeValue(valueId: number, label: string) {
    const ok = await confirm({ title: 'Delete value?', message: `Delete the value "${label}"?`, warningMessage: 'The value is removed from this attribute.' })
    if (ok) run(`dv-${valueId}`, { action: 'delete_value', id: attr!.id, valueId })
  }

  function saveAttribute() {
    if (!form.ref.trim() || !form.label.trim()) {
      setActionError('Ref and label are required.')
      return
    }
    run('update', { action: 'update', id: attr!.id, ref: form.ref.trim(), label: form.label.trim() }, () => setEditing(false))
  }

  function addValue() {
    if (!newValue.ref.trim() || !newValue.value.trim()) {
      setActionError('A value needs both a ref and a label.')
      return
    }
    run('add', { action: 'add_value', id: attr!.id, ref: newValue.ref.trim(), value: newValue.value.trim() }, () => setNewValue({ ref: '', value: '' }))
  }

  function saveValue() {
    if (!editValue) return
    if (!editValue.ref.trim() || !editValue.value.trim()) {
      setActionError('A value needs both a ref and a label.')
      return
    }
    run(`uv-${editValue.id}`, { action: 'update_value', id: attr!.id, valueId: editValue.id, ref: editValue.ref.trim(), value: editValue.value.trim() }, () => setEditValue(null))
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {back}
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <SlidersHorizontal size={20} className="text-brand" /> {attr.label}
      </h2>
      {actionError && <p className="text-sm font-medium text-danger">{actionError}</p>}

      <Card className="!h-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {editing ? (
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Ref</span>
                <input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Label</span>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} />
              </label>
            </div>
          ) : (
            <dl className="grid flex-1 grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-text-faint">Ref</dt>
                <dd className="font-medium text-text!">{attr.ref}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-faint">Label</dt>
                <dd className="text-text!">{attr.label}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-faint">Values</dt>
                <dd className="text-text!">{attr.value_count ?? values.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-faint">Linked products</dt>
                <dd className="text-text!">{attr.product_count ?? 0}</dd>
              </div>
            </dl>
          )}
          <div className="flex gap-2">
            {editing ? (
              <>
                <button type="button" onClick={saveAttribute} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
                  {busy === 'update' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                </button>
                <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover">
                  <X size={14} /> Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ref: attr.ref, label: attr.label })
                    setEditing(true)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => void removeAttribute()}
                  disabled={attr.is_used || busy !== null}
                  title={attr.is_used ? `Used by ${attr.product_count} product combination(s) — it cannot be deleted while they exist.` : undefined}
                  className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger-bg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                </button>
              </>
            )}
          </div>
        </div>
        {attr.is_used && <p className="mt-3 text-xs text-text-faint">Used by {attr.product_count} product combination(s), so it cannot be deleted.</p>}
      </Card>

      <Card className="!p-0 !h-auto overflow-hidden">
        <p className="px-4 py-2.5 text-sm font-semibold text-text! border-b border-border">Possible values</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2 w-1/3">Ref</th>
              <th className="font-medium px-4 py-2">Value</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {values.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-text-faint italic">
                  No values yet.
                </td>
              </tr>
            )}
            {values.map((v) =>
              editValue?.id === v.id ? (
                <tr key={v.id} className="border-b border-border">
                  <td className="px-4 py-2">
                    <input value={editValue.ref} onChange={(e) => setEditValue({ ...editValue, ref: e.target.value })} className={inputCls} aria-label="Value ref" />
                  </td>
                  <td className="px-4 py-2">
                    <input value={editValue.value} onChange={(e) => setEditValue({ ...editValue, value: e.target.value })} className={inputCls} aria-label="Value label" />
                  </td>
                  <td className="px-4 py-2">
                    <span className="flex justify-end gap-1">
                      <button type="button" onClick={saveValue} disabled={busy !== null} aria-label="Save value" className={`${iconBtn} hover:text-brand`}>
                        {busy === `uv-${v.id}` ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button type="button" onClick={() => setEditValue(null)} aria-label="Cancel" className={iconBtn}>
                        <X size={14} />
                      </button>
                    </span>
                  </td>
                </tr>
              ) : (
                <tr key={v.id} className="border-b border-border hover:bg-surface-hover">
                  <td className="px-4 py-2.5 font-medium text-text!">{v.ref}</td>
                  <td className="px-4 py-2.5 text-text!">{v.value}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex justify-end gap-1">
                      <button type="button" onClick={() => setEditValue({ id: v.id, ref: v.ref, value: v.value })} disabled={busy !== null} aria-label={`Edit ${v.value}`} className={`${iconBtn} hover:text-brand`}>
                        <Pencil size={13} />
                      </button>
                      <button type="button" onClick={() => void removeValue(v.id, v.value)} disabled={busy !== null} aria-label={`Delete ${v.value}`} className={`${iconBtn} hover:text-danger`}>
                        {busy === `dv-${v.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </span>
                  </td>
                </tr>
              ),
            )}
            <tr className="bg-surface-alt">
              <td className="px-4 py-2">
                <input value={newValue.ref} onChange={(e) => setNewValue({ ...newValue, ref: e.target.value })} placeholder="Ref, e.g. L" className={inputCls} aria-label="New value ref" />
              </td>
              <td className="px-4 py-2">
                <input value={newValue.value} onChange={(e) => setNewValue({ ...newValue, value: e.target.value })} placeholder="Value, e.g. Large" className={inputCls} aria-label="New value label" />
              </td>
              <td className="px-4 py-2">
                <button type="button" onClick={addValue} disabled={busy !== null} className="ml-auto inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
                  {busy === 'add' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
