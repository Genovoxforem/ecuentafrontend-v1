import { Link } from 'react-router-dom'
import { PackageCheck, AlertTriangle, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useReceptionsArea, type ReceptionLinkRow, type PendingPurchaseOrderRow } from '../receptionsArea.queries'

function ReceptionRowsTable({ rows, emptyLabel }: { rows: ReceptionLinkRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="px-4 py-3 text-sm text-text-faint italic">{emptyLabel}</p>
  }
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0">
            {/* No in-app Reception Detail page exists yet (only the list
                pages do) — plain text rather than a link to a route that
                doesn't exist. */}
            <td className="px-4 py-2.5 flex items-center gap-1.5 text-text!">
              <PackageCheck size={13} className="text-brand shrink-0" /> {r.ref}
            </td>
            <td className="px-4 py-2.5">
              {r.socid ? (
                <Link to={ROUTES.customerDetail.replace(':id', String(r.socid))} className="text-brand hover:underline">
                  {r.customerName || '—'}
                </Link>
              ) : (
                <span className="text-text-muted">{r.customerName || '—'}</span>
              )}
            </td>
            <td className="px-4 py-2.5">
              {r.poId ? (
                <Link to={ROUTES.purchaseOrderDetail.replace(':id', String(r.poId))} className="text-brand hover:underline">
                  {r.poRef || '—'}
                </Link>
              ) : (
                <span className="text-text-muted">{r.poRef || '—'}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PendingPurchaseOrdersTable({ rows }: { rows: PendingPurchaseOrderRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-3 text-sm text-text-faint italic">No purchase orders to process.</p>
  }
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0">
            <td className="px-4 py-2.5">
              <Link to={ROUTES.purchaseOrderDetail.replace(':id', String(r.id))} className="text-brand hover:underline">
                {r.ref}
              </Link>
            </td>
            <td className="px-4 py-2.5">
              {r.socid ? (
                <Link to={ROUTES.customerDetail.replace(':id', String(r.socid))} className="text-brand hover:underline">
                  {r.customerName || '—'}
                </Link>
              ) : (
                <span className="text-text-muted">{r.customerName || '—'}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Real reference page: reception/index.php. See receptionsArea.queries.ts's
// header comment for the exact real SQL each of the 3 sections below
// reproduces — all genuine data from a single real page fetch (no JSON
// endpoint exists under reception/, but nothing here is scraped from more
// than this one page, and nothing is guessed).
export function ReceptionsAreaPage() {
  const { data, isLoading, isError, error } = useReceptionsArea()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PackageCheck size={20} className="text-brand" /> Receptions area
      </h2>

      {isError && (
        <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
          <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load receptions area data.'}</p>
        </Card>
      )}

      {isLoading ? (
        <Card className="!h-auto flex items-center justify-center py-10 text-text-faint text-sm gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="!p-0 overflow-hidden !h-auto">
            <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">Receptions To Validate</div>
            <ReceptionRowsTable rows={data?.receptionsToValidate ?? []} emptyLabel="None" />
          </Card>

          <div className="space-y-4">
            <Card className="!p-0 overflow-hidden !h-auto">
              <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">Latest 3 Receptions</div>
              <ReceptionRowsTable rows={data?.latestReceptions ?? []} emptyLabel="No receptions yet." />
            </Card>

            <Card className="!p-0 overflow-hidden !h-auto">
              <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text! flex items-center gap-2">
                Purchase Orders To Process
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-brand/10 text-brand text-xs font-semibold">
                  {data?.purchaseOrdersToProcess.length ?? 0}
                </span>
              </div>
              <PendingPurchaseOrdersTable rows={data?.purchaseOrdersToProcess ?? []} />
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
