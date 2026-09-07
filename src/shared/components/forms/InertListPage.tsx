import { useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { Info, Plus, Search } from 'lucide-react'
import { Card } from '../dashboard/DashboardKit'
import { TableExportButtons } from '../TableExportButtons'

// Shared shell for a real backend list page (real columns, confirmed by
// reading the PHP directly) that has no reachable JSON API — only the
// classic Dolibarr list.php/dict.php server-render pattern. Unlike
// PayrollRecordList (which backs a session-local collection seeded by a real
// write), there is no real write to seed this from either for most of these
// pages, so the table always shows its real empty state rather than
// fabricated or scraped rows. Export/print still work (they just produce a
// header-only file), matching the real page's own toolbar.
export function InertListPage({
  icon: Icon,
  title,
  sourcePath,
  columns,
  addLabel,
  addPath,
  note,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  sourcePath: string
  columns: string[]
  addLabel?: string
  addPath?: string
  note?: string
}) {
  const [search, setSearch] = useState('')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Icon size={20} className="text-brand" /> {title}
        </h2>
        {addLabel && addPath && (
          <Link to={addPath} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> {addLabel}
          </Link>
        )}
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">{sourcePath}</code> — a classic server-rendered list, no JSON API.{' '}
          {note ?? 'Columns below match that page exactly; rows are left honestly empty rather than scraped from its HTML.'}
        </p>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              disabled
              title="No data source to search — see the banner above"
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text-faint pl-8 pr-3 py-1.5 cursor-not-allowed"
            />
          </div>
          <TableExportButtons title={title} getExportData={() => ({ headers: columns, rows: [] })} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {columns.map((col) => (
                  <th key={col} className="font-medium px-4 py-2.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-4 text-text-faint italic" colSpan={columns.length}>
                  No Data Available In Table
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
