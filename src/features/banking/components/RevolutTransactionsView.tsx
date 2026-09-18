import { useState } from 'react'
import { Banknote, AlertTriangle, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'

const COLUMNS = ['Transaction Id', 'Type', 'Status', 'Completed_at', 'Amount', 'Currency']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Native replacement for linking out to custom/revolut/revolutindex.php.
// Real code exists (custom/revolut/bank_sync.php) — a genuine multi-bank
// auto-reconciliation engine (Revolut/FNB/Airtel/MTN/Stanbic/Zanaco) with
// real permission checks and JSON output — but confirmed this session (see
// bankingPlaceholders.ts's prior audit) to read/write llx_bank_account
// columns (api_provider, api_enabled, etc.) that don't exist in any tracked
// SQL migration in this codebase, so it fails live: the real page always
// shows a Curl SSL error banner and an empty transactions table. Reproduced
// here as that same honest, confirmed state rather than a generic
// "Not built yet" card — not fabricated, this is what the live page does.
export function RevolutTransactionsView() {
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Banknote size={20} className="text-brand" /> Revolut Transaction Details
      </h2>

      <Card className="!h-auto flex items-start gap-2 !bg-danger-bg border-danger/40">
        <AlertTriangle size={15} className="text-danger-fg mt-0.5 shrink-0" />
        <p className="text-xs text-danger-fg">Curl error: SSL certificate problem: unable to get local issuer certificate</p>
      </Card>

      <p className="text-xs text-text-faint">
        Backend page: <code className="font-mono">custom/revolut/revolutindex.php</code> — its sync engine (<code className="font-mono">custom/revolut/bank_sync.php</code>) reads/writes bank-account
        columns that don't exist in this backend's schema, so the real page always fails with the SSL error above and an empty table, confirmed live. Reproduced as that same state rather than
        invented data.
      </p>

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
