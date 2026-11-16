import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Folder, Search } from 'lucide-react'
import { REPORT_CATEGORIES, reportPath } from '../../features/reports/reportsStructure'

// The "Reports Center" laid out as the classic page (custom/reports/reportsindex.php): the title and a search box, the categories in a list on the left, and
// "All Reports" on the right as a grid of report cards (three to a row) under a sub-header per category. A category in the list shows only its reports (a second
// click shows all again); the search keeps the report names that contain the text, and a category whose own name matches keeps all of its reports.
export function ReportsModule() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const q = search.trim().toLowerCase()
  const groups = useMemo(
    () =>
      REPORT_CATEGORIES.filter((cat) => !selected || cat.key === selected)
        .map((cat) => ({ cat, reports: !q || cat.label.toLowerCase().includes(q) ? cat.reports : cat.reports.filter((r) => r.label.toLowerCase().includes(q)) }))
        .filter((g) => g.reports.length > 0),
    [q, selected],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <h2 className="flex shrink-0 items-center justify-center gap-2 text-lg font-bold text-text!">
        <Folder size={20} className="text-brand" /> Reports Center
      </h2>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Report categories" className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-alt">
          {/* The header of the left panel keeps the search box; only the list below it scrolls. */}
          <div className="shrink-0 border-b border-border p-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reports"
                aria-label="Search reports"
                style={{ paddingLeft: '2.25rem' }}
                className="h-9 w-full rounded-md border border-input-border bg-input-bg pr-3 text-sm text-text"
              />
            </div>
          </div>
          <ul className="soft-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
            {REPORT_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const active = selected === cat.key
              return (
                <li key={cat.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(active ? null : cat.key)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold ${active ? 'bg-brand/10 text-brand' : 'text-text hover:bg-surface-hover'}`}
                  >
                    <Icon size={16} className="shrink-0 text-text-faint" />
                    {cat.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <section aria-label="All Reports" className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-alt">
          <div className="flex h-11 shrink-0 items-center border-b border-border bg-surface px-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-text!">Report Name</h3>
          </div>
          <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {groups.length === 0 && <p className="px-4 py-8 text-center italic text-text-faint">No reports match "{search}".</p>}
            {groups.map(({ cat, reports }) => (
              <div key={cat.key} className="px-4 pb-4">
                <h4 className="sticky top-0 z-10 -mx-4 border-b border-border bg-surface-alt px-4 py-2 text-sm font-bold text-text!">{cat.label}</h4>
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {reports.map((r) => (
                    <li key={r.slug}>
                      <Link
                        to={reportPath(cat.key, r.slug)}
                        className="flex h-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3 text-sm font-medium text-brand hover:border-brand/50 hover:bg-surface-hover"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-text" />
                        {r.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
