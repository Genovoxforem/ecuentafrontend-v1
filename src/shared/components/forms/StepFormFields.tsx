import { type ComponentType, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { ChevronDown } from 'lucide-react'

export type IconType = ComponentType<{ size?: number; className?: string }>

// Shared step-wizard field-spec machinery — originally built for
// ThirdPartyCreateForm's 3-step "New Third Party" wizard, now reused by
// UserCreateForm's "New User" wizard too (both mirror the same reference
// Dolibarr card.php layout: labeled sections of select/text fields, grouped
// under a step).
export interface FieldSpec {
  key: string
  label: string
  type: 'text' | 'select' | 'file' | 'name' | 'date'
  options?: string[]
  defaultValue?: string
  required?: boolean
  icon?: IconType
  section?: string
  // Overrides the auto-generated "Select {label}" empty-option text.
  placeholder?: string
  // Live format check, run against the trimmed value; returns an error
  // string or null. Only shown once the field is non-empty, so it never
  // nags an untouched field.
  validate?: (value: string) => string | null
  // Restricts keystrokes to digits only (e.g. Tpin) — stripped on every
  // change rather than merely flagged after the fact by `validate`.
  digitsOnly?: boolean
  maxLength?: number
}

export const inputClasses =
  'w-full text-sm rounded-lg border border-input-border bg-input-bg text-text px-2.5 py-1.5 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand'

export function Field({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (value: string) => void }) {
  const Icon = field.icon
  // Only runs once the field is non-empty, so an untouched required field
  // doesn't get nagged with a format error before the user's typed anything.
  const error = field.validate && value.trim() ? field.validate(value.trim()) : null
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-text-muted">
        {field.label}
        {field.required && <span className="text-danger ml-0.5">*</span>}
      </span>
      <div className="relative flex items-center">
        {Icon && <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />}
        {field.type === 'select' ? (
          <>
            <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClasses} ${Icon ? 'pl-9' : ''} appearance-none pr-9`}>
              {!value && <option value="">{field.placeholder ?? `Select ${field.label.toLowerCase()}`}</option>}
              {field.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-faint" />
          </>
        ) : field.type === 'file' ? (
          // No upload endpoint confirmed on the backend — stays visual-only.
          <input
            type="file"
            disabled
            className={`${inputClasses} ${Icon ? 'pl-9' : ''} file:mr-3 file:rounded-md file:border-0 file:bg-surface-hover file:px-2.5 file:py-1 file:text-xs`}
          />
        ) : field.type === 'date' ? (
          <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClasses} ${Icon ? 'pl-9' : ''}`} />
        ) : (
          <input
            type="text"
            inputMode={field.digitsOnly ? 'numeric' : undefined}
            maxLength={field.maxLength}
            value={value}
            onChange={(e) => {
              const raw = field.digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value
              onChange(field.maxLength ? raw.slice(0, field.maxLength) : raw)
            }}
            className={`${inputClasses} ${Icon ? 'pl-9' : ''} ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}`}
          />
        )}
      </div>
      {/* Reserves its line whether or not `error` is currently set, so a
          validated field (e.g. Tpin) doesn't shift the grid row below it
          every time the message appears/disappears mid-typing. */}
      {field.validate && <span className="block min-h-[14px] text-xs text-danger">{error}</span>}
    </label>
  )
}

// Groups a step's fields under their `section` heading, preserving first-seen
// section order — purely a display grouping, doesn't touch submitted values.
export function groupFields(fields: FieldSpec[]): { section: string; fields: FieldSpec[] }[] {
  const order: string[] = []
  const bySection = new Map<string, FieldSpec[]>()
  for (const field of fields) {
    const section = field.section ?? ''
    if (!bySection.has(section)) {
      bySection.set(section, [])
      order.push(section)
    }
    bySection.get(section)!.push(field)
  }
  return order.map((section) => ({ section, fields: bySection.get(section)! }))
}

const GRID_COLS_CLASS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const

export function StepFields({
  fields,
  values,
  setValues,
  sectionIcons = {},
  renderField,
  columns = 3,
}: {
  fields: FieldSpec[]
  values: Record<string, string>
  setValues: Dispatch<SetStateAction<Record<string, string>>>
  sectionIcons?: Record<string, IconType>
  // Escape hatch for field types this module doesn't know how to render
  // itself (e.g. ThirdPartyCreateForm's compound Title+First+Last "name"
  // field) — return a node to use it instead of the default Field, or
  // undefined to fall through to the default.
  renderField?: (field: FieldSpec) => ReactNode | undefined
  // Field-grid column count on sm+ screens (4 steps down to 2 on narrower
  // sm/md widths rather than cramming 4 across a tablet-width viewport).
  // Defaults to 3 (UserCreateForm's existing layout, unaffected unless it
  // opts in); ThirdPartyCreateForm passes 4.
  columns?: 2 | 3 | 4
}) {
  const setField = (key: string) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }))
  return (
    <div className="space-y-6">
      {groupFields(fields).map(({ section, fields: sectionFields }) => {
        const SectionIcon = sectionIcons[section]
        return (
          <div key={section || 'default'}>
            {section && (
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                {SectionIcon && <SectionIcon size={14} className="text-brand" />}
                <h4 className="text-xs font-semibold text-text-faint uppercase tracking-wide">{section}</h4>
              </div>
            )}
            <div className={`grid grid-cols-1 ${GRID_COLS_CLASS[columns]} gap-x-4 gap-y-4`}>
              {sectionFields.map((field) => renderField?.(field) ?? <Field key={field.key} field={field} value={values[field.key]} onChange={setField(field.key)} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
