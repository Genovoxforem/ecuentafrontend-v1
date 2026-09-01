import type { ComponentType } from 'react'
import { X, Info } from 'lucide-react'
import type { PreviewField } from './DisabledFormPage'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed'

function FieldControl({ field }: { field: PreviewField }) {
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input type="checkbox" disabled />
        {field.label}
      </label>
    )
  }
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-faint">
        {field.label}
        {field.required && <span className="text-danger"> *</span>}
      </span>
      {field.type === 'textarea' ? (
        <textarea disabled rows={3} className={inputCls} />
      ) : field.type === 'select' ? (
        <select disabled className={inputCls}>
          <option>{field.options?.[0] ?? 'Select…'}</option>
        </select>
      ) : (
        <input disabled type={field.type === 'date' ? 'date' : 'text'} className={inputCls} />
      )}
    </label>
  )
}

// Modal counterpart to DisabledFormPage — for quick "Add X" actions whose
// backend page has no JSON API (confirmed by reading its PHP source), so
// the fields below are disabled rather than backed by a fake submit.
export function DisabledFormModal({
  icon: Icon,
  title,
  sourcePath,
  fields,
  onClose,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  sourcePath: string
  fields: PreviewField[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <Icon size={16} className="text-brand" /> {title}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-info-bg/40 p-2 mb-3">
          <Info size={14} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">{sourcePath}</code> — no JSON API, so these fields are disabled.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((field) => (
            <FieldControl key={field.label} field={field} />
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
