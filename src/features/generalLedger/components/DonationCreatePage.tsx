import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HandCoins, Loader2, Save, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { useCreateDonation, useDonationCreateForm, type DonationCreateForm, type DonationInput } from '../donationCreate.queries'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const areaCls = 'w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// MM/dd/yyyy (the real form's own format) <-> yyyy-MM-dd (native date input).
const toIso = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}
const toUs = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className={`mb-1 text-xs font-medium ${required ? 'text-danger' : 'text-text-faint'}`}>
        {label}
        {required && '*'}
      </p>
      {children}
    </div>
  )
}

type Values = Omit<DonationInput, 'token'>
const EMPTY: Values = {
  date: '',
  amount: '',
  isPublic: '0',
  company: '',
  lastname: '',
  firstname: '',
  address: '',
  zipcode: '',
  town: '',
  country: '0',
  email: '',
  paymentType: '',
  notePublic: '',
  notePrivate: '',
  project: '0',
}

// don/card.php?action=create — the real "Create a donation" form. Countries,
// payment types and projects come from the backend page itself; Save posts the
// real action=add form and, like the original, is refused with the backend's
// own "Field 'X' is required" messages (Date and Amount are the required ones).
function DonationForm({ data }: { data: DonationCreateForm }) {
  const navigate = useNavigate()
  const create = useCreateDonation()
  const [v, setV] = useState<Values>(EMPTY)
  const set = (p: Partial<Values>) => setV((s) => ({ ...s, ...p }))

  const today = () => {
    const d = new Date()
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
  }
  const save = () => create.mutate({ token: data.token, ...v }, { onSuccess: () => navigate(ROUTES.ledgerDonationsList) })

  return (
    <StickyFormShell
      scrollsInternally={false}
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <HandCoins size={20} className="text-brand" /> Create a donation
        </h2>
      }
      footerLeft={null}
      footerRight={
        <>
          <button
            type="button"
            onClick={save}
            disabled={create.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
          <button
            type="button"
            onClick={() => navigate(ROUTES.ledgerDonationsList)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <X size={14} /> Cancel
          </button>
        </>
      }
    >
      {create.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-3.5 py-3 text-sm text-danger">
          {create.error instanceof Error ? create.error.message : 'Saving failed.'}
        </div>
      )}
      <Card className="!h-auto">
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-3">
          <Field label="Ref." required>
            <p className="pt-1.5 text-sm text-text">Draft</p>
          </Field>
          <Field label="Date" required>
            <div className="flex gap-2">
              <input type="date" value={toIso(v.date)} onChange={(e) => set({ date: toUs(e.target.value) })} className={inputCls} />
              <button type="button" onClick={() => set({ date: today() })} className="h-9 rounded-md border border-input-border px-3 text-sm text-text hover:bg-surface-hover">
                Now
              </button>
            </div>
          </Field>
          <Field label="Amount" required>
            <div className="flex">
              <input value={v.amount} onChange={(e) => set({ amount: e.target.value })} inputMode="decimal" className={`${inputCls} rounded-r-none`} />
              {data.currency && <span className="grid h-9 shrink-0 place-items-center rounded-r-md border border-l-0 border-input-border bg-surface px-3 text-sm text-text-muted">{data.currency}</span>}
            </div>
          </Field>

          <Field label="Public donation" required>
            <select value={v.isPublic} onChange={(e) => set({ isPublic: e.target.value })} className={inputCls}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </Field>
          <Field label="Company">
            <input value={v.company} onChange={(e) => set({ company: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Last name">
            <input value={v.lastname} onChange={(e) => set({ lastname: e.target.value })} className={inputCls} />
          </Field>

          <Field label="First name">
            <input value={v.firstname} onChange={(e) => set({ firstname: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Address">
            <textarea value={v.address} onChange={(e) => set({ address: e.target.value })} rows={1} className={areaCls} />
          </Field>
          <Field label="Zip Code / City">
            <div className="flex gap-2">
              <input value={v.zipcode} onChange={(e) => set({ zipcode: e.target.value })} className={`${inputCls} !w-28 shrink-0`} />
              <input value={v.town} onChange={(e) => set({ town: e.target.value })} className={`${inputCls} min-w-0 flex-1`} />
            </div>
          </Field>

          <Field label="Country">
            <SearchableSelect value={v.country} onChange={(country) => set({ country })} options={data.countries} placeholder="Select Country" />
          </Field>
          <Field label="EMail">
            <input type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Payment Type">
            <select value={v.paymentType} onChange={(e) => set({ paymentType: e.target.value })} className={inputCls}>
              {data.paymentTypes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Note (public)">
            <textarea value={v.notePublic} onChange={(e) => set({ notePublic: e.target.value })} rows={2} className={areaCls} />
          </Field>
          <Field label="Note (private)">
            <textarea value={v.notePrivate} onChange={(e) => set({ notePrivate: e.target.value })} rows={2} className={areaCls} />
          </Field>
          <Field label="Project">
            <select value={v.project} onChange={(e) => set({ project: e.target.value })} className={inputCls}>
              {data.projects.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>
    </StickyFormShell>
  )
}

export function DonationCreatePage() {
  const { data, isLoading, isError, error, refetch } = useDonationCreateForm()
  if (isLoading) return <LegacyLoadingCard label="Loading form…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return <DonationForm data={data} />
}
