import { useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CreditCard, Download, Loader2, RefreshCw, BookCheck } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { StickyListLayout, ScrollCard, STICKY_THEAD, STICKY_TFOOT } from '../../../../shared/components/layout/StickyListLayout'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { useAccountingJournal, useWriteBookkeeping, downloadJournalCsv, type JournalConfig, type JournalFilters } from '../../accountingJournal.queries'
import type { JournalWarning } from '../../accountingJournalParser'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// MM/dd/yyyy (the real form's own format) <-> yyyy-MM-dd (native date input).
const toIso = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}
const toUs = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

// The setup page a warning points at (the bold "Accounting-Setup-<entry>" phrase), when there is a
// native one.
const SETUP_ROUTES: [RegExp, string][] = [
  [/bank accounts/i, ROUTES.ledgerBankAccountsSetup],
  [/default accounts/i, ROUTES.ledgerDefaultAccounts],
  [/fiscal ?period|fiscal year/i, ROUTES.ledgerFiscalPeriod],
  [/journals/i, ROUTES.ledgerAccountingJournals],
  [/chart of accounts/i, ROUTES.ledgerChartOfAccounts],
]

function WarningText({ warning }: { warning: JournalWarning }) {
  const to = warning.link ? SETUP_ROUTES.find(([re]) => re.test(warning.link))?.[1] : undefined
  const at = to ? warning.text.indexOf(warning.link) : -1
  if (!to || at < 0) return <span>{warning.text}</span>
  return (
    <span>
      {warning.text.slice(0, at)}
      <Link to={to} className="font-semibold underline">
        {warning.link}
      </Link>
      {warning.text.slice(at + warning.link.length)}
    </span>
  )
}

const amount = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const th = 'px-3 py-2.5 text-xs font-semibold text-text'

function initials(name: string): string {
  const cleaned = name.replace(/^\d+/, '')
  return (cleaned.slice(0, 2) || name.slice(0, 2)).toUpperCase()
}

