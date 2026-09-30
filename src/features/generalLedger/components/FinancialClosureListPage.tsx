import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, FileCheck2, Loader2, Search, X } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useInvoiceDrilldown } from '../generalLedgerAccounting.queries'
import { useFinancialList } from '../financialList.queries'
import type { FinancialListInvoiceType, FinancialListPage } from '../financialListParser'

// The four "Invoices Created" lines and the list each one opens.
const INVOICE_LINES: { key: FinancialListInvoiceType; label: string; title: string }[] = [
  { key: 'sales', label: 'Total Sales', title: 'Sales Invoices' },
  { key: 'purchase', label: 'Total Purchase', title: 'Purchase Invoices' },
  { key: 'expense', label: 'Total Expences', title: 'Expense Reports' },
  { key: 'bank', label: 'Total Bank Entries', title: 'Bank Entries' },
]

const NUMERIC = /^-?[\d,]+(\.\d+)?$/

// The last three columns (debit, credit, balance) hold amounts; a cell that spans several columns
// shifts the ones after it, so the column is counted by span, not by position in the row.
const AMOUNT_FROM_COLUMN = 3
const isAmount = (row: { text: string; span: number }[], index: number) =>
  NUMERIC.test(row[index].text) && row.slice(0, index).reduce((sum, c) => sum + c.span, 0) >= AMOUNT_FROM_COLUMN

// The page's own invoice list (financial_invoice_api.php, a JSON endpoint) for one category.
function DrilldownTable({ type, year }: { type: FinancialListInvoiceType; year: number }) {
  const { data: rows, isLoading, isError, error } = useInvoiceDrilldown(type, year, true)

  if (isLoading)
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-text-faint text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading records…
      </div>
    )
  if (isError) return <p className="text-sm text-danger py-4 text-center">{error instanceof Error ? error.message : 'Failed to load.'}</p>
  if (!rows || rows.length === 0) return <p className="text-sm text-text-faint italic py-4 text-center">No records for {year}.</p>

  // Column sets as the backend page prints them: expense reports have one amount and a user,
  // purchases a supplier, and bank entries an account number with debit and credit.
  const isBank = type === 'bank'
  const isExpense = type === 'expense'
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
            <th className="font-medium px-3 py-2">{isBank ? 'Account Number' : 'Ref'}</th>
            <th className="font-medium px-3 py-2">{isBank ? 'Label' : isExpense ? 'User' : type === 'purchase' ? 'Supplier' : 'Third Party'}</th>
            <th className="font-medium px-3 py-2">Date</th>
            {isBank ? (
              <>
                <th className="font-medium px-3 py-2 text-right">Debit</th>
                <th className="font-medium px-3 py-2 text-right">Credit</th>
              </>
            ) : (
              <>
                {!isExpense && <th className="font-medium px-3 py-2 text-right">Amount HT</th>}
                <th className="font-medium px-3 py-2 text-right">{isExpense ? 'Amount' : 'Amount TTC'}</th>
                <th className="font-medium px-3 py-2">Status</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-text!">{isBank ? (r.account_number ?? r.ref) : r.ref}</td>
              <td className="px-3 py-2 text-text-muted">{isBank ? r.label : r.third_party}</td>
              <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.date}</td>
              {isBank ? (
                <>
                  <td className="px-3 py-2 text-right tabular-nums">{r.debit}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.credit}</td>
                </>
              ) : (
                <>
                  {!isExpense && <td className="px-3 py-2 text-right tabular-nums">{r.amount_ht}</td>}
                  <td className="px-3 py-2 text-right tabular-nums">{r.amount_ttc}</td>
                  <td className="px-3 py-2 text-text-muted">{r.status}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap gap-x-2 text-sm">
      <span className="text-text-muted">{label} :</span>
      <span className="text-text">{children}</span>
    </p>
  )
}

