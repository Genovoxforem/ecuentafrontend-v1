import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, BadgeX, Landmark, Loader2, Pencil, Save, Trash2, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useLegacyForm, useSubmitLegacyForm } from '../legacyForm'
import { ACCOUNT_CARD_PATH, useAccountCard, useDeleteAccountCard } from '../accountCard.queries'

const inputCls = 'h-10 w-full rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'

// "Short label" -> "Short Label"
const titleCase = (text: string) => text.replace(/\b\w/g, (c) => c.toUpperCase())

// The backend's own "Accounting account - Card" (accountancy/admin/card.php): the account's rows,
// Modify (the page's edit form) and Delete.
export function AccountCardPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const card = useAccountCard(id)
  const form = useLegacyForm(ACCOUNT_CARD_PATH, 'update', { action: 'update', id })
  const submit = useSubmitLegacyForm(ACCOUNT_CARD_PATH)
  const remove = useDeleteAccountCard(id)

  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const formData = form.data
  const number = formData?.fields.account_number?.value ?? ''
  const label = card.data?.rows.find((r) => /^label$/i.test(r.label))?.value ?? ''

  const startEdit = () => {
    if (!formData) return
    setProblem(null)
    setNotice(null)
    setValues(Object.fromEntries(Object.values(formData.fields).map((f) => [f.name, f.value])))
    setEditing(true)
  }

  const save = () => {
    if (!formData) return
    setProblem(null)
    const required = formData.layout.filter((i) => i.kind === 'field' && i.required)
    const missing = required.find((i) => i.kind === 'field' && !(values[i.name] ?? '').trim())
    if (missing && missing.kind === 'field') return setProblem(`${missing.label} is required.`)
    submit.mutate(
      { body: new URLSearchParams({ ...formData.hidden, ...values }), expectRecord: false },
      {
        onSuccess: async () => {
          // The backend answers with a page, not a status: read the card again to be sure.
          const fresh = await card.refetch()
          const saved = fresh.data?.rows.find((r) => /^label$/i.test(r.label))?.value ?? ''
          if (saved.replace(/\s+/g, ' ').trim() !== (values.label ?? '').replace(/\s+/g, ' ').trim()) return setProblem('The backend did not save the change.')
          await form.refetch()
          setEditing(false)
          setNotice('Record saved.')
        },
        onError: (e) => setProblem(e instanceof Error ? e.message : 'The request was refused.'),
      },
    )
  }

  const doDelete = async () => {
    setProblem(null)
    setNotice(null)
    const ok = await confirm({ title: 'Delete account?', message: `Delete the accounting account ${number ? `${number} — ` : ''}${label}?`, warningMessage: 'The backend refuses when the account is still used.' })
    if (!ok) return
    remove.mutate(undefined, { onSuccess: () => navigate(ROUTES.ledgerChartOfAccounts), onError: (e) => setProblem(e instanceof Error ? e.message : 'The request was refused.') })
  }

  const enabled = /enabled/i.test(card.data?.status ?? '')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Landmark size={20} className="text-brand" /> Accounting Account{number ? ` - ${number}` : ''}
        </h2>
        <Link to={ROUTES.ledgerChartOfAccounts} className="text-sm font-medium text-brand hover:underline">
          Back To List
        </Link>
      </div>

      {card.isLoading && <LegacyLoadingCard label="Loading the account…" />}
      {card.isError && <LegacyErrorCard title="Couldn't load the account" message={card.error instanceof Error ? card.error.message : 'Unknown error.'} onRetry={() => card.refetch()} />}
      {notice && <div className="rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{notice}</div>}
      {problem && (
        <div role="alert" className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {problem}
        </div>
      )}

      {card.data && (
        <>
          <div className="border-b border-border">
            <span className="inline-block border-b-2 border-brand px-3 py-2 text-sm font-semibold uppercase text-brand">Accounting Account</span>
          </div>

          <Card className="!h-auto space-y-4">
            {card.data.status && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${enabled ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                {enabled ? <BadgeCheck size={14} /> : <BadgeX size={14} />} {card.data.status}
              </span>
            )}

            {editing && formData ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  save()
                }}
                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                {formData.layout.map((item) => {
                  if (item.kind !== 'field') return null
                  const field = formData.fields[item.name]
                  const value = values[item.name] ?? ''
                  const set = (v: string) => setValues((cur) => ({ ...cur, [item.name]: v }))
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <label className="text-xs font-medium text-text-faint">
                        {titleCase(item.label)}
                        {item.required && ' *'}
                      </label>
                      {field.tag === 'select' ? (
                        field.options.length > 15 ? (
                          <SearchableSelect value={value} onChange={set} options={field.options.filter((o) => o.label.trim() !== '' || o.value !== '')} placeholder="—" />
                        ) : (
                          <select value={value} onChange={(e) => set(e.target.value)} className={inputCls}>
                            {field.options.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label || '—'}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        <input value={value} onChange={(e) => set(e.target.value)} className={inputCls} />
                      )}
                    </div>
                  )
                })}
                <div className="flex items-end gap-2 md:col-span-2 xl:col-span-3">
                  <button type="submit" disabled={submit.isPending} className="flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
                    {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-text hover:bg-surface-hover">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="divide-y divide-border">
                {card.data.rows.map((r) => (
                  <div key={r.label} className="grid grid-cols-[minmax(9rem,16rem)_1fr] gap-4 py-2.5 text-sm">
                    <dt className="text-text-muted">{titleCase(r.label)}</dt>
                    <dd className="text-text!">{r.value || '—'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          {!editing && (
            <div className="flex items-center gap-3">
              <button type="button" disabled={!card.data.canModify || !formData} onClick={startEdit} title={card.data.canModify ? undefined : 'Not allowed'} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
                <Pencil size={14} /> Modify
              </button>
              <button type="button" disabled={!card.data.deleteHref || remove.isPending} onClick={doDelete} title={card.data.deleteHref ? undefined : 'Not allowed'} className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
