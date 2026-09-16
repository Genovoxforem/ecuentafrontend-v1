import { useMemo, useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { Card, fmtZMW } from '../../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../../shared/components/ListPagination'
import { useBankAccountsList } from '../../../banking/banking.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// compta/bank/list.php shows this exact same real llx_bank_account data —
// reusing Banking's own already-real useBankAccountsList (bank-sidebar-list-ajax.php,
// genuine JSON) instead of re-scraping it. That endpoint only carries
// Label/Account Number/Currency/Balance, not every column the legacy list
// page itself renders (Type, Account Accounting, Journal, To Reconcile,
// Date Creation, Status) — noted below rather than fabricated.
export function BankAccountsSetupList() {
  const { data: rows, isLoading, isError, error, refetch } = useBankAccountsList()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const filteredRows = useMemo(() => {
    const all = rows ?? []
    const q = search.trim().toLowerCase()
    return q ? all.filter((r) => r.label.toLowerCase().includes(q) || r.accountNumber.toLowerCase().includes(q)) : all
  }, [rows, search])
  const pageRows = filteredRows.slice((page - 1) * perPage, page * perPage)

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Building2 size={20} className="text-brand" /> Bank Accounts
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4">
        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search"
              className={`w-64 ${inputCls}`}
            />
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="ml-auto text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Bank Account</th>
                  <th className="font-medium px-3 py-2">Account Number</th>
                  <th className="font-medium px-3 py-2">Currency</th>
                  <th className="font-medium px-3 py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin" /> Loading…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-danger">
                      {error instanceof Error ? error.message : "Couldn't load bank accounts."}{' '}
                      <button type="button" onClick={() => refetch()} className="underline">
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{r.label}</td>
                      <td className="px-3 py-2 text-text-muted">{r.accountNumber || '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{r.currencyCode}</td>
                      <td className="px-3 py-2 text-text-muted tabular-nums">{fmtZMW(r.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
