import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useStatesByCountry } from '../../customers/thirdPartyOptions.queries'
import { EMPTY_NEW_MEMBER, useCreateMember, useNewMemberOptions, type NewMemberInput, type Option } from '../memberForms.data'

// The classic selects start on an empty entry: one is added when the backend list does not carry it.
function Choice({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Option[] }) {
  return (
    <select className={inputClasses} value={value} onChange={(e) => onChange(e.target.value)}>
      {value === '' && !options.some((o) => o.value === '') && <option value="" />}
      {options.map((o, i) => (
        <option key={`${o.value}-${i}`} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

const SOCIAL: Array<{ key: keyof NewMemberInput; label: string }> = [
  { key: 'member_facebook', label: 'Facebook' },
  { key: 'member_skype', label: 'Skype' },
  { key: 'member_twitter', label: 'Twitter' },
  { key: 'member_linkedin', label: 'LinkedIn' },
  { key: 'member_instagram', label: 'Instagram' },
  { key: 'member_snapchat', label: 'Snapchat' },
  { key: 'member_googleplus', label: 'GooglePlus' },
  { key: 'member_youtube', label: 'Youtube' },
  { key: 'member_whatsapp', label: 'Whatsapp' },
]

const STEPS = ['Setup basic details', 'Add professional info'] as const

function Stepper({ step }: { step: number }) {
  const circle = (n: number) =>
    n < step ? 'bg-success text-white' : n === step ? 'bg-brand text-white' : 'bg-surface-hover text-text-muted border border-border'
  return (
    <div className="px-2">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
        {STEPS.map((_, i) => (
          <span key={i} className={`relative z-10 grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${circle(i + 1)}`}>
            {i + 1 < step ? <Check size={16} /> : i + 1}
          </span>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-text-muted">
        {STEPS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <details open className="group">
      <summary className="cursor-pointer select-none py-1 text-sm font-medium text-text">Details</summary>
      <Card className="!h-auto">{children}</Card>
    </details>
  )
}

// adherents/card.php?action=create — the classic "New member" wizard: step 1 "Setup basic details", step 2 "Add professional info" (the social
// media accounts), then Create member / Cancel. Its option lists (member types, nature, title, gender, countries, tags) are read from the classic
// form; the backend refuses a missing type, nature, last name or first name, and the same four are checked here before it is asked.
export function NewMemberPage() {
  const navigate = useNavigate()
  const { data: options, isLoading, isError, error, refetch } = useNewMemberOptions()
  const create = useCreateMember()
  const [form, setForm] = useState<NewMemberInput | null>(null)
  const [step, setStep] = useState(1)
  const [problems, setProblems] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const current = form ?? (options ? { ...EMPTY_NEW_MEMBER, country_id: options.defaultCountry, public: options.isPublicDefault || '1' } : null)
  const apiStates = useStatesByCountry(options && current && current.country_id !== options.defaultCountry && current.country_id !== '0' ? current.country_id : undefined)

  if (isLoading) return <LegacyLoadingCard label="Loading the new member form…" />
  if (isError || !options || !current) return <LegacyErrorCard title="Couldn't load the new member form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const set = <K extends keyof NewMemberInput>(k: K, v: NewMemberInput[K]) => setForm({ ...current, [k]: v })
  const states: Option[] = current.country_id === options.defaultCountry ? options.defaultStates : [{ value: '0', label: 'Select a state / province' }, ...(apiStates.data ?? [])]
  const text = (k: keyof NewMemberInput, extra?: { type?: string }) => (
    <input className={inputClasses} type={extra?.type ?? 'text'} value={current[k] as string} onChange={(e) => set(k, e.target.value as never)} />
  )

  const missing = (): string[] => {
    const list: string[] = []
    if (!options.noTypes && !current.typeid) list.push("Field 'Type' is required")
    if (!current.morphy) list.push("Field 'Nature of member' is required")
    if (!current.lastname.trim()) list.push("Field 'Last name' is required")
    if (!current.firstname.trim()) list.push("Field 'First name' is required")
    return list
  }

  const submit = () => {
    setDone(false)
    const list = missing()
    setProblems(list)
    if (list.length > 0) {
      setStep(1)
      return
    }
    create.mutate(current, {
      onSuccess: () => {
        setForm(null)
        setStep(1)
        setDone(true)
      },
    })
  }

  const button = 'rounded-lg px-4 py-2 text-sm font-medium'

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (step === 2) submit()
        else setStep(2)
      }}
      className="space-y-4"
    >
      <Stepper step={step} />

      {done && (
        <div className="rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">
          Member created. <Link to={ROUTES.memberList} className="underline">Open the members list</Link>
        </div>
      )}
      {problems.length > 0 && <div className="rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger whitespace-pre-line">{problems.join('\n')}</div>}

      {step === 1 && (
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {options.noTypes ? (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-danger">Member type*</span>
                <span className="text-text">
                  No member types defined. Go to menu "<Link to={ROUTES.memberTypes} className="text-brand underline">Members types</Link>"
                </span>
              </div>
            ) : (
              <Field label="Member type" required>
                <Choice value={current.typeid} onChange={(v) => set('typeid', v)} options={options.types} />
              </Field>
            )}
            <Field label="Nature of member" required>
              <Choice value={current.morphy} onChange={(v) => set('morphy', v)} options={options.natures} />
            </Field>
            <Field label="Company">{text('societe')}</Field>
            <Field label="Title">
              <Choice value={current.civility_id} onChange={(v) => set('civility_id', v)} options={options.civilities} />
            </Field>
            <Field label="Last name">{text('lastname')}</Field>
            <Field label="First name">{text('firstname')}</Field>
            <Field label="Gender">
              <Choice value={current.gender} onChange={(v) => set('gender', v)} options={options.genders} />
            </Field>
            <Field label="EMail">{text('member_email', { type: 'email' })}</Field>
            <Field label="Address">
              <textarea className={`${inputClasses} !min-h-[38px]`} rows={1} value={current.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="Zip Code / City">
              <div className="flex gap-2">
                {text('zipcode')}
                {text('town')}
              </div>
            </Field>
            <Field label="Country">
              <select className={inputClasses} value={current.country_id} onChange={(e) => setForm({ ...current, country_id: e.target.value, state_id: '0' })}>
                {options.countries.map((o, i) => (
                  <option key={`${o.value}-${i}`} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="State/Province">
              <Choice value={current.state_id} onChange={(v) => set('state_id', v)} options={states} />
            </Field>
            <Field label="Prof. phone">{text('phone')}</Field>
            <Field label="Pers. phone">{text('phone_perso')}</Field>
            <Field label="Mobile">{text('phone_mobile')}</Field>
            <Field label="Date of birth">{text('birth', { type: 'date' })}</Field>
            <Field label="Information are public">
              <Choice value={current.public} onChange={(v) => set('public', v)} options={options.isPublic} />
            </Field>
            <Field label="Tags/categories">
              <select
                multiple
                className={inputClasses}
                value={current.memcats}
                onChange={(e) =>
                  set(
                    'memcats',
                    Array.from(e.target.selectedOptions, (o) => o.value),
                  )
                }
              >
                {options.tags.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SOCIAL.map((s) => (
              <Field key={s.key} label={s.label}>
                {text(s.key)}
              </Field>
            ))}
          </div>
        </Section>
      )}

      {create.isError && <p className="text-sm text-danger whitespace-pre-line">{create.error instanceof Error ? create.error.message : 'The member was not saved.'}</p>}

      <div className="flex justify-end gap-2">
        {step === 2 && (
          <button type="button" onClick={() => setStep(1)} className={`${button} border border-border text-text`}>
            Previous
          </button>
        )}
        {step === 1 && (
          <button type="submit" className={`${button} bg-brand text-white hover:opacity-90`}>
            Next
          </button>
        )}
        {step === 2 && (
          <button type="submit" disabled={create.isPending} className={`${button} bg-brand text-white hover:opacity-90 disabled:opacity-60`}>
            {create.isPending ? 'Saving…' : 'Create member'}
          </button>
        )}
        <button type="button" onClick={() => navigate(ROUTES.memberList)} className={`${button} border border-border text-text`}>
          Cancel
        </button>
      </div>
    </form>
  )
}
