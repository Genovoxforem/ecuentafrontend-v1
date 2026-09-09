import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, X, Plus, Printer, Landmark, ChevronLeft } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { useBankAccountsList, useBankAccountsDropdown, useBankEntriesList, parseAmount, type BankEntryRow } from '../banking.queries'
import { BankEntriesList } from './BankEntriesList'
import { BankMonthlyReportingTab } from './BankMonthlyReportingTab'
import { BankGraphicsTab } from './BankGraphicsTab'
import { BankAccountStatementsTab } from './BankAccountStatementsTab'
import { BankLinkedFilesTab } from './BankLinkedFilesTab'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'

const TABS = ['Bank Account', 'Bank Entries', 'Planned Entries', 'Monthly Reporting', 'Graphics', 'Account Statements', 'Linked Files'] as const
type TabKey = (typeof TABS)[number]

function todayMDY() {
  const now = new Date()
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`
}

function currencyName(code: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) ?? code
  } catch {
    return code
  }
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: 'credit' | 'debit' | 'balance' }) {
  const color = tone === 'credit' ? 'text-success-fg' : tone === 'debit' ? 'text-danger-fg' : 'text-brand'
  return (
    <div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-faint">{label}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 text-sm">
      <span className="text-text-muted w-48 shrink-0">{label}</span>
      <span className="text-text! flex-1 min-w-0">{value ?? '—'}</span>
    </div>
  )
}

// Real via bank-sidebar-list-ajax.php (account label/number/currency/balance)
// and bankentries_list_ajax.php (real transactions, fetched in bulk here to
// genuinely compute Today/Overall Credit/Debit and a real per-payment-type
// breakdown — not fabricated, but grouped by whatever paymentType strings
// this backend actually returns rather than forcing them into the real
// page's exact Cash/Other/Debit-order buckets, since that categorization
// rule isn't confirmed). compta/bank/card.php itself has no real JSON API
// (its 2 json_encode calls are just internal extraparams serialization, not
// a response) — so account-level fields it alone renders (Account Type,
// Can Be Reconciled, Min Balances, IBAN, BIC, Bank Address, Owner info,
// Tags/Categories, Comment, Accounting Account/Journal) have no confirmed
// source and show as honest "—".
export function BankAccountDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const accountId = id ? Number(id) : undefined
  const [tab, setTab] = useState<TabKey>('Bank Account')

  const { data: accounts, isLoading: accountsLoading, isError: accountsError, error: accountsErr, refetch: refetchAccounts } = useBankAccountsList()
  const { data: dropdownAccounts } = useBankAccountsDropdown()
  const { data: entriesData, isLoading: entriesLoading } = useBankEntriesList(accountId, 0, 2000)

  const account = accounts?.find((a) => a.id === accountId)

  const stats = useMemo(() => {
    const rows: BankEntryRow[] = entriesData?.rows ?? []
    const today = todayMDY()
    let todayCredit = 0
    let todayDebit = 0
    let overallCredit = 0
    let overallDebit = 0
    const byType = new Map<string, { credit: number; debit: number }>()

    for (const r of rows) {
      const credit = r.credit ? parseAmount(r.credit) : 0
      const debit = r.debit ? parseAmount(r.debit) : 0
      overallCredit += credit
      overallDebit += debit
      if (r.dateOps === today) {
        todayCredit += credit
        todayDebit += debit
      }
      const key = r.paymentType || 'Other'
      const bucket = byType.get(key) ?? { credit: 0, debit: 0 }
      bucket.credit += credit
      bucket.debit += debit
      byType.set(key, bucket)
    }

    return { todayCredit, todayDebit, overallCredit, overallDebit, byType: Array.from(byType.entries()) }
  }, [entriesData])

  if (accountsLoading) return <LegacyLoadingCard label="Loading bank account…" />
  if (accountsError || !accounts) return <LegacyErrorCard title="Couldn't load bank account" message={accountsErr instanceof Error ? accountsErr.message : 'Unknown error.'} onRetry={() => refetchAccounts()} />
  if (!account) return <LegacyErrorCard title="Bank account not found" message={`No bank account with id ${id}.`} onRetry={() => refetchAccounts()} />

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <Link to={ROUTES.bankingAccounts} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text" title="Back to list">
          <ChevronLeft size={18} /> Bank Accounts
        </Link>
        <Link to={ROUTES.bankingAccounts} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-border">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
                  <Landmark size={20} className="text-brand" /> Bank Management Details
                </h2>
                <p className="text-sm text-text-muted">View and manage bank accounts, transactions, reconciliations and reports</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={account.id}
                  onChange={(e) => navigate(ROUTES.bankingAccountDetail.replace(':id', e.target.value))}
                  className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.accountNumber || a.currencyCode})
                    </option>
                  ))}
                </select>
                <Link to={ROUTES.bankingNewAccount} title="New Financial Account" className="p-1.5 rounded-md bg-brand text-white hover:bg-brand-hover">
                  <Plus size={15} />
                </Link>
                <button type="button" onClick={() => window.print()} title="Print" className="p-1.5 rounded-md border border-border text-text-faint hover:bg-surface-hover hover:text-text">
                  <Printer size={15} />
                </button>
                <button type="button" disabled title="No real update API confirmed for this backend" className="p-1.5 rounded-md border border-border text-text-faint opacity-60 cursor-not-allowed">
                  <Pencil size={15} />
                </button>
                <Link to={ROUTES.bankingAccounts} className="p-1.5 rounded-md border border-border text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
                  <X size={15} />
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-3">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                    tab === t ? 'bg-brand text-white' : 'text-text-muted hover:text-text hover:bg-surface-hover'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
      {tab === 'Bank Account' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="!h-auto">
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Today</p>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Credit" value={`${formatMoney(stats.todayCredit)} ${account.currencyCode}`} tone="credit" />
                <StatBox label="Debit" value={`${formatMoney(stats.todayDebit)} ${account.currencyCode}`} tone="debit" />
                <StatBox label="Balance" value={`${formatMoney(stats.todayCredit - stats.todayDebit)} ${account.currencyCode}`} tone="balance" />
              </div>
            </Card>
            <Card className="!h-auto">
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Overall</p>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Credit" value={`${formatMoney(stats.overallCredit)} ${account.currencyCode}`} tone="credit" />
                <StatBox label="Debit" value={`${formatMoney(stats.overallDebit)} ${account.currencyCode}`} tone="debit" />
                <StatBox label="Balance" value={`${formatMoney(account.balance)} ${account.currencyCode}`} tone="balance" />
              </div>
            </Card>
          </div>

          <Card className="!h-auto">
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wide mb-2">Payment Types</p>
            {entriesLoading ? (
              <p className="text-sm text-text-faint italic">Loading…</p>
            ) : stats.byType.length === 0 ? (
              <p className="text-sm text-text-faint italic">No transactions to break down by type.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {stats.byType.map(([type, s]) => (
                  <div key={type}>
                    <p className="text-sm font-medium text-text!">
                      <span className="text-success-fg">C:{formatMoney(s.credit)}</span> / <span className="text-danger-fg">D:{formatMoney(s.debit)}</span> {account.currencyCode}
                    </p>
                    <p className="text-xs text-text-faint">{type}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="!h-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <InfoRow label="Account Type" value="—" />
                <InfoRow label="Currency" value={currencyName(account.currencyCode)} />
                <InfoRow label="Can Be Reconciled" value="—" />
                <InfoRow label="Minimum Allowed Balance" value="—" />
                <InfoRow label="Minimum Desired Balance" value="—" />
                <InfoRow label="Accounting Account" value="—" />
                <InfoRow label="Accounting Code Journal" value="—" />
              </div>
              <div>
                <InfoRow label="Tags/Categories" value="—" />
                <InfoRow label="Comment" value="—" />
                <InfoRow label="Bank Name" value={dropdownAccounts?.find((d) => d.id === account.id)?.bank || '—'} />
                <InfoRow label="Account Number" value={account.accountNumber || '—'} />
                <InfoRow label="IBAN Account Number" value="—" />
                <InfoRow label="BIC/SWIFT Code" value="—" />
                <InfoRow label="Bank Address" value="—" />
                <InfoRow label="Account Owner Name" value="—" />
                <InfoRow label="Account Owner Address" value="—" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'Bank Entries' && <BankEntriesList accountId={account.id} embedded />}

      {tab === 'Planned Entries' && (
        <Card className="!h-auto !p-0 overflow-hidden">
          <p className="text-xs text-text-faint italic px-4 pt-3">
            compta/bank/treso.php has no JSON API (zero json_encode in its source) — this treasury forecast is built server-side from draft invoices with no
            confirmed data source, so it's shown empty for layout reference only.
          </p>
          <div className="overflow-auto mt-3">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th>Due Date</Th>
                  <Th>Description</Th>
                  <Th>Environment</Th>
                  <Th>Third-Party</Th>
                  <Th align="right">Debit</Th>
                  <Th align="right">Credit</Th>
                  <Th align="right">Balance</Th>
                </TheadRow>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-text-faint italic">
                    No real API available on this backend.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'Monthly Reporting' && <BankMonthlyReportingTab entries={entriesData?.rows ?? []} account={account} />}

      {tab === 'Graphics' && <BankGraphicsTab entries={entriesData?.rows ?? []} account={account} />}

      {tab === 'Account Statements' && (
        <BankAccountStatementsTab entries={entriesData?.rows ?? []} currencyCode={account.currencyCode} onReconcile={() => setTab('Bank Entries')} />
      )}

      {tab === 'Linked Files' && <BankLinkedFilesTab accountId={account.id} />}
      </div>
    </div>
  )
}
