import { useMemo } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney, formatDateTimeAmPm } from '../../../utils/format'
import { useInvoicesSummary } from '../invoices.queries'

// Same real GET /api/invoices/ data as the main invoice list (see
// invoices.queries.ts), filtered to Dolibarr's fk_statut=3 ("Abandoned") —
// the same query the legacy page's own "Abandoned" filter link runs
// server-side (list.php?search_status=3), just applied client-side here
// since useInvoicesSummary already fetches every status.
export function AbandonedInvoicesPage() {
  const { data, isLoading, isError } = useInvoicesSummary()
  const rows = useMemo(() => (data?.rows ?? []).filter((r) => r.rawStatut === 3), [data])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <TriangleAlert size={20} className="text-brand" /> Abandoned Invoices
      </h2>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Ref</th>
              <th className="font-medium px-4 py-2.5">Invoice Date</th>
              <th className="font-medium px-4 py-2.5">Third-Party</th>
              <th className="font-medium px-4 py-2.5 text-right">Amount (Incl. Tax)</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-text-faint italic">
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-danger">
                  Could not load invoices.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3 text-brand font-medium">{r.ref}</td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTimeAmPm(r.invoiceDate)}</td>
                  <td className="px-4 py-3 text-text!">{r.thirdParty}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text!">{formatMoney(r.amountInclTax)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-danger-bg text-danger-fg">Abandoned</span>
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
