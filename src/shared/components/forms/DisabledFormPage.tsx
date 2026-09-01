import type { ComponentType } from 'react'
import { Info } from 'lucide-react'
import { Card } from '../dashboard/DashboardKit'

export interface PreviewField {
  label: string
  type?: 'text' | 'select' | 'date' | 'textarea' | 'checkbox'
  options?: string[]
  required?: boolean
}

export interface PreviewFormSection {
  heading?: string
  fields: PreviewField[]
}

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed'

function FieldControl({ field }: { field: PreviewField }) {
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input type="checkbox" disabled />
        {field.label}
        {field.required && <span className="text-danger">*</span>}
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

// Shared shell for every confirmed "no JSON API" backend page found this
// session — renders that page's actual field set (read from its PHP
// source, not guessed) as a disabled form, so the in-app route matches its
// layout without pretending to submit data nothing on the backend can
// receive.
export function DisabledFormPage({
  icon: Icon,
  title,
  sourcePath,
  sections,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  sourcePath: string
  sections: PreviewFormSection[]
}) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> {title}
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">{sourcePath}</code> — a classic full-page-reload page, no JSON API.
          {sections.length > 0
            ? " Fields below match that page's own form exactly; they're disabled since there's nothing to submit to."
            : ' Not investigated field-by-field in this pass, so no layout is reproduced here — this exists to confirm the page and give it an in-app route instead of a direct backend link.'}
        </p>
      </Card>

      {sections.map((section, i) => (
        <Card key={i} className="!h-auto space-y-3">
          {section.heading && <h3 className="text-sm font-semibold text-text!">{section.heading}</h3>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.fields.map((field) => (
              <FieldControl key={field.label} field={field} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
