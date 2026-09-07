import { useState } from 'react'
import { FileCheck2, Info, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Receipt, ShoppingCart, Wallet, Landmark } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useInvoiceDrilldown, type InvoiceDrillType } from '../generalLedgerAccounting.queries'

const TYPES: { key: InvoiceDrillType; label: string; icon: typeof Receipt }[] = [
  { key: 'sales', label: 'Sales Invoices', icon: Receipt },
  { key: 'purchase', label: 'Purchase Invoices', icon: ShoppingCart },
  { key: 'expense', label: 'Expense Reports', icon: Wallet },
  { key: 'bank', label: 'Bank Entries', icon: Landmark },
]

function DrilldownTable({ type, year }: { type: InvoiceDrillType; year: number }) {
  const { data: rows, isLoading, isError, error } = useInvoiceDrilldown(type, year, true)

  if (isLoading)
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-text-faint text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading real records…
      </div>
    )
  if (isError) return <p className="text-sm text-danger py-4 text-center">{error instanceof Error ? error.message : 'Failed to load.'}</p>
  if (!rows || rows.length === 0) return <p className="text-sm text-text-faint italic py-4 text-center">No records for {year}.</p>

  const isBank = type === 'bank'
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
            <th className="font-medium px-3 py-2">Ref</th>
            <th className="font-medium px-3 py-2">{isBank ? 'Label' : 'Third Party'}</th>
            <th className="font-medium px-3 py-2">Date</th>
            {isBank ? (
              <>
                <th className="font-medium px-3 py-2 text-right">Debit</th>
                <th className="font-medium px-3 py-2 text-right">Credit</th>
              </>
            ) : (
              <>
                <th className="font-medium px-3 py-2 text-right">Amount HT</th>
                <th className="font-medium px-3 py-2 text-right">Amount TTC</th>
                <th className="font-medium px-3 py-2">Status</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-text!">{r.ref}</td>
              <td className="px-3 py-2 text-text-muted">{isBank ? r.label : r.third_party}</td>
              <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.date}</td>
              {isBank ? (
                <>
                  <td className="px-3 py-2 text-right tabular-nums">{r.debit}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.credit}</td>
                </>
              ) : (
                <>
                  <td className="px-3 py-2 text-right tabular-nums">{r.amount_ht}</td>
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

// accountancy/closure/financiallist.php — its own year summary ("Creation
// Details", chart-of-accounts debit/credit table) is server-rendered HTML
// with no JSON API, so it isn't reproduced here. Its 4 drill-down buttons
// ARE real JSON though (financial_invoice_api.php) — wired for real below.
export function FinancialClosureListPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [activeType, setActiveType] = useState<InvoiceDrillType | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileCheck2 size={20} className="text-brand" /> Financial Closure List
        </h2>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1 py-1">
          <button type="button" onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-text! px-1.5">Year {year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">accountancy/closure/financiallist.php</code>. Its own year-summary tables (creation details, chart of
          accounts debit/credit) are server-rendered HTML with no JSON API, so they aren't shown here. The 4 drill-down lists below ARE real — backed by{' '}
          <code className="font-mono">financial_invoice_api.php</code>, the same JSON endpoint the real page's own drill-down modal uses.
        </p>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TYPES.map((t) => {
          const Icon = t.icon
          const isActive = activeType === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveType(isActive ? null : t.key)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors ${
                isActive ? 'border-brand bg-brand/5' : 'border-border bg-surface-alt hover:bg-surface-hover'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-brand' : 'text-text-faint'} />
              <span className="text-sm font-medium text-text!">{t.label}</span>
            </button>
          )
        })}
      </div>

      {activeType && (
        <Card className="!p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">{TYPES.find((t) => t.key === activeType)?.label}</div>
          <DrilldownTable type={activeType} year={year} />
        </Card>
      )}

      {!activeType && (
        <Card className="!h-auto flex items-center gap-2 justify-center py-8 text-text-faint text-sm">
          <AlertTriangle size={15} /> Pick a category above to load its real {year} records.
        </Card>
      )}
    </div>
  )
}
