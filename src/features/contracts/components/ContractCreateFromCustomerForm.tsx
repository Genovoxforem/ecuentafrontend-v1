import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileEdit, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { api } from '../../../api/axios'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { SearchableSelect, type SearchableSelectOption } from '../../../shared/components/forms/SearchableSelect'
import { Avatar } from '../../../shared/components/Avatar'
import { useCustomerDetail } from '../../customers/customerDetail.queries'
import { useCustomerTab } from '../../customers/customerDetailTabs.queries'
import { useUsersSummary } from '../../users/users.queries'
import { useAuth } from '../../auth/AuthContext'
import { useCreateContract } from '../contracts.queries'
import { todayIso } from '../../../shared/localCollection'
import { formatMoney } from '../../../utils/format'

// Deliberately separate from ContractCreateForm (the standalone Contracts
// module's own "New contract" page, reached from the Contracts sidebar) —
// this one is only reachable from a specific customer's own Contract-Follow
// tab ("New contract" button there links to /customers/:id/contracts/create,
// see CustomerDetail.tsx's ContractsTab). The two pages look different in
// the reference app itself: this one shows the third-party as a fixed
// avatar+name badge (you're already inside that customer's own page, so it
// isn't re-pickable) instead of the standalone page's free "select a third
// party" dropdown, and it has no Item Table — contrat/card.php's own
// create-from-third-party form doesn't collect service lines upfront,
// those get added afterward via the separate Services Details page.
// Keeping this as its own component means the standalone module form can
// keep evolving (or not) independently of this one.

interface ProjectOption {
  id: string
  ref: string
  title: string
}

// GET /api/projects.php — same real, working endpoint used by every other
// Create form in this app (queries llx_projet WHERE fk_statut = 1).
function useProjectOptions() {
  return useQuery({
    queryKey: ['projects', 'open'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; results: ProjectOption[] }>('/projects.php')
      return data.results ?? []
    },
    staleTime: 1000 * 60,
  })
}

const inputClasses = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-text">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

// Real per-field user picker (backed by the real userprofile/api/users.php
// roster via useUsersSummary) — matches the reference contrat/card.php
// form's own searchable rep selects, which pick from every user, not just
// the one currently logged in. Renders as a removable chip once a user is
// picked (click the X to clear and search again), same visual as the
// reference's own selected-rep chips.
function RepField({
  label,
  required,
  userId,
  onChange,
  options,
  loading,
}: {
  label: string
  required?: boolean
  userId: string
  onChange: (id: string) => void
  options: SearchableSelectOption[]
  loading: boolean
}) {
  const selected = options.find((o) => o.value === userId)
  return (
    <Field label={label} required={required}>
      {selected ? (
        <div className={`${inputClasses} flex items-center`}>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-brand px-2 py-1 text-xs text-white">
            <button type="button" onClick={() => onChange('')} title="Remove" className="hover:opacity-80">
              <X size={11} />
            </button>
            {selected.label}
          </span>
        </div>
      ) : (
        <SearchableSelect value={userId} onChange={onChange} options={options} placeholder={loading ? 'Loading…' : 'Select a user'} />
      )}
    </Field>
  )
}

