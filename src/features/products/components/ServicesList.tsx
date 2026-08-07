import { useState } from 'react'
import { Wrench, Search } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { formatMoney } from '../../../utils/format'
import type { ServicesSummary } from '../products.queries'

const COLUMNS = ['Ref', 'Label', 'Price (Excl. Tax)', 'Price (Incl. Tax)', 'VAT']
const PER_PAGE = 15

export function ServicesList({ summary }: { summary: ServicesSummary }) {
  const [page, setPage] = useState(1)
  const pageServices = summary.services.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wrench size={20} className="text-brand" /> Service List
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Services</p>
            <p className="text-2xl font-bold text-text! mt-1">{summary.totalServices}</p>
          </div>
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_STYLES.cyan}`}>
            <Wrench size={18} />
          </span>
        </Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input disabled type="text" placeholder="Search" className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5" />
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {COLUMNS.map((col) => (
                  <th key={col} className="font-medium px-4 py-2.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.services.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : (
                pageServices.map((s) => (
                  <tr key={s.ref} className="border-b border-border">
                    <td className="px-4 py-3 text-brand">{s.ref}</td>
                    <td className="px-4 py-3 text-text!">{s.label}</td>
                    <td className="px-4 py-3 text-text-muted text-right tabular-nums">{formatMoney(s.priceExclTax)} {summary.currency}</td>
                    <td className="px-4 py-3 text-text! text-right tabular-nums">{formatMoney(s.priceInclTax)} {summary.currency}</td>
                    <td className="px-4 py-3 text-text-muted">{s.vatRate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <ListPagination page={page} perPage={PER_PAGE} total={summary.services.length} onPageChange={setPage} />
    </div>
  )
}
