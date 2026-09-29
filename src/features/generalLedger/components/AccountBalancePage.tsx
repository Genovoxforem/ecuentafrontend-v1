import { useState } from 'react'
import { Scale } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { LegacyListPage } from './LegacyListPage'

const dateCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// The page sends its date range as three fields per date (…day/…month/…year).
const splitDate = (prefix: string, iso: string): Record<string, string> => {
  const [y, m, d] = iso.split('-')
  return iso ? { [`${prefix}day`]: d, [`${prefix}month`]: m, [`${prefix}year`]: y } : {}
}
const fieldsToIso = (fields: Record<string, string>, prefix: string) => {
  const y = fields[`${prefix}year`]
  return y ? `${y}-${fields[`${prefix}month`]}-${fields[`${prefix}day`]}` : ''
}

// accountancy/bookkeeping/balance.php — the real account balance (debit / credit / balance per
// accounting account, with the totals row). The date range starts at whatever the backend
// defaults to (its current fiscal range) and can be changed. As on the backend page, the account
// and its debit and credit open that account's ledger (debit in red, credit in blue).
export function AccountBalancePage() {
  const [range, setRange] = useState<{ start?: string; end?: string }>({})

  const ledgerLink = (row: { text: string }[]): string | null => {
    const code = row[0]?.text.match(/^(\S+)\s+-/)?.[1] ?? row[0]?.text.match(/^\S+/)?.[0]
    if (!code) return null
    const params = new URLSearchParams({ accountCode: code })
    if (range.start) params.set('dateStart', range.start)
    if (range.end) params.set('dateEnd', range.end)
    return `${ROUTES.ledgerDashboard}?${params.toString()}`
  }

  return (
    <LegacyListPage
      icon={Scale}
      title="Account Balance"
      path="/accountancy/bookkeeping/balance.php"
      firstHeader={/^Accounting account/}
      fixedParams={{ ...splitDate('date_start', range.start ?? ''), ...splitDate('date_end', range.end ?? '') }}
      linkFor={(header, _cell, row) => {
        const to = ledgerLink(row)
        if (!to) return null
        if (/^debit$/i.test(header)) return { to, className: 'text-danger' }
        if (/^credit$/i.test(header)) return { to, className: 'text-brand' }
        return /^accounting account/i.test(header) ? to : null
      }}
      toolbar={(table) => (
        <>
          <label className="flex items-center gap-1.5 text-sm text-text-muted">
            Start date
            <input
              type="date"
              value={range.start ?? fieldsToIso(table.fields, 'date_start')}
              onChange={(e) => setRange((r) => ({ ...r, start: e.target.value, end: r.end ?? fieldsToIso(table.fields, 'date_end') }))}
              className={dateCls}
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-text-muted">
            End date
            <input
              type="date"
              value={range.end ?? fieldsToIso(table.fields, 'date_end')}
              onChange={(e) => setRange((r) => ({ ...r, end: e.target.value, start: r.start ?? fieldsToIso(table.fields, 'date_start') }))}
              className={dateCls}
            />
          </label>
        </>
      )}
    />
  )
}