export function ContractCreateFromCustomerForm() {
  const { id: socid } = useParams<{ id: string }>()
  const today = todayIso()
  const { user } = useAuth()
  const { data: customer } = useCustomerDetail(socid)
  const { data: customerTab } = useCustomerTab(socid)
  const { data: projects, isLoading: projectsLoading } = useProjectOptions()
  const { data: usersSummary, isLoading: usersLoading } = useUsersSummary()
  const createContract = useCreateContract()
  const navigate = useNavigate()
  const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
  const backLink = socid ? `${ROUTES.customerDetail.replace(':id', socid)}#contracts` : ROUTES.customerList

  const [refCustomer, setRefCustomer] = useState('')
  const [refVendor, setRefVendor] = useState('')
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(today)
  const [notePublic, setNotePublic] = useState('')
  const [notePrivate, setNotePrivate] = useState('')
  // All three default to the logged-in user, same as the reference form,
  // and are real pickers over the roster below (see RepField).
  const [followUpRepId, setFollowUpRepId] = useState(() => user?.id ?? '')
  const [signatureRepId, setSignatureRepId] = useState(() => user?.id ?? '')
  const [supportRepId, setSupportRepId] = useState(() => user?.id ?? '')
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  // Real userprofile/api/users.php roster (see users.queries.ts) — Enabled
  // accounts only, matching who a real Dolibarr rep-select would offer.
  // The reference form's own rep dropdown suffixes every name with its
  // entity scope — "(All entities)" for the one true entity=0 superadmin,
  // "(Master entity)" for every other real user (confirmed live: entity=0
  // only ever coincides with isSuperAdmin's own admin&&entity===0 check —
  // see users.queries.ts — across all 20 real accounts on this backend).
  const userOptions: SearchableSelectOption[] = (usersSummary?.users ?? [])
    .filter((u) => u.status === 'Enabled')
    .map((u) => ({ value: String(u.id), label: `${u.name || u.login} (${u.isSuperAdmin ? 'All entities' : 'Master entity'})` }))

  // societe/api/customer.php's own remise_percent/remise_client — the same
  // two figures the reference form's "Discounts" line is built from
  // (relative % discount vs. absolute credit balance).
  const remisePercent = customerTab?.remise_percent ?? 0
  const remiseClient = customerTab?.remise_client ?? 0

  async function handleSubmit(validate: boolean) {
    setFormError('')
    if (!socid) {
      setFormError('Missing customer.')
      return
    }
    if (!followUpRepId || !signatureRepId) {
      setFormError('Sales representative following-up and signing the contract are required.')
      return
    }
    if (!user) {
      setFormError('Not signed in.')
      return
    }
    setPending(true)
    try {
      const created = await createContract(
        {
          socid,
          refCustomer,
          refVendor,
          contractDate: date,
          projectId: projectId || undefined,
          notePublic,
          notePrivate,
          signatureRepId,
          followUpRepId,
          supportRepId: supportRepId || undefined,
          lines: [],
          validate,
        },
        authorName,
      )
      void created
      navigate(backLink)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create contract.')
    } finally {
      setPending(false)
    }
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileEdit size={20} className="text-brand" /> New Contract
        </h2>
      }
      footerLeft={
        <Link to={backLink} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSubmit(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            Save As Draft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create Contract
          </button>
        </>
      }
    >
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Ref.">
            <input disabled defaultValue="Draft" className={`${inputClasses} text-text-faint`} />
          </Field>
          <Field label="Ref. customer">
            <input type="text" value={refCustomer} onChange={(e) => setRefCustomer(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Ref. vendor">
            <input type="text" value={refVendor} onChange={(e) => setRefVendor(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Third-party" required>
            <div className={`${inputClasses} flex items-center gap-2`}>
              <Avatar name={customer?.name ?? ''} size={20} color="bg-brand" />
              {socid && customer ? (
                <Link to={ROUTES.customerDetail.replace(':id', socid)} className="text-brand hover:underline">
                  {customer.name}
                </Link>
              ) : (
                <span className="text-text-faint">Loading…</span>
              )}
            </div>
          </Field>

          <Field label="Discounts">
            <div className="pt-1.5 space-y-0.5 text-xs text-text-faint">
              <p>{remisePercent > 0 ? `This customer has a default discount of ${remisePercent}%.` : 'This customer has no relative discount by default.'}</p>
              <p>{remiseClient > 0 ? `Discount credit available: ${formatMoney(remiseClient)}.` : 'This customer has no discount credit available.'}</p>
            </div>
          </Field>
          <RepField label="Sales representative following-up contract" required userId={followUpRepId} onChange={setFollowUpRepId} options={userOptions} loading={usersLoading} />

          <RepField label="Customer support representative" required userId={supportRepId} onChange={setSupportRepId} options={userOptions} loading={usersLoading} />
          <RepField label="Sales representative signing contract" required userId={signatureRepId} onChange={setSignatureRepId} options={userOptions} loading={usersLoading} />

          <Field label="Date" required>
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
              <button type="button" onClick={() => setDate(today)} className="shrink-0 rounded-md border border-input-border px-3 py-2 text-sm text-text-muted hover:bg-surface-hover">
                Now
              </button>
            </div>
          </Field>
          <Field label="Project">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
              <option value="">{projectsLoading ? 'Loading…' : 'Select a project'}</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.ref})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note (public)">
            <input type="text" value={notePublic} onChange={(e) => setNotePublic(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Note (private)">
            <input type="text" value={notePrivate} onChange={(e) => setNotePrivate(e.target.value)} className={inputClasses} />
          </Field>
        </div>
      </Card>

      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
