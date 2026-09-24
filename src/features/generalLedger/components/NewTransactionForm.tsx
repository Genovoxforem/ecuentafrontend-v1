import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilePlus, LoaderCircle, Plus, CalendarClock, Rows3, ArrowLeft, Calendar, Lightbulb, BookOpen } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useCreateTransactionContext, useCreateTransaction } from '../generalLedger.queries'
import { ROUTES } from '../../../routes'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30'
const disabledInputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint px-3 py-2 cursor-not-allowed'

function todayParts() {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear())
  return { day, month, year, display: `${month}/${day}/${year}` }
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
  'Add one or more movement lines to record debits and credits.',
  'Ensure total debit equals total credit.',
  'Fill in a clear description for better tracking.',
]

// accountancy/bookkeeping/card.php?action=create — confirmed real (creates a
// llx_accounting_bookkeeping journal entry). The real form is a single
// one-shot POST: the header (Date/Journal/Accounting Doc.) and exactly one
// movement line (Account/Subledger Account/Subledger Account Label/Label
// Operation/Currency/Exchange Rate/Debit/Credit) are submitted together,
// action=confirm_create, to card.php?piece_num=<next_num_mvt> — a piece
// number the backend hands out just by rendering the create page itself
// (see generalLedger.queries.ts's useCreateTransactionContext/
// useCreateTransaction for the real field names, scraped and verified
// directly from that page's own markup). No JSON create endpoint exists
// anywhere in this module — this genuinely persists to the real backend the
// same way submitting the real form does.
export function NewTransactionForm() {
  const navigate = useNavigate()
  const context = useCreateTransactionContext()
  const createTransaction = useCreateTransaction()

  const [date, setDate] = useState(todayParts())
  const [journal, setJournal] = useState('')
  const [docRef, setDocRef] = useState('')
  const [account, setAccount] = useState('')
  const [subledgerAccount, setSubledgerAccount] = useState('')
  const [subledgerLabel, setSubledgerLabel] = useState('')
  const [labelOperation, setLabelOperation] = useState('')
  const [currency, setCurrency] = useState('')
  const [exchangeRate, setExchangeRate] = useState('1.00')
  const [debit, setDebit] = useState('0.00')
  const [credit, setCredit] = useState('0.00')

  const data = context.data
  const selectedJournal = journal || data?.journalOptions[0]?.code || ''
  const selectedCurrency = currency || data?.currencyOptions[0]?.code || ''

  function submit() {
    if (!data?.token || !data.nextNumMvt || !account) return
    createTransaction.mutate(
      {
        token: data.token,
        nextNumMvt: data.nextNumMvt,
        fields: {
          doc_date: date.display,
          doc_dateday: date.day,
          doc_datemonth: date.month,
          doc_dateyear: date.year,
          code_journal: selectedJournal,
          doc_ref: docRef,
          accountingaccount_number: account,
          subledger_account: subledgerAccount,
          subledger_label: subledgerLabel,
          label_operation: labelOperation,
          multicurrency_code: selectedCurrency,
          currency_amo: exchangeRate,
          debit,
          credit,
        },
      },
      {
        onSuccess: (result) => navigate(ROUTES.ledgerPieceDetail.replace(':pieceNum', result.pieceNum)),
        // The real backend's own next_num_mvt hint can point at an already-
        // occupied piece_num (see useCreateTransaction's own comment) — on
        // that specific failure, refetch the create context so the next
        // "Add" click gets a fresh hint instead of colliding again.
        onError: () => context.refetch(),
      },
    )
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

      {context.isError && (
        <Card className="!bg-danger-bg border-danger/40">
          <p className="text-sm text-danger-fg">Couldn't load the real create form. {context.error instanceof Error ? context.error.message : 'Unknown error.'}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        <div className="lg:col-span-3 space-y-4">
          <Card className="!h-auto">
            <SectionIntro icon={CalendarClock} title="Transaction Details" subtitle="Enter the basic information for this journal entry" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date *">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
                    <input
                      type="text"
                      value={date.display}
                      onChange={(e) => {
                        const [mm, dd, yyyy] = e.target.value.split('/')
                        setDate({ day: dd ?? date.day, month: mm ?? date.month, year: yyyy ?? date.year, display: e.target.value })
                      }}
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                  <button type="button" onClick={() => setDate(todayParts())} className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-medium text-text hover:bg-surface-hover">
                    Now
                  </button>
                </div>
              </Field>
              <Field label="Journal *">
                {data ? (
                  <select value={selectedJournal} onChange={(e) => setJournal(e.target.value)} className={inputCls}>
                    {data.journalOptions.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-text-faint px-2 py-2">
                    <LoaderCircle size={13} className="animate-spin" /> Loading real journals…
                  </span>
                )}
              </Field>
              <Field label="Accounting Doc. *">
                <input type="text" placeholder="Enter accounting document number" value={docRef} onChange={(e) => setDocRef(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card className="!h-auto">
            <SectionIntro icon={Rows3} title="Add Movement Line" subtitle="Enter the accounting movement details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Account *">
                {data ? (
                  <select value={account} onChange={(e) => setAccount(e.target.value)} className={inputCls}>
                    <option value="">Select account</option>
                    {data.accountOptions.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-text-faint px-2 py-2">
                    <LoaderCircle size={13} className="animate-spin" /> Loading chart of accounts…
                  </span>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Subledger Account">
                  <input type="text" placeholder="Select subledger account" value={subledgerAccount} onChange={(e) => setSubledgerAccount(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Subledger Account Label">
                  <input type="text" placeholder="Enter subledger label" value={subledgerLabel} onChange={(e) => setSubledgerLabel(e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Label Operation">
                <input type="text" placeholder="Enter label/description" value={labelOperation} onChange={(e) => setLabelOperation(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Currency">
                {data ? (
                  <select value={selectedCurrency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                    {data.currencyOptions.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select disabled className={disabledInputCls}>
                    <option>Loading…</option>
                  </select>
                )}
              </Field>
              <Field label="Exchange Rate">
                <input type="text" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Debit (ZMW)">
                  <input type="text" value={debit} onChange={(e) => setDebit(e.target.value)} className={`${inputCls} text-right`} />
                </Field>
                <Field label="Credit (ZMW)">
                  <input type="text" value={credit} onChange={(e) => setCredit(e.target.value)} className={`${inputCls} text-right`} />
                </Field>
              </div>
            </div>

            {createTransaction.isError && (
              <p className="text-sm text-danger mt-3">{createTransaction.error instanceof Error ? createTransaction.error.message : 'Failed to create transaction.'}</p>
            )}

            <div className="mt-4">
              <button
                type="button"
                disabled={!data || !account || createTransaction.isPending}
                onClick={submit}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {createTransaction.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}
                {createTransaction.isPending ? 'Adding…' : 'Add Line'}
              </button>
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
