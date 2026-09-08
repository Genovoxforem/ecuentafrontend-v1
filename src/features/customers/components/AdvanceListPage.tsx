import { useParams, Link } from 'react-router-dom'
import { Wallet2, Info, ChevronLeft, Loader2, AlertTriangle, Eye, Download } from 'lucide-react'
import { Card, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { stripBackendPrefix } from '../customerDetailTabs.queries'
import { useCustomerDetail } from '../customerDetail.queries'
import { useCustomerAdvancePayments } from '../advanceList.queries'

// compta/facture/advance_list.php — real page, read directly. See
// advanceList.queries.ts's own header comment for the one confirmed gap
// (Total Used/Remaining Advance aren't exposed by the real JSON endpoint at
// all, so they stay honestly blank rather than shown as a fake 0.00).
export function AdvanceListPage() {
  const { id } = useParams<{ id: string }>()
  const { data: customer } = useCustomerDetail(id)
  const { data, isLoading, isError, error, refetch } = useCustomerAdvancePayments(id)
  const backTo = id ? `${ROUTES.customerDetail.replace(':id', id)}?tab=customer` : ROUTES.customerList

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <Link to={backTo} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text">
          <ChevronLeft size={18} /> Back to customer
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Wallet2 size={20} className="text-brand" /> Customer Advance Payments{customer?.name ? ` — ${customer.name}` : ''}
          </h2>
        </div>

        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">compta/facture/advance_list.php</code>. Rows and "Total Advance Amount" below are real. "Total Used
            Advance"/"Total Remaining Advance" aren't shown — the real backend computes them but never puts them in this list's own JSON response, so
            they're left out rather than shown as a fake 0.00.
          </p>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Total Advance Amount</p>
            <p className="text-lg font-bold text-text! mt-0.5">{data ? fmtZMW(data.totalAdvanceAmount) : '—'}</p>
          </Card>
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Total Used Advance</p>
            <p className="text-lg font-bold text-text-faint mt-0.5">—</p>
          </Card>
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Total Remaining Advance</p>
            <p className="text-lg font-bold text-text-faint mt-0.5">—</p>
          </Card>
        </div>

        {isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-danger-fg">Couldn't load advance payments</p>
              <p className="text-xs text-danger-fg/80 mt-0.5">{error instanceof Error ? error.message : 'Unknown error.'}</p>
              <button type="button" onClick={() => refetch()} className="text-xs font-medium text-danger-fg underline mt-2">
                Retry
              </button>
            </div>
          </Card>
        )}

        {isLoading && (
          <Card className="items-center justify-center gap-2 py-10 text-center">
            <Loader2 size={20} className="animate-spin text-brand" />
            <p className="text-sm text-text-faint">Loading real advance payments…</p>
          </Card>
        )}

        {data && (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium px-4 py-2.5">Ref.</th>
                    <th className="font-medium px-4 py-2.5">Date</th>
                    <th className="font-medium px-4 py-2.5">Third-Party</th>
                    <th className="font-medium px-4 py-2.5">Payment Type</th>
                    <th className="font-medium px-4 py-2.5 text-right">Total Advance</th>
                    <th className="font-medium px-4 py-2.5">Author</th>
                    <th className="font-medium px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-text-faint italic">
                        No Data Available In Table
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((r, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-text!">{r.ref}</td>
                        <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-2.5 text-text-muted">{r.thirdPartyName}</td>
                        <td className="px-4 py-2.5 text-text-muted">{r.paymentType}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text!">{fmtZMW(r.totalAdvance)}</td>
                        <td className="px-4 py-2.5 text-text-muted">{r.author}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {r.viewUrl && (
                            <a href={stripBackendPrefix(r.viewUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline mr-3">
                              <Eye size={13} /> View
                            </a>
                          )}
                          {r.downloadUrl && (
                            <a href={stripBackendPrefix(r.downloadUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                              <Download size={13} /> Download
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
