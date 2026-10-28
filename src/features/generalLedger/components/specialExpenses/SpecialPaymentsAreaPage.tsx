import { useState } from 'react'
import { ChevronLeft, ChevronRight, Wallet2 } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { formatMoney } from '../../../../utils/format'
import { useSpecialPaymentsArea } from '../../specialPaymentsArea.queries'
import { rowFields, type PaymentsBlock } from '../../specialPaymentsAreaFapi'

const cellText = (v: unknown) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))

// A block's table as the classic page prints it: the headers, one line per payment and a Total line. While a block has no payments the
// classic headers stay; once it has some, the columns are the field names the server sent (see specialPaymentsAreaFapi.ts).
function PaymentsTable({ block }: { block: PaymentsBlock }) {
  const fields = rowFields(block.rows)
  const headers = fields.length ? fields : block.columns
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">{block.title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              {headers.map((h, i) => (
                <th key={`${h}-${i}`} className="font-medium px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i} className="border-b border-border-subtle">
                {fields.map((f) => (
                  <td key={f} className="px-3 py-2 text-text">
                    {cellText(r[f])}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="font-semibold text-text!">
              <td className="px-3 py-2">Total</td>
              {headers.length > 2 && <td colSpan={headers.length - 2} />}
              <td className="px-3 py-2 tabular-nums text-right">{formatMoney(block.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// compta/charges/index.php: a summary of every special payment made in the chosen year (social/fiscal taxes, sales tax and, where the company
// is subject to them, the local taxes), read from compta/charges/fapi/dashboard.php.
export function SpecialPaymentsAreaPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading, isFetching, isError, error, refetch } = useSpecialPaymentsArea(year)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Wallet2 size={20} className="text-brand" /> Area For All Special Payments
        </h2>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1 py-1">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text" aria-label="Previous year">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-text! px-1.5">Year {year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text" aria-label="Next year">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <p className="text-sm text-text-muted">This area presents a summary of all payments made for special expenses. Only records with payments during the fixed year are included here.</p>

      {isLoading && <LegacyLoadingCard label="Loading special payments…" />}
      {isError && <LegacyErrorCard title="Couldn't load the special payments" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && (
        <div className={`space-y-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {data.blocks.map((b) => (
            <PaymentsTable key={b.key} block={b} />
          ))}
        </div>
      )}
    </div>
  )
}
