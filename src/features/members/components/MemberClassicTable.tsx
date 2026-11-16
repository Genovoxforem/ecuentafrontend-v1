import { Card } from '../../../shared/components/dashboard/DashboardKit'
import type { MemberTable } from '../membersClassic.data'

const NUMERIC = /^-?[\d,]+(\.\d+)?$/

// One read-only table of a classic Members page, printed as the page prints it: its title, its header row, its rows (a number is
// right-aligned) and, when it has no row, the page's own words ("None").
export function MemberClassicTable({ table, title }: { table: MemberTable; title?: string }) {
  const heading = title ?? table.title
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      {heading && (
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text!">{heading}</h3>
        </div>
      )}
      {table.message && <p className="px-4 py-3 text-sm text-text-muted border-b border-border">{table.message}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              {table.headers.map((h, i) => (
                <th key={i} className="font-medium px-3 py-2 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} className="border-b border-border last:border-0">
                {table.headers.map((_, c) => (
                  <td key={c} className={`px-3 py-2 ${NUMERIC.test(row[c] ?? '') ? 'text-right tabular-nums' : 'text-text-muted'} ${row[0] === 'Total' ? 'font-semibold' : ''}`}>
                    {row[c] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
            {/* An empty table prints only what the page prints: its "None" row, or nothing under the header. */}
            {table.rows.length === 0 && table.emptyNote && (
              <tr>
                <td colSpan={table.headers.length} className="px-3 py-4 text-center text-text-faint italic">
                  {table.emptyNote}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
