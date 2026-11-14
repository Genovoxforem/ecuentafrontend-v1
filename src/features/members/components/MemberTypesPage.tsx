import { useState } from 'react'
import { Plus } from 'lucide-react'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { MEMBER_PAGES, useMemberTables } from '../membersClassic.data'
import { EMPTY_MEMBER_TYPE, MEMBER_TYPE_NATURES, MEMBER_TYPE_UNITS, useCreateMemberType, type MemberTypeInput } from '../memberForms.data'

// The blank last column of the classic table holds its edit pencil; the app has no edit for it.
const HIDDEN_COLUMNS = ['']

// adherents/type.php — "Members types": the list, and the classic "New member type" form (adherents/type.php?action=create) as a panel.
export function MemberTypesPage() {
  const { data, isLoading, isError, error, refetch } = useMemberTables(MEMBER_PAGES.types)
  const create = useCreateMemberType()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<MemberTypeInput>(EMPTY_MEMBER_TYPE)
  const set = <K extends keyof MemberTypeInput>(k: K, v: MemberTypeInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const table = data?.[0]

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    create.mutate(form, {
      onSuccess: () => {
        setForm(EMPTY_MEMBER_TYPE)
        setOpen(false)
      },
    })
  }

  return (
    <div className="space-y-4">
      <InBanner>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={14} /> New member type
        </button>
      </InBanner>

      {open && (
        <Card className="!h-auto">
          <form onSubmit={submit} className="space-y-4">
            <h3 className="text-sm font-semibold text-text!">New member type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Label" required>
                <input className={inputClasses} value={form.label} onChange={(e) => set('label', e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputClasses} value={form.status} onChange={(e) => set('status', e.target.value as MemberTypeInput['status'])}>
                  <option value="0">Closed</option>
                  <option value="1">Open</option>
                </select>
              </Field>
              <Field label="Nature of members">
                <select className={inputClasses} value={form.morphy} onChange={(e) => set('morphy', e.target.value as MemberTypeInput['morphy'])}>
                  {MEMBER_TYPE_NATURES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Subscription required">
                <select className={inputClasses} value={form.subscription} onChange={(e) => set('subscription', e.target.value as MemberTypeInput['subscription'])}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </Field>
              <Field label="Vote allowed">
                <select className={inputClasses} value={form.vote} onChange={(e) => set('vote', e.target.value as MemberTypeInput['vote'])}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </Field>
              <Field label="Duration">
                <div className="flex gap-2">
                  <input className={inputClasses} inputMode="numeric" value={form.durationValue} onChange={(e) => set('durationValue', e.target.value)} />
                  <select className={inputClasses} value={form.durationUnit} onChange={(e) => set('durationUnit', e.target.value)}>
                    {MEMBER_TYPE_UNITS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label="Description">
                <textarea className={inputClasses} rows={3} value={form.comment} onChange={(e) => set('comment', e.target.value)} />
              </Field>
              <Field label="Welcome email">
                <textarea className={inputClasses} rows={3} value={form.mailValid} onChange={(e) => set('mailValid', e.target.value)} />
              </Field>
            </div>
            {create.isError && <p className="text-sm text-danger whitespace-pre-line">{create.error instanceof Error ? create.error.message : 'The member type was not saved.'}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={create.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                {create.isPending ? 'Saving…' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  create.reset()
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {isLoading && <LegacyLoadingCard label="Loading member types…" />}
      {isError && <LegacyErrorCard title="Couldn't load member types" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && !table && <LegacyErrorCard title="Couldn't read the member types" message="The backend page has no members types table." onRetry={() => refetch()} />}
      {table && <LegacyReportTable title="Members types" table={table} hiddenColumns={HIDDEN_COLUMNS} />}
    </div>
  )
}
