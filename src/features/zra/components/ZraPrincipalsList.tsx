import { useState } from 'react'
import { Users } from 'lucide-react'
import { useZraPrincipals } from '../zra.queries'
import { ListHeader, TableShell, EmptyRow } from './ZraListChrome'

const dash = (v: string | number | null | undefined) => (v === '' || v === null || v === undefined ? '-' : v)

// Real "RVAT transactions" / Principals page (custom/zra/rvat_agent.php) —
// live call to the real ZRA gateway's /trnsSales/selectPrincipals endpoint
// on every "Fetch Details" click — see zra.queries.ts's useZraPrincipals.
// An empty search (matching the real page's own default) commonly comes
// back as a real "001-There is no search result" response from ZRA itself.
export function ZraPrincipalsList() {
  const [lastReqDtInput, setLastReqDtInput] = useState('')
  const [lastReqDt, setLastReqDt] = useState<string | undefined>(undefined)

  const { data, isLoading, isError, error } = useZraPrincipals(lastReqDt)
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <ListHeader icon={<Users size={20} className="text-brand" />} title="RVAT transactions" count={items.length} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text-muted">Last Request Date</span>
          <input
            type="text"
            value={lastReqDtInput}
            onChange={(e) => setLastReqDtInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setLastReqDt(lastReqDtInput.trim() || undefined)}
            className="h-10 w-64 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <button
          type="button"
          onClick={() => setLastReqDt(lastReqDtInput.trim() || undefined)}
          className="h-10 px-4 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90"
        >
          Fetch Details
        </button>
      </div>

      {data?.resultMessage && (
        <p className={`text-sm ${data.resultCode === '000' ? 'text-text-faint' : 'text-warning-fg'}`}>
          {data.resultCode}-{data.resultMessage}
        </p>
      )}

      <TableShell>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-alt">
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-3 py-3">Id</th>
              <th className="font-medium px-3 py-3">Tpin</th>
              <th className="font-medium px-3 py-3">Tin</th>
              <th className="font-medium px-3 py-3">Name</th>
              <th className="font-medium px-3 py-3">Address</th>
              <th className="font-medium px-3 py-3">Email</th>
              <th className="font-medium px-3 py-3">Telephone No</th>
              <th className="font-medium px-3 py-3">Register Date</th>
              <th className="font-medium px-3 py-3">Modify Date</th>
              <th className="font-medium px-3 py-3">AccountNo</th>
            </tr>
          </thead>
          <tbody>
            <EmptyRow
              colSpan={10}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={items.length === 0}
              emptyLabel="No data available."
              feature="RVAT transactions"
            />
            {items.map((item, i) => (
              <tr key={`${item.id}-${i}`} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3 text-text-muted">{dash(item.id)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.tpin)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.tin)}</td>
                <td className="px-3 py-3 text-text! font-medium">{dash(item.name)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.address)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.email)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.telephone)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.registerDate)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.modifyDate)}</td>
                <td className="px-3 py-3 text-text-muted">{dash(item.accountNo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  )
}
