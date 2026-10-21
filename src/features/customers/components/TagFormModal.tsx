import { useState } from 'react'
import { Pencil, Plus, Save, X } from 'lucide-react'

export interface TagFormValues {
  label: string
  description: string
  /** #rrggbb */
  color: string
  /** 0 = top level */
  parentId: number
  visible: boolean
}

export interface TagParentOption {
  id: number
  fullLabel: string
}

const fieldCls = 'w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'

// The classic tags page's "New tag/category" and "Modify" dialogs: Ref (required),
// Add in (parent), Description, Color and Visible, with Cancel / Save. The same
// component serves create and edit; `initial` prefills the edit one.
export function TagFormModal({
  mode,
  initial,
  parents,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  mode: 'create' | 'edit'
  initial?: Partial<TagFormValues>
  parents: TagParentOption[]
  pending: boolean
  error: string
  onSubmit: (values: TagFormValues) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<TagFormValues>({ label: '', description: '', color: '#6c7ae0', parentId: 0, visible: true, ...initial })
  const [touched, setTouched] = useState(false)
  const missingLabel = touched && !values.label.trim()
  const set = (patch: Partial<TagFormValues>) => setValues((v) => ({ ...v, ...patch }))
  const Icon = mode === 'create' ? Plus : Pencil

  function submit() {
    setTouched(true)
    if (values.label.trim()) onSubmit({ ...values, label: values.label.trim(), description: values.description.trim() })
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-lg overflow-hidden rounded-xl bg-surface-alt shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-brand px-5 py-3 text-white">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Icon size={16} /> {mode === 'create' ? 'New tag/category' : 'Modify'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && <p className="whitespace-pre-line text-sm font-medium text-danger">{error}</p>}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-brand">
              Ref. <span className="text-danger">*</span>
            </span>
            <input autoFocus value={values.label} onChange={(e) => set({ label: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && submit()} className={`${fieldCls} ${missingLabel ? 'border-danger' : ''}`} />
            {missingLabel && <span className="mt-1 block text-xs text-danger">Ref. is required.</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-brand">Add in</span>
            <select value={values.parentId} onChange={(e) => set({ parentId: Number(e.target.value) })} className={fieldCls}>
              <option value={0}>—</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-brand">Description</span>
            <textarea rows={2} value={values.description} onChange={(e) => set({ description: e.target.value })} className={fieldCls} />
          </label>
          <div className="flex items-end gap-4">
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-semibold text-brand">Color</span>
              <span className="flex items-center gap-2">
                <input type="color" value={values.color} onChange={(e) => set({ color: e.target.value })} className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input-border bg-input-bg p-1" aria-label="Pick a color" />
                <input value={values.color} onChange={(e) => set({ color: e.target.value })} className={fieldCls} maxLength={7} />
              </span>
            </label>
            <label className="mb-2 flex items-center gap-2 text-sm text-brand">
              <input type="checkbox" checked={values.visible} onChange={(e) => set({ visible: e.target.checked })} /> Visible
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            <Save size={14} /> {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
