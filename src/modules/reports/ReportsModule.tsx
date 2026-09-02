import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Folder, Search, ChevronRight, ChevronDown, Zap } from 'lucide-react'
import { Card } from '../../shared/components/dashboard/DashboardKit'
import { REPORT_CATEGORIES, reportPath } from '../../features/reports/reportsStructure'

const PREVIEW_LIMIT = 6

// The real "Reports Center" (custom/reports/reportsindex.php) — confirmed
// this session to be a large, real, working module (previously wrongly
// concluded to be a dead link, by checking the wrong path). Its own real
// menu descriptor (modReports.class.php) never wires this into llx_menu at
// all, so it's unreachable from the sidebar in the real app too — this hub
// is the real, only way in. Categories, report labels, and grouping are
// all real (read directly from that PHP file); the card design itself
// (icons/colors/descriptions) is this pass's own presentation choice. Only
// "Purchase Invoices" and "Sales Invoices" (marked with a lightning bolt)
// have a confirmed real, secured JSON API — every other entry routes to a
// real inert page rather than a PHP link.
export function ReportsModule() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const q = search.trim().toLowerCase()
  const visibleCategories = REPORT_CATEGORIES.filter((cat) => !categoryFilter || cat.key === categoryFilter)
    .map((cat) => ({ ...cat, reports: cat.reports.filter((r) => !q || r.label.toLowerCase().includes(q)) }))
    .filter((cat) => cat.reports.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Folder size={20} className="text-brand" /> Reports Center
          </h2>
          <p className="text-sm text-text-faint mt-0.5">Access and generate important business reports</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports by name or category…"
            className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-2.5"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2.5 sm:w-56"
        >
          <option value="">All Categories</option>
          {REPORT_CATEGORIES.map((cat) => (
            <option key={cat.key} value={cat.key}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {visibleCategories.length === 0 ? (
        <p className="text-sm text-text-faint italic py-6 text-center">No reports match "{search}".</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleCategories.map((cat) => {
            const Icon = cat.icon
            const isExpanded = expanded[cat.key] ?? false
            const showAll = isExpanded || Boolean(q) || cat.reports.length <= PREVIEW_LIMIT
            const visibleReports = showAll ? cat.reports : cat.reports.slice(0, PREVIEW_LIMIT)
            const remaining = cat.reports.length - visibleReports.length

            return (
              <Card key={cat.key} className="!h-auto space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cat.colorClass}`}>
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="font-semibold text-text!">{cat.label}</p>
                      <p className="text-xs text-text-faint mt-0.5">{cat.description}</p>
                    </div>
                  </div>
                  {cat.reports.length > PREVIEW_LIMIT && !q && (
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => ({ ...prev, [cat.key]: !isExpanded }))}
                      className="shrink-0 p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text"
                      title={isExpanded ? 'Show fewer' : 'Show all'}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-1">
                  {visibleReports.map((r) => (
                    <Link key={r.slug} to={reportPath(cat.key, r.slug)} className="flex items-center gap-1.5 text-sm text-brand hover:underline py-0.5">
                      <span className="w-1 h-1 rounded-full bg-brand/50 shrink-0" />
                      {r.label}
                      {r.real && <Zap size={10} className="text-success-fg shrink-0" />}
                    </Link>
                  ))}
                </div>

                {!showAll && remaining > 0 && (
                  <button type="button" onClick={() => setExpanded((prev) => ({ ...prev, [cat.key]: true }))} className="text-xs text-text-faint hover:text-brand pl-1">
                    +{remaining} more
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
