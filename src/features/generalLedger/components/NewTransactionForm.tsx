import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilePlus, LoaderCircle, Plus, CalendarClock, Rows3, ArrowLeft, Lightbulb, BookOpen, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { blankLine, checkTransaction, totalsOf, useCreateFormOptions, useCreateTransactionFapi, type NewLine } from '../createTransactionFapi'
import { pieceRoute } from '../pieceCard.queries'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function SectionIntro({ icon: Icon, title, subtitle }: { icon: typeof CalendarClock; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-brand/10 text-brand">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-sm font-semibold text-text!">{title}</p>
        <p className="text-xs text-text-faint">{subtitle}</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-faint mb-1">{label}</label>
      {children}
    </div>
  )
}

const TIPS = [
  'Select the appropriate journal for this transaction.',
  'Add the movement lines: each line is a debit or a credit, never both.',
  'Total debit must equal total credit before the transaction can be saved.',
  'Fill in a clear description for better tracking.',
]

// accountancy/fapi/create.php — records one balanced transaction (date, journal, accounting doc. and its lines) in a single save. The
// dropdowns come from create.php?action=form_options and the chart of accounts; see createTransactionFapi.ts.
export function NewTransactionForm() {
  const navigate = useNavigate()
  const options = useCreateFormOptions()
  const create = useCreateTransactionFapi()

  const [date, setDate] = useState(today())
  const [journal, setJournal] = useState('')
  const [docRef, setDocRef] = useState('')
  const [lines, setLines] = useState<NewLine[]>([blankLine(), blankLine()])
  const [problem, setProblem] = useState<string | null>(null)

  const data = options.data
  const selectedJournal = journal || data?.journals[0]?.value || ''
  const totals = totalsOf(lines)
  const setLine = (i: number, patch: Partial<NewLine>) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)))

  function submit() {
    const bad = checkTransaction({ date, journal: selectedJournal, lines })
    setProblem(bad)
    if (bad) return
    create.mutate({ date, journal: selectedJournal, docRef, lines }, { onSuccess: (pieceNum) => navigate(pieceRoute(pieceNum)) })
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b2138] via-[#123253] to-brand p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />
        <BookOpen size={168} className="pointer-events-none absolute -right-6 -bottom-10 text-white/[0.06] rotate-[-8deg]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="shrink-0 w-12 h-12 rounded-xl grid place-items-center bg-white/15 text-white backdrop-blur-sm">
              <FilePlus size={22} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">Create New Transaction</h2>
              <p className="text-sm text-white/70 mt-0.5">Record a new journal entry in the general ledger</p>
            </div>
          </div>
          <Link
            to={ROUTES.ledgerDashboard}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors"
          >
            <ArrowLeft size={14} /> Back to Ledger
          </Link>
        </div>
      </div>

      {options.isError && (
        <Card className="!bg-danger-bg border-danger/40">
          <p className="text-sm text-danger-fg">Couldn't load the form choices. {options.error instanceof Error ? options.error.message : 'Unknown error.'}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        <div className="lg:col-span-3 space-y-4">
          <Card className="!h-auto">
            <SectionIntro icon={CalendarClock} title="Transaction Details" subtitle="Enter the basic information for this journal entry" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date *">
                <div className="flex gap-2">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                  <button type="button" onClick={() => setDate(today())} className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-medium text-text hover:bg-surface-hover">
                    Now
                  </button>
                </div>
              </Field>
              <Field label="Journal *">
                {data ? (
                  <select value={selectedJournal} onChange={(e) => setJournal(e.target.value)} className={inputCls}>
                    {data.journals.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-text-faint px-2 py-2">
                    <LoaderCircle size={13} className="animate-spin" /> Loading journals…
                  </span>
                )}
              </Field>
              <Field label="Accounting Doc.">
                <input type="text" placeholder="Enter accounting document number" value={docRef} onChange={(e) => setDocRef(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card className="!h-auto">
            <SectionIntro icon={Rows3} title="Movement Lines" subtitle="Each line is a debit or a credit; the totals must match" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint">
                    <th className="px-1 pb-2 font-medium">Account *</th>
                    <th className="px-1 pb-2 font-medium">Subledger account</th>
                    <th className="px-1 pb-2 font-medium">Label</th>
                    <th className="px-1 pb-2 font-medium text-right">Debit</th>
                    <th className="px-1 pb-2 font-medium text-right">Credit</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="align-top">
                      <td className="min-w-56 px-1 py-1">
                        <SearchableSelect value={l.account} onChange={(account) => setLine(i, { account })} options={data?.accounts ?? []} placeholder="Select account" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="text" value={l.subledger} onChange={(e) => setLine(i, { subledger: e.target.value })} className={inputCls} />
                      </td>
                      <td className="px-1 py-1">
                        <input type="text" value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} className={inputCls} />
                      </td>
                      <td className="w-32 px-1 py-1">
                        <input type="text" inputMode="decimal" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value })} className={`${inputCls} text-right`} />
                      </td>
                      <td className="w-32 px-1 py-1">
                        <input type="text" inputMode="decimal" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value })} className={`${inputCls} text-right`} />
                      </td>
                      <td className="px-1 py-1">
                        <button
                          type="button"
                          title="Remove line"
                          aria-label={`Remove line ${i + 1}`}
                          disabled={lines.length <= 1}
                          onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}
                          className="grid h-9 w-8 place-items-center rounded-md text-text-faint hover:text-danger disabled:opacity-30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold text-text!">
                    <td colSpan={3} className="px-1 pt-3 text-right">
                      Total
                    </td>
                    <td className="px-1 pt-3 text-right tabular-nums">{formatMoney(totals.debit)}</td>
                    <td className="px-1 pt-3 text-right tabular-nums">{formatMoney(totals.credit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {(problem || create.isError) && <p className="text-sm text-danger mt-3">{problem ?? (create.error instanceof Error ? create.error.message : 'Failed to create the transaction.')}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setLines((ls) => [...ls, blankLine()])} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-surface-hover">
                <Plus size={14} /> Add Line
              </button>
              <button
                type="button"
                disabled={!data || create.isPending}
                onClick={submit}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {create.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <FilePlus size={14} />}
                {create.isPending ? 'Saving…' : 'Create Transaction'}
              </button>
              {!totals.balanced && totals.debit + totals.credit > 0 && <span className="text-xs text-text-faint">Out of balance by {formatMoney(Math.abs(totals.debit - totals.credit))}</span>}
            </div>
          </Card>
        </div>

        <Card className="!h-auto bg-brand/5 border-brand/15">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-brand" />
            <p className="text-sm font-semibold text-text!">Tips</p>
          </div>
          <ul className="space-y-2.5">
            {TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-xs text-text-muted">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-brand shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
