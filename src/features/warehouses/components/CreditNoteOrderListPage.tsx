import { Link } from 'react-router-dom'
import { RotateCcw, Eye, LoaderCircle, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { ROUTES } from '../../../routes'
import { useCreditNoteList } from '../creditNoteList.queries'

const COLUMNS = ['Sl.No', 'Ref.Id', 'Order Status', 'Created Date', 'Action']

// retunorder/card.php?id=&action=list ("Return List"). See
// creditNoteList.queries.ts's header comment for the exact real SQL and
// what's a faithfully-reproduced real quirk (Order Status is genuinely
// hardcoded to "Refund" on this build) vs. a broken reference-page detail
// deliberately not reproduced (its own "Sl.No" is a loop counter that
// never increments, always printing "1" — not real data, so this uses an
// actual row index instead).
export function CreditNoteOrderListPage() {
  const { data: rows, isLoading, isError, error } = useCreditNoteList()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <RotateCcw size={20} className="text-brand" /> Return List
      </h2>

      {isError && (
        <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
          <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load the return list.'}</p>
        </Card>
      )}

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <TheadRow>
              {COLUMNS.map((c) => (
                <Th key={c}>{c}</Th>
              ))}
            </TheadRow>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-6 text-center text-text-faint">
                  <LoaderCircle size={16} className="inline animate-spin mr-2" /> Loading return list…
                </td>
              </tr>
            ) : !rows || rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.invoiceId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-muted">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link to={ROUTES.invoiceDetail.replace(':id', String(r.invoiceId))} className="text-brand hover:underline">
                      {r.ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-success-bg text-success-fg">Refund</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{r.createdDate}</td>
                  <td className="px-4 py-3">
                    <Link to={ROUTES.invoiceDetail.replace(':id', String(r.invoiceId))} title="View" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text inline-flex">
                      <Eye size={14} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
