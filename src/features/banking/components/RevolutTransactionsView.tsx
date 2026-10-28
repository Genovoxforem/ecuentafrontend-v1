import { useState } from 'react'
import { Banknote, AlertTriangle, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useRevolutStatus } from '../bankConnectors.queries'

const COLUMNS = ['Transaction Id', 'Type', 'Status', 'Completed_at', 'Amount', 'Currency']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Native replacement for custom/revolut/revolutindex.php. The connector (custom/revolut/bank_sync.php) reads llx_bank_account columns
// (api_provider, api_enabled, ...) that no migration creates, so custom/revolut/fapi/sync.php answers 409 with the missing columns and the
// ALTER statement an operator must run: that answer is shown where the classic page prints its error line. The classic table (Transaction
// Id, Type, Status, completed_at, Amount, Currency) has no data source: sync.php returns the schema state, not transactions.
export function RevolutTransactionsView() {
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')
  const status = useRevolutStatus()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Banknote size={20} className="text-brand" /> Revolut Transaction Details
      </h2>

      {status.isLoading && <LegacyLoadingCard label="Checking the Revolut connector…" />}
      {status.isError && <LegacyErrorCard title="Couldn't reach the Revolut connector" message={status.error instanceof Error ? status.error.message : 'Unknown error.'} onRetry={() => status.refetch()} />}
      {status.data && !status.data.ready && (
        <Card className="!h-auto flex items-start gap-2 !bg-danger-bg border-danger/40">
          <AlertTriangle size={15} className="text-danger-fg mt-0.5 shrink-0" />
          <div className="space-y-1 text-xs text-danger-fg">
            <p>{status.data.message}</p>
            {status.data.missingColumns.length > 0 && <p>Missing columns of llx_bank_account: {status.data.missingColumns.join(', ')}</p>}
            {status.data.hints.map((h) => (
              <p key={h}>{h}</p>
            ))}
            {status.data.alterSql && <pre className="whitespace-pre-wrap break-all rounded bg-black/5 p-2 font-mono">{status.data.alterSql}</pre>}
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="relative w-48 ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
            />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <TheadRow>
              {COLUMNS.map((label) => (
                <Th key={label}>{label}</Th>
              ))}
            </TheadRow>
          </thead>
          <tbody>
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-4 text-center text-text-faint italic">
                No Data Available In Table
              </td>
            </tr>
          </tbody>
        </table>
        <div className="px-4 py-2.5 text-xs text-text-faint">Showing 0 to 0 of 0 entries</div>
      </Card>
    </div>
  )
}