// Shared screen for the four real per-type journal reports (Finance, Expense,
// Sell, Purchase — see accountingJournalParser.ts). Filters, the transaction
// table and both actions are real: Refresh re-queries the page, Export
// downloads the backend's CSV, and Register Transactions posts the real
// writebookkeeping action that moves these lines into the accounting ledger.
export function AccountingJournalPage({ config, icon: Icon }: { config: JournalConfig; icon: ComponentType<{ size?: number; className?: string }> }) {
  const [applied, setApplied] = useState<JournalFilters>({ dateStart: '', dateEnd: '', inBookkeeping: '' })
  const [draft, setDraft] = useState<JournalFilters | null>(null)
  const { data, isLoading, isFetching, isError, error, refetch } = useAccountingJournal(config, applied)
  const write = useWriteBookkeeping(config)
  const confirm = useConfirm()
  const [exporting, setExporting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading journal…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the journal" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const current: JournalFilters = { dateStart: data.dateStart, dateEnd: data.dateEnd, inBookkeeping: data.inBookkeeping }
  const form = draft ?? current
  const patch = (p: Partial<JournalFilters>) => setDraft({ ...form, ...p })
  // Actions run against what is currently listed (applied filters, falling
  // back to the page's own defaults before the first Refresh).
  const listed: JournalFilters = applied.dateStart ? applied : current
  const totals = data.rows.reduce((a, r) => ({ debit: a.debit + r.debit, credit: a.credit + r.credit }), { debit: 0, credit: 0 })
  const colCount = data.hasPaymentType ? 8 : 7

  const handleExport = async () => {
    setActionError(null)
    setExporting(true)
    try {
      await downloadJournalCsv(config, data.token, listed)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  const handleRegister = async () => {
    setActionError(null)
    const ok = await confirm({
      title: 'Register Transactions?',
      message: `Write all ${data.rows.length} listed transaction line(s) into the accounting ledger?`,
      warningTitle: 'This action cannot be undone from this screen.',
      warningMessage: 'Registered transactions move to the "Already transferred" list.',
      variant: 'default',
      confirmLabel: 'Register',
    })
    if (!ok) return
    try {
      await write.mutateAsync({ token: data.token, filters: listed })
      setDraft(null)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Registering transactions failed.')
    }
  }

  return (
    <StickyListLayout
      header={
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
                <Icon size={20} className="text-brand" /> {data.title}
              </h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-brand">Journalization</span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {actionError && <span className="mr-auto text-sm text-danger">{actionError}</span>}
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export Draft Journal
              </button>
              <button
                type="button"
                onClick={handleRegister}
                disabled={write.isPending || data.rows.length === 0}
                className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {write.isPending ? <Loader2 size={14} className="animate-spin" /> : <BookCheck size={14} />} Register Transactions In Accounting
              </button>
            </div>
          </div>

          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(9rem,0.7fr)_auto_minmax(20rem,1.5fr)_minmax(14rem,1fr)_auto] gap-4 p-3">
              <div>
                <p className="text-xs font-medium text-text-faint mb-1">Name</p>
                <p className="text-sm text-text">{data.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-faint mb-1">Report period</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" value={toIso(form.dateStart)} onChange={(e) => patch({ dateStart: toUs(e.target.value) })} className={`${inputCls} w-40`} />
                  <input type="date" value={toIso(form.dateEnd)} onChange={(e) => patch({ dateEnd: toUs(e.target.value) })} className={`${inputCls} w-40`} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-text-faint mb-1">Status of journalization</p>
                <select value={form.inBookkeeping} onChange={(e) => patch({ inBookkeeping: e.target.value })} className={`${inputCls} w-full`}>
                  {data.inBookkeepingOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-text-faint mb-1">Description</p>
                <p className="line-clamp-2 whitespace-pre-line text-sm text-text-muted" title={data.description}>
                  {data.description || '—'}
                </p>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setApplied(form)}
                  disabled={isFetching}
                  className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
                </button>
              </div>
            </div>
          </Card>
        </>
      }
    >
      <ScrollCard>
        {data.warnings.length > 0 && (
          <div className="space-y-2 p-3">
            {data.warnings.map((w) => (
              <div key={w.text} className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-bg/50 px-3.5 py-3 text-sm text-warning-fg">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <WarningText warning={w} />
              </div>
            ))}
          </div>
        )}
        <table className="w-full text-sm">
          <thead className={STICKY_THEAD}>
            <tr className="border-b border-border bg-surface">
              <th className={`${th} text-left whitespace-nowrap`}>Date</th>
              <th className={`${th} text-left`}>{data.docHeader}</th>
              <th className={`${th} text-left`}>Accounting Account</th>
              <th className={`${th} text-left`}>Subledger Account</th>
              <th className={`${th} text-left`}>Label Operation</th>
              {data.hasPaymentType && <th className={`${th} text-left`}>Payment Type</th>}
              <th className={`${th} text-right`}>Debit</th>
              <th className={`${th} text-right`}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-3 py-6 text-center text-text-faint italic">
                  No transactions for this period.
                </td>
              </tr>
            ) : (
              data.rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap text-text">{r.date}</td>
                  <td className="min-w-48 px-3 py-2 text-text">{r.doc}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-text">{r.account}</td>
                  <td className="max-w-52 break-words px-3 py-2 text-text">{r.subledger}</td>
                  <td className="min-w-56 px-3 py-2 text-text">
                    <span>
                      <CreditCard size={13} className="mr-1 inline text-brand align-[-2px]" /> {r.label}
                      {r.partyName && (
                        <>
                          {' '}
                          {r.partyId ? (
                            <Link to={ROUTES.customerDetail.replace(':id', r.partyId)} className="inline-flex items-center gap-1.5 align-middle text-brand hover:underline">
                              <span className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center">{initials(r.partyName)}</span>
                              {r.partyName}
                            </Link>
                          ) : (
                            r.partyName
                          )}
                        </>
                      )}
                    </span>
                  </td>
                  {data.hasPaymentType && <td className="px-3 py-2 whitespace-nowrap text-text">{r.paymentType}</td>}
                  <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums text-text!">{r.debitText}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums text-text!">{r.creditText}</td>
                </tr>
              ))
            )}
          </tbody>
          {data.rows.length > 0 && (
            <tfoot className={STICKY_TFOOT}>
              <tr className="border-t border-border font-semibold text-text!">
                <td colSpan={colCount - 2} className="px-3 py-2 text-right">
                  Total ({data.rows.length} lines)
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{amount(totals.debit)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{amount(totals.credit)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </ScrollCard>
    </StickyListLayout>
  )
}
