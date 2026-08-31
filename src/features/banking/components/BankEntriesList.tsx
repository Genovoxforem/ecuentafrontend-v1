import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { List, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useBankAccountsList, useBankEntriesList } from '../banking.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const PAGE_SIZE = 25
const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'

// Real via compta/bank/bankentries_list_ajax.php — confirmed genuine JSON
// DataTables API, actively wired into the live bankentries_list.php page
// (unlike bank-sidebar-list-ajax.php), with real permission checks
// (banque->lire / banque->modifier).
export function BankEntriesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: accounts } = useBankAccountsList()
  const [page, setPage] = useState(0)
  const accountParam = searchParams.get('account')
  const accountId = accountParam ? Number(accountParam) : undefined

  const { data, isLoading, isError, error, refetch } = useBankEntriesList(accountId, page, PAGE_SIZE)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <List size={20} className="text-brand" /> List Entries
      </h2>

      <div className="flex items-center gap-2">
        <label className="text-sm text-text-muted">Account</label>
        <select
          value={accountId ?? ''}
          onChange={(e) => {
            setPage(0)
            if (e.target.value) setSearchParams({ account: e.target.value })
            else setSearchParams({})
          }}
          className={selectCls}
        >
          <option value="">All accounts</option>
          {(accounts ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading entries…" />}
      {isError && <LegacyErrorCard title="Couldn't load entries" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Ref</th>
                  <th className="font-medium px-3 py-2">Description</th>
                  <th className="font-medium px-3 py-2">Date</th>
                  <th className="font-medium px-3 py-2">Value Date</th>
                  <th className="font-medium px-3 py-2">Type</th>
                  <th className="font-medium px-3 py-2">Third Party</th>
                  <th className="font-medium px-3 py-2">Account</th>
                  <th className="font-medium px-3 py-2 text-right">Debit</th>
                  <th className="font-medium px-3 py-2 text-right">Credit</th>
                  <th className="font-medium px-3 py-2 text-right">Balance</th>
                  <th className="font-medium px-3 py-2">Reconciled</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-4 text-text-faint italic">
                      No entries found.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{r.refLabel}</td>
                      <td className="px-3 py-2 text-text-muted">{r.description}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateOps}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateValue}</td>
                      <td className="px-3 py-2 text-text-muted">{r.paymentType}</td>
                      <td className="px-3 py-2 text-text-muted">{r.thirdParty || '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{r.bankAccount}</td>
                      <td className="px-3 py-2 text-right text-danger">{r.debit}</td>
                      <td className="px-3 py-2 text-right text-success-fg">{r.credit}</td>
                      <td className="px-3 py-2 text-right text-text!">{r.runningBalance}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.conciliated ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                          {r.conciliated ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>
              {data.filtered} entries{accountId ? ' for this account' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-md border border-border disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <span>Page {page + 1}</span>
              <button
                type="button"
                disabled={(page + 1) * PAGE_SIZE >= data.filtered}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-md border border-border disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
