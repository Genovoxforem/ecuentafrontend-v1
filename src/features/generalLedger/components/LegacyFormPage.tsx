import { useState, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, Loader2, Save, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { dateParts, useLegacyForm, useSubmitLegacyForm, type LegacyFormData } from '../legacyForm'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const areaCls = 'w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// mm/dd/yyyy (the backend form's own format) <-> yyyy-mm-dd (native date input).
const toIso = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}
const toUs = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

export interface LegacyFormFieldConfig {
  name: string
  label: string
  kind?: 'text' | 'date' | 'select' | 'textarea' | 'radio'
  required?: boolean
  hint?: string
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`mb-1 text-xs font-medium ${required ? 'text-danger' : 'text-text-faint'}`}>
        {label}
        {required && '*'}
      </p>
      {children}
      {hint && <p className="mt-1 text-xs text-text-faint">{hint}</p>}
    </div>
  )
}

type Item = { kind: 'separator'; label: string } | { kind: 'field'; cfg: LegacyFormFieldConfig }

interface FormProps {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  path: string
  query?: Record<string, string>
  anchor: string
  // Without `fields`, the form is laid out as the backend page prints it: its sections, its
  // labels, its order, and the name on its submit button.
  fields?: LegacyFormFieldConfig[]
  // extra POST fields a named submit button would send (e.g. { save: 'Save' })
  submitExtra?: Record<string, string>
  submitLabel?: string
  // A create form: success = the backend redirected to the new record, then go here.
  // Without it the form is a setup form that stays on the page after saving.
  redirectTo?: string
  note?: string
}

function LegacyForm({ data, ...p }: FormProps & { data: LegacyFormData }) {
  const navigate = useNavigate()
  const submit = useSubmitLegacyForm(p.path)
  const derived = !p.fields
  const items: Item[] = p.fields
    ? p.fields.filter((f) => data.fields[f.name]).map((cfg) => ({ kind: 'field', cfg }))
    : data.layout.map((i) => (i.kind === 'separator' ? i : { kind: 'field', cfg: { name: i.name, label: i.label, required: i.required } }))
  const configs = items.flatMap((i) => (i.kind === 'field' ? [i.cfg] : []))
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(configs.map((f) => [f.name, data.fields[f.name].value])))
  const [saved, setSaved] = useState<string | null>(null)
  const set = (name: string, v: string) => setValues((s) => ({ ...s, [name]: v }))

  const save = () => {
    setSaved(null)
    const body = new URLSearchParams({ ...data.hidden, ...p.submitExtra })
    for (const f of configs) {
      // A select's blank choice carries a non-breaking space; the setting should be stored empty.
      const v = data.fields[f.name].tag === 'select' && !(values[f.name] ?? '').trim() ? '' : (values[f.name] ?? '')
      if (f.kind === 'date') for (const [k, val] of Object.entries(dateParts(f.name, v))) body.set(k, val)
      else body.set(f.name, v)
    }
    submit.mutate(
      { body, expectRecord: p.redirectTo !== undefined },
      {
        onSuccess: (res) => {
          if (p.redirectTo) navigate(p.redirectTo)
          else setSaved(res.message || 'Saved.')
        },
      },
    )
  }

  const Icon = p.icon
  return (
    <StickyFormShell
      scrollsInternally={false}
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Icon size={20} className="text-brand" /> {p.title}
        </h2>
      }
      footerLeft={null}
      footerRight={
        <>
          <button
            type="button"
            onClick={save}
            disabled={submit.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {p.submitLabel ?? (derived && data.submitLabel ? data.submitLabel : 'Save')}
          </button>
          {p.redirectTo && (
            <button type="button" onClick={() => navigate(p.redirectTo!)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              <X size={14} /> Cancel
            </button>
          )}
        </>
      }
    >
      {derived && data.intro && (
        <Card className="!h-auto flex items-start gap-2 !bg-info-bg">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-sm text-info-fg">{data.intro}</p>
        </Card>
      )}
      {p.note && <p className="text-xs text-text-faint">{p.note}</p>}
      {saved && <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-3.5 py-3 text-sm text-success-fg">{saved}</div>}
      {submit.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-3.5 py-3 text-sm text-danger">
          {submit.error instanceof Error ? submit.error.message : 'Saving failed.'}
        </div>
      )}
      <Card className="!h-auto">
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-3">
          {items.map((item, idx) => {
            if (item.kind === 'separator') {
              return (
                <div key={`sep${idx}`} className="flex items-center gap-3 md:col-span-3 first:mt-0 mt-2">
                  <span className="h-px flex-1 bg-border" />
                  <span className="rounded-md border border-border px-3 py-1 text-sm font-semibold text-text!">{item.label}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )
            }
            const f = item.cfg
            const real = data.fields[f.name]
            const v = values[f.name] ?? ''
            const kind = f.kind ?? (real.tag === 'select' ? 'select' : real.tag === 'textarea' ? 'textarea' : real.type === 'radio' ? 'radio' : 'text')
            // A select's blank choice stays selectable (an empty label would vanish from the search list).
            const blank = real.options.find((o) => o.label.trim() === '')
            return (
              <Field key={f.name} label={f.label} required={f.required} hint={f.hint}>
                {kind === 'select' &&
                  (real.options.length > 15 ? (
                    <SearchableSelect
                      value={v}
                      onChange={(x) => set(f.name, x)}
                      options={[...(blank && !f.required ? [{ value: blank.value, label: '—' }] : []), ...real.options.filter((o) => o.label.trim() !== '')]}
                      placeholder="Select…"
                    />
                  ) : (
                    <select value={v} onChange={(e) => set(f.name, e.target.value)} className={inputCls}>
                      {real.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label || '—'}
                        </option>
                      ))}
                    </select>
                  ))}
                {kind === 'date' && <input type="date" value={toIso(v)} onChange={(e) => set(f.name, toUs(e.target.value))} className={inputCls} />}
                {kind === 'textarea' && <textarea value={v} onChange={(e) => set(f.name, e.target.value)} rows={2} className={areaCls} />}
                {kind === 'radio' && (
                  <div className="flex flex-wrap gap-4 pt-1.5">
                    {real.options.map((o) => (
                      <label key={o.value} className="flex items-center gap-1.5 text-sm text-text">
                        <input type="radio" name={f.name} checked={v === o.value} onChange={() => set(f.name, o.value)} /> {o.label}
                      </label>
                    ))}
                  </div>
                )}
                {kind === 'text' && <input value={v} onChange={(e) => set(f.name, e.target.value)} className={inputCls} />}
              </Field>
            )
          })}
        </div>
      </Card>
    </StickyFormShell>
  )
}

// A backend create/setup form, rendered natively from the form itself: the
// values and option lists it prints are what is shown, and Save posts the same
// fields the original form posts.
export function LegacyFormPage(props: FormProps) {
  const { data, isLoading, isError, error, refetch } = useLegacyForm(props.path, props.anchor, props.query)
  if (isLoading) return <LegacyLoadingCard label={`Loading ${props.title.toLowerCase()}…`} />
  if (isError || !data) return <LegacyErrorCard title={`Couldn't load ${props.title.toLowerCase()}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return <LegacyForm key={props.path} data={data} {...props} />
}