function ChartSummary({ page, year }: { page: FinancialListPage; year: number }) {
  const [open, setOpen] = useState(true)
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  // The opening-balance row (its label spans several columns) always stays; account rows are narrowed by the search box.
  const rows = useMemo(() => (q ? page.rows.filter((r) => r[0]?.span > 1 || r.some((c) => c.text.toLowerCase().includes(q))) : page.rows), [page, q])

  const getExportData = () => ({
    headers: page.headers,
    rows: rows.map((r) => {
      const texts = r.map((c) => c.text)
      // A label that spans the first columns is padded so the numbers stay under their headings.
      return r[0]?.span > 1 ? [texts[0], ...Array(r[0].span - 1).fill(''), ...texts.slice(1)] : texts
    }),
  })

  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-hover">
        <span className="text-base font-medium text-brand">Chart of Accounts - Debit &amp; Credit Summary</span>
        <ChevronDown size={18} className={`text-brand transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="border-t border-border">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                aria-label="Search accounts"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title={`Financial List ${year}`} getExportData={getExportData} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand text-left text-xs text-white uppercase tracking-wide">
                  {page.headers.map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 font-bold whitespace-nowrap ${i >= 3 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={page.headers.length} className="px-4 py-6 text-center italic text-text-faint">
                      No accounts match.
                    </td>
                  </tr>
                )}
                {rows.map((r, ri) => (
                  <tr key={ri} className="border-b border-border last:border-0">
                    {r.map((c, ci) => (
                      <td key={ci} colSpan={c.span} className={`px-4 py-2.5 ${isAmount(r, ci) ? 'text-right tabular-nums' : ''} ${ci === 0 && c.span > 1 ? 'font-medium text-text!' : 'text-text-muted'}`}>
                        {c.text}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface font-semibold">
                  {page.grandTotal.map((c, i) => (
                    <td key={i} colSpan={c.span} className={`px-4 py-2.5 ${isAmount(page.grandTotal, i) ? 'text-right tabular-nums' : ''}`}>
                      {c.text}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}

// General Ledger > Financial Closure List (accountancy/closure/financiallist.php): the closing
// recorded for the year, the invoices created in it (each opens the page's own invoice list) and the
// debit / credit summary per account — all as the backend page prints them.
export function FinancialClosureListPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [yearDraft, setYearDraft] = useState(String(year))
  const [activeType, setActiveType] = useState<FinancialListInvoiceType | null>(null)
  const { data, isLoading, isFetching, isError, error, refetch } = useFinancialList(year)

  const goTo = (y: number) => {
    setYear(y)
    setYearDraft(String(y))
    setActiveType(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileCheck2 size={20} className="text-brand" /> Financial List
        </h2>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const y = Number(yearDraft)
            if (Number.isInteger(y) && y > 1900 && y < 3000) goTo(y)
          }}
        >
          <button type="button" onClick={() => goTo(year - 1)} className="grid h-9 w-9 place-items-center rounded-md border border-border text-text-muted hover:bg-surface-hover" aria-label="Previous year">
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-medium text-text!">Year {year}</span>
          <button type="button" onClick={() => goTo(year + 1)} className="grid h-9 w-9 place-items-center rounded-md border border-border text-text-muted hover:bg-surface-hover" aria-label="Next year">
            <ChevronRight size={16} />
          </button>
          <input
            value={yearDraft}
            onChange={(e) => setYearDraft(e.target.value)}
            inputMode="numeric"
            aria-label="Year"
            className="h-9 w-24 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
          />
          <button type="submit" title="Show this year" className="grid h-9 w-10 place-items-center rounded-md bg-brand text-white hover:bg-brand-hover">
            {isFetching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          </button>
        </form>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading the financial list…" />}
      {(isError || (!isLoading && !data)) && <LegacyErrorCard title="Couldn't load the financial list" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="!h-auto space-y-1.5">
              <h3 className="mb-2 text-lg font-semibold text-brand">Creation Details</h3>
              <Detail label="Created BY">{data.createdBy}</Detail>
              <Detail label="Approved BY">{data.approvedBy}</Detail>
              <Detail label="Date">{data.date}</Detail>
              <Detail label="Comments">{data.comments}</Detail>
              <p className="pt-1 text-xs text-text-faint">
                Record or change this year's closing under{' '}
                <Link to={ROUTES.ledgerCreateFinancialClosure} className="text-brand hover:underline">
                  Create Financial Closure
                </Link>
                .
              </p>
            </Card>
            <Card className="!h-auto space-y-1.5">
              <h3 className="mb-2 text-lg font-semibold text-brand">Invoices Created</h3>
              {INVOICE_LINES.map((l) => (
                <Detail key={l.key} label={l.label}>
                  <button type="button" onClick={() => setActiveType(activeType === l.key ? null : l.key)} className={`hover:underline ${activeType === l.key ? 'font-semibold text-brand' : 'text-brand'}`}>
                    {data.invoices[l.key] || '—'}
                  </button>
                </Detail>
              ))}
            </Card>
          </div>

          {activeType && (
            <Card className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="text-sm font-semibold text-text!">Invoice List — {INVOICE_LINES.find((l) => l.key === activeType)?.title}</span>
                <button type="button" onClick={() => setActiveType(null)} className="rounded-md p-1 text-text-muted hover:bg-surface-hover" aria-label="Close the invoice list">
                  <X size={16} />
                </button>
              </div>
              <DrilldownTable type={activeType} year={year} />
            </Card>
          )}

          <ChartSummary key={year} page={data} year={year} />
        </>
      )}
    </div>
  )
}
