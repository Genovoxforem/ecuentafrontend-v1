import { useMemo, useState } from 'react'
import { Landmark } from 'lucide-react'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { mapBankEntriesReport, mapBankSummary, useBankChoices, useBankReportEntries } from '../bankReports.data'
import { isoDate } from '../reportFormat'
import { inputCls, RangeBar, ReportError } from './ReportWidgets'

// "Account Transactions" (classic compta/resultat/bankentries_list.php) and "Bank Summary" (compta/bank/bankentries_list_rep.php) of the
// Reports Center, both from compta/bank/fapi/entries.php (see bankReports.data.ts). The classic pages open on today and print an empty table.

function Heading({ title }: { title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
      <Landmark size={20} className="text-brand" /> {title}
    </h2>
  )
}

// Account Transactions: a period and one bank ("Select Bank"); nothing is read until a bank is chosen, as the classic page prints nothing then.
export function BankEntriesReportView() {
  const today = isoDate(new Date())
  const [bank, setBank] = useState('')
  const [applied, setApplied] = useState({ start: today, end: today, bank: '' })
  const choices = useBankChoices()
  const accountId = Number(applied.bank) || undefined
  const q = useBankReportEntries(applied.start, applied.end, accountId, accountId !== undefined)
  const currency = choices.data?.find((a) => a.id === accountId)?.currency ?? ''
  const table = useMemo(() => mapBankEntriesReport(q.data ?? [], currency || 'ZMW'), [q.data, currency])

  return (
    <div className="space-y-4">
      <Heading title="Bank Entries" />
      <RangeBar key={`${applied.start}|${applied.end}`} start={applied.start} end={applied.end} label="Report period" buttonLabel="View Details" onApply={(start, end) => setApplied({ start, end, bank })}>
        <label className="text-sm font-medium text-text">
          <span className="mb-1 block">Bank Lists</span>
          <select value={bank} onChange={(e) => setBank(e.target.value)} className={`${inputCls} min-w-56`} aria-label="Bank Lists">
            <option value="">Select Bank</option>
            {(choices.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.ref}
              </option>
            ))}
          </select>
        </label>
      </RangeBar>
      <div className="text-center">
        <p className="text-base font-bold uppercase tracking-wide text-text!">Bank Entries Report</p>
        <p className="text-sm text-text-muted">
          For the Period from {applied.start} to {applied.end}
        </p>
      </div>
      {q.isLoading && accountId !== undefined && <LegacyLoadingCard label="Loading the bank entries…" />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {!q.isLoading && !q.isError && <LegacyReportTable title="Bank Entries" table={table} />}
    </div>
  )
}

// Bank Summary: the lines of every bank account in the period.
export function BankSummaryReportView() {
  const today = isoDate(new Date())
  const [applied, setApplied] = useState({ start: today, end: today })
  const q = useBankReportEntries(applied.start, applied.end, undefined, true)
  const table = useMemo(() => mapBankSummary(q.data ?? []), [q.data])

  return (
    <div className="space-y-4">
      <Heading title="Bank Summary" />
      <RangeBar key={`${applied.start}|${applied.end}`} start={applied.start} end={applied.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setApplied({ start, end })} />
      <div className="text-center">
        <p className="text-base font-bold uppercase tracking-wide text-text!">Bank Summary</p>
        <p className="text-sm text-text-muted">
          For the period of {applied.start} To {applied.end}
        </p>
      </div>
      {q.isLoading && <LegacyLoadingCard label="Loading the bank summary…" />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {!q.isLoading && !q.isError && <LegacyReportTable title="Bank Summary" table={table} />}
    </div>
  )
}
