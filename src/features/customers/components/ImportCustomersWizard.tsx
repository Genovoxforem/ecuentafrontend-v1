import { useMemo, useState, type ComponentType } from 'react'
import { Users2, ChevronRight, ArrowLeft, Download, FileSpreadsheet, FileText, Search, Check, Info } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { useImportDatasets } from '../imports.queries'
import type { ImportDataset } from '../importsHtmlParser'

const STEPS = [
  { n: 1 as const, label: 'Choose dataset' },
  { n: 2 as const, label: 'Choose format' },
]

function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                step === s.n ? 'bg-brand text-white' : step > s.n ? 'bg-brand/15 text-brand' : 'bg-surface-hover text-text-faint'
              }`}
            >
              {step > s.n ? <Check size={14} /> : s.n}
            </span>
            <span className={`text-sm font-medium ${step === s.n ? 'text-text!' : 'text-text-faint'}`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`w-10 h-px mx-3 transition-colors ${step > s.n ? 'bg-brand/40' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  )
}

function FormatCard({
  icon: Icon,
  color,
  title,
  description,
  url,
}: {
  icon: ComponentType<{ size?: number }>
  color: IconColor
  title: string
  description: string
  url: string
}) {
  return (
    <Card className="!h-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${ICON_STYLES[color]}`}>
          <Icon size={20} />
        </span>
        <p className="font-semibold text-text!">{title}</p>
      </div>
      <p className="text-sm text-text-muted flex-1">{description}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
      >
        <Download size={15} /> Download Template
      </a>
    </Card>
  )
}

// Real GET /imports/import.php scrape for the dataset list (see
// imports.queries.ts) — no REST API exists for the generic import wizard.
// Step 2's "Download Template" cards go straight to the real
// imports/emptyexample.php file-generator endpoint using the real
// `datatoimport` code scraped from Step 1, exactly like the legacy page's
// own links do — no client-side template generation, no guessed columns.
export function ImportCustomersWizard() {
  const { data: datasets, isLoading, isError, error } = useImportDatasets()
  const [step, setStep] = useState<1 | 2>(1)
  const [selected, setSelected] = useState<ImportDataset | null>(null)
  const [search, setSearch] = useState('')

  function pick(ds: ImportDataset) {
    setSelected(ds)
    setStep(2)
  }

  function exampleUrl(format: 'csv' | 'xlsx') {
    if (!selected) return '#'
    const filename = `${selected.label.replace(/\s+/g, '-')}-example.${format}`
    return `/imports/emptyexample.php?format=${format}&datatoimport=${encodeURIComponent(selected.code)}&output=file&file=${encodeURIComponent(filename)}`
  }

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const map = new Map<string, ImportDataset[]>()
    for (const ds of datasets ?? []) {
      if (q && !ds.label.toLowerCase().includes(q) && !ds.module.toLowerCase().includes(q)) continue
      const arr = map.get(ds.module) ?? []
      arr.push(ds)
      map.set(ds.module, arr)
    }
    return Array.from(map.entries())
  }, [datasets, search])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Users2 size={20} className="text-brand" /> Import Customers/Vendors
        </h2>
        <Stepper step={step} />
      </div>

      {step === 1 ? (
        <Card className="!p-0 overflow-hidden !h-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border">
            <span className="text-sm text-text-muted">Choose the dataset you want to import…</span>
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search datasets"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
          </div>
          {isLoading ? (
            <p className="px-4 py-4 text-sm text-text-faint italic">Loading…</p>
          ) : isError ? (
            <p className="px-4 py-4 text-sm text-danger">{error instanceof Error ? error.message : 'Could not load the dataset list.'}</p>
          ) : grouped.length === 0 ? (
            <p className="px-4 py-4 text-sm text-text-faint italic">No datasets match “{search}”.</p>
          ) : (
            <div className="divide-y divide-border max-h-[65vh] overflow-y-auto">
              {grouped.map(([module, items]) => (
                <div key={module}>
                  <div className="px-4 py-1.5 text-xs font-semibold text-text-faint uppercase tracking-wide bg-surface sticky top-0">{module}</div>
                  {items.map((ds) => (
                    <button
                      key={ds.code}
                      type="button"
                      onClick={() => pick(ds)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface-hover transition-colors"
                    >
                      <span className="text-sm text-brand font-medium">{ds.label}</span>
                      <ChevronRight size={16} className="text-text-faint shrink-0" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-5">
          <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
            <ArrowLeft size={14} /> Back to dataset list
          </button>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-alt px-5 py-4">
            <span className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
              <Users2 size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-text-faint uppercase tracking-wide">{selected?.module}</p>
              <p className="font-semibold text-text! truncate">{selected?.label}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text! mb-3">Choose a file format to download an empty template</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormatCard
                icon={FileText}
                color="blue"
                title="CSV"
                description="Comma-separated values — opens in any spreadsheet app or text editor."
                url={exampleUrl('csv')}
              />
              <FormatCard
                icon={FileSpreadsheet}
                color="green"
                title="Excel 2007"
                description="Native .xlsx spreadsheet — opens directly in Microsoft Excel."
                url={exampleUrl('xlsx')}
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-alt px-4 py-3">
            <Info size={15} className="text-text-faint shrink-0 mt-0.5" />
            <p className="text-xs text-text-faint">
              Field mapping and file upload aren't built yet — the template above comes straight from the real backend for this exact dataset, so it already has the
              right columns to fill in.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
