import { useMemo, useState, type ComponentType } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Users2, ChevronRight, ArrowLeft, Download, FileSpreadsheet, FileText, Loader2, Search, Check, Info } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../../shared/legacyHtmlFetch'
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

// Saves the empty template the backend generates for a dataset. The file is
// fetched first and checked, because a backend that fails while building it
// (an uncaught PHP error, an expired session) answers 200 with an error page —
// saved as-is that would be a corrupt .xlsx / a .csv full of HTML.
async function saveTemplate(url: string, format: 'csv' | 'xlsx', fallbackName: string) {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`The backend returned ${res.status}.`)
  const blob = await res.blob()
  const head = await blob.slice(0, 4096).text()
  if (looksLikeLegacyLoginPageText(head)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const failed = /Fatal error|xdebug-error|<b>Warning<\/b>/i.test(head)
  // An .xlsx is a zip archive, so a real one starts with "PK".
  if (failed || (format === 'xlsx' && !head.startsWith('PK'))) {
    throw new Error('The backend could not generate this template file. Try the CSV format, or ask your administrator to check the server’s spreadsheet library.')
  }
  const name = /filename="?([^";]+)"?/i.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
}

function FormatCard({
  icon: Icon,
  color,
  title,
  description,
  onDownload,
}: {
  icon: ComponentType<{ size?: number }>
  color: IconColor
  title: string
  description: string
  onDownload: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setBusy(true)
    setError('')
    try {
      await onDownload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not download the template.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="!h-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${ICON_STYLES[color]}`}>
          <Icon size={20} />
        </span>
        <p className="font-semibold text-text!">{title}</p>
      </div>
      <p className="text-sm text-text-muted flex-1">{description}</p>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleClick()}
        className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download Template
      </button>
    </Card>
  )
}

// The same query string the classic page's own "download empty example" link carries.
function exampleUrl(format: 'csv' | 'xlsx', code: string) {
  const file = `Example_of_import_file_${code}.${format}`
  return `/imports/emptyexample.php?format=${format}&datatoimport=${encodeURIComponent(code)}&excludefirstline=2&enclosure=%22&output=file&file=${encodeURIComponent(file)}`
}

// Real GET /imports/import.php scrape for the dataset list (see
// imports.queries.ts) — no REST API exists for the generic import wizard.
// Step 2's "Download Template" cards fetch the real imports/emptyexample.php
// file-generator endpoint using the real `datatoimport` code scraped from
// Step 1, exactly like the legacy page's own links do — no client-side
// template generation, no guessed columns. The step is part of the URL
// (/import/customers, then /import/customers?dataset=<code>), so Back and a
// reload land where the user was and the menu item stays highlighted.
export function ImportCustomersWizard() {
  const { data: datasets, isLoading, isError, error } = useImportDatasets()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dataset = searchParams.get('dataset')
  const [search, setSearch] = useState('')

  const step: 1 | 2 = dataset ? 2 : 1
  const selected = useMemo(() => datasets?.find((d) => d.code === dataset) ?? null, [datasets, dataset])

  function pick(ds: ImportDataset) {
    navigate(`${ROUTES.importCustomers}?dataset=${encodeURIComponent(ds.code)}`)
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
            <p className="px-4 py-4 text-sm text-text-faint italic">{search ? `No datasets match “${search}”.` : 'The backend lists no importable datasets.'}</p>
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
          <button type="button" onClick={() => navigate(ROUTES.importCustomers)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
            <ArrowLeft size={14} /> Back to dataset list
          </button>

          {isLoading ? (
            <p className="text-sm text-text-faint italic">Loading…</p>
          ) : isError ? (
            <p className="text-sm text-danger">{error instanceof Error ? error.message : 'Could not load the dataset list.'}</p>
          ) : !selected ? (
            <p className="text-sm text-text-faint italic">There is no importable dataset called “{dataset}”. Choose one from the dataset list.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-alt px-5 py-4">
                <span className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
                  <Users2 size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-text-faint uppercase tracking-wide">{selected.module}</p>
                  <p className="font-semibold text-text! truncate">{selected.label}</p>
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
                    onDownload={() => saveTemplate(exampleUrl('csv', selected.code), 'csv', `Example_of_import_file_${selected.code}.csv`)}
                  />
                  <FormatCard
                    icon={FileSpreadsheet}
                    color="green"
                    title="Excel 2007"
                    description="Native .xlsx spreadsheet — opens directly in Microsoft Excel."
                    onDownload={() => saveTemplate(exampleUrl('xlsx', selected.code), 'xlsx', `Example_of_import_file_${selected.code}.xlsx`)}
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
