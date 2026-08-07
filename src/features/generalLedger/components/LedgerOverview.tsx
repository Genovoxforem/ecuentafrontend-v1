import { useState } from 'react'
import { FileText, ChevronLeft, ChevronRight, Calendar, Landmark, CalendarClock, Scale, Trash2, TriangleAlert, Plus, X } from 'lucide-react'
import { Card, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { useRecordDemoLedgerEntry, type LedgerMovement, type LedgerSummary } from '../generalLedger.queries'
import { todayIso } from '../../../shared/localCollection'

const COLUMNS = ['Num. Transaction', 'Journal', 'Date', 'Accounting Doc.', 'Label', 'Currency Code', 'Debit', 'Credit']
const JOURNALS = ['VT — Sales', 'AC — Purchases', 'BK — Bank', 'OD — Miscellaneous']

function MovementRow({ icon: Icon, label, movement }: { icon: typeof CalendarClock; label: string; movement: LedgerMovement }) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-1 py-3 border-b border-border last:border-0">
      <span className="flex items-center gap-2 text-text-muted min-w-48">
        <Icon size={15} /> {label}
      </span>
      <span className="text-text-muted text-sm">
        Debit: <span className="text-text!">{fmtZMW(movement.debit)}</span>
      </span>
      <span className="text-text-muted text-sm">
        Credit: <span className="text-text!">{fmtZMW(movement.credit)}</span>
      </span>
      <span className="ml-auto font-semibold text-success">
        {fmtZMW(movement.balance)} {movement.balanceSide}
      </span>
    </div>
  )
}

function DemoModeBanner() {
  return (
    <Card className="!bg-warning-bg border-warning/40 flex items-start gap-3">
      <TriangleAlert size={18} className="text-warning-fg shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-warning-fg">Demo mode — not real accounting data</p>
        <p className="text-xs text-warning-fg/80 mt-0.5">
          This app's backend has no bookkeeping endpoint. Entries you record below exist only in this browser tab (never sent anywhere, gone on refresh) so you can see what
          the report looks like with data in it — they are not a real ledger.
        </p>
      </div>
    </Card>
  )
}

function RecordEntryForm({ onClose }: { onClose: () => void }) {
  const recordEntry = useRecordDemoLedgerEntry()
  const [journal, setJournal] = useState(JOURNALS[0])
  const [date, setDate] = useState(todayIso())
  const [accountingDoc, setAccountingDoc] = useState('')
  const [label, setLabel] = useState('')
  const [debit, setDebit] = useState(0)
  const [credit, setCredit] = useState(0)
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!label.trim()) {
      setError('Label is required.')
      return
    }
    if ((debit > 0) === (credit > 0)) {
      setError('Enter an amount in exactly one of Debit or Credit.')
      return
    }
    recordEntry({ journal, date, accountingDoc, label, debit, credit })
    onClose()
  }

  return (
    <Card className="border-brand/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">Record Demo Journal Entry</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Journal</span>
          <select value={journal} onChange={(e) => setJournal(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2">
            {JOURNALS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Accounting Doc.</span>
          <input type="text" value={accountingDoc} onChange={(e) => setAccountingDoc(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm text-text">Label</span>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
        <div />
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Debit</span>
          <input type="number" min={0} step="0.01" value={debit} onChange={(e) => setDebit(Number(e.target.value))} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Credit</span>
          <input type="number" min={0} step="0.01" value={credit} onChange={(e) => setCredit(Number(e.target.value))} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
      </div>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <div className="flex justify-end mt-3">
        <button type="button" onClick={handleSubmit} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add demo entry
        </button>
      </div>
    </Card>
  )
}

export function LedgerOverview({ summary }: { summary: LedgerSummary }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-4">
      <DemoModeBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileText size={20} className="text-brand" /> Operations - View By Accounting Account (Ledger)
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> Record Demo Entry
          </button>
          <div className="flex items-center gap-1">
            <button type="button" disabled title="Not built yet" className="p-1.5 rounded-md border border-border text-text-faint cursor-default">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 rounded-md border border-border text-sm font-medium text-text!">Year {summary.year}</span>
            <button type="button" disabled title="Not built yet" className="p-1.5 rounded-md border border-border text-text-faint cursor-default">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showForm && <RecordEntryForm onClose={() => setShowForm(false)} />}

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> Select By Date
            </span>
            <input type="date" disabled defaultValue={`${summary.year}-12-31`} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            <span>Select By Account</span>
            <select disabled defaultValue="" className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 min-w-48">
              <option value="">All Accounting Accounts</option>
            </select>
          </label>
        </div>

        <div className="overflow-auto max-h-[60vh] mt-4">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {COLUMNS.map((col) => (
                  <th key={col} className="font-medium px-3 py-2 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.entries.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No accounting entries yet.
                  </td>
                </tr>
              ) : (
                summary.entries.map((entry) => (
                  <tr key={entry.transactionNum} className="border-b border-border">
                    <td className="px-3 py-2 text-brand">{entry.transactionNum}</td>
                    <td className="px-3 py-2 text-text-muted">{entry.journal}</td>
                    <td className="px-3 py-2 text-text-muted">{entry.date}</td>
                    <td className="px-3 py-2 text-text-muted">{entry.accountingDoc || '-'}</td>
                    <td className="px-3 py-2 text-text!">{entry.label}</td>
                    <td className="px-3 py-2 text-text-muted">{entry.currencyCode}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.debit > 0 ? fmtZMW(entry.debit) : '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text!">{entry.credit > 0 ? fmtZMW(entry.credit) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="flex items-center gap-2 font-semibold text-text! mb-2">
          <Landmark size={16} className="text-text-muted" /> Account Summary
        </h3>
        <MovementRow icon={CalendarClock} label="Period Movements" movement={summary.periodMovements} />
        <MovementRow icon={Scale} label="Closing Balance" movement={summary.closingBalance} />
      </Card>

      <button
        type="button"
        disabled
        title="Not built yet"
        className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white opacity-60 cursor-default"
      >
        <Trash2 size={14} /> Delete Some Operation Lines From Accounting
      </button>
    </div>
  )
}
