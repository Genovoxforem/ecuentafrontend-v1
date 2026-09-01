import { UserSquare2 } from 'lucide-react'
import { Card, InvoiceStatusChart, SectionHeading } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { formatDateTimeAmPm } from '../../../utils/format'
import { useSupplierProposalAreaSummary } from '../supplierProposalArea.queries'

function statusRows(counts: { draft: number; validated: number; signed: number; notSigned: number; closed: number }) {
  return [
    { status: 'Draft', count: counts.draft, amount: 0 },
    { status: 'Open', count: counts.validated, amount: 0 },
    { status: 'Accepted', count: counts.signed, amount: 0 },
    { status: 'Refused', count: counts.notSigned, amount: 0 },
    { status: 'Closed', count: counts.closed, amount: 0 },
  ]
}

const DOT_COLORS = ['bg-[var(--color-chart-1)]', 'bg-[var(--color-chart-2)]', 'bg-[var(--color-chart-3)]', 'bg-[var(--color-chart-4)]', 'bg-[var(--color-chart-5)]']

// Real GET /api/supplier-proposals/summary/ data (see
// supplierProposalArea.queries.ts), reading llx_supplier_proposal directly.
export function VendorProposalsAreaPage() {
  const { data, isLoading, isError } = useSupplierProposalAreaSummary()
  const rows = statusRows(data?.statusCounts ?? { draft: 0, validated: 0, signed: 0, notSigned: 0, closed: 0 })
  const latest = data?.latest ?? []

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <UserSquare2 size={20} className="text-brand" /> Vendor Proposals Area
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-4">
        <InvoiceStatusChart title="Price Requests By Status" rows={rows} />

        <Card className="!h-auto">
          <SectionHeading icon={UserSquare2}>Status Breakdown</SectionHeading>
          <div className="mt-3 space-y-2">
            {rows.map((r, i) => (
              <div key={r.status} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-text-muted">
                  <span className={`w-2.5 h-2.5 rounded-full ${DOT_COLORS[i]}`} />
                  {r.status}
                </span>
                <span className="font-semibold text-text! tabular-nums">{r.count}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-2 mt-2 border-t border-border">
              <span className="text-text-muted font-medium">Total</span>
              <span className="font-bold text-text! tabular-nums">{data?.total ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="!p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-border">
          <SectionHeading icon={UserSquare2}>Latest 5 Modified Price Requests</SectionHeading>
        </div>
        <table className="w-full text-sm">
          <thead>
            <TheadRow>
              <Th>Ref</Th>
              <Th>Third-Party</Th>
              <Th>Last Modified</Th>
            </TheadRow>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-text-faint italic">
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-danger">
                  Could not load vendor proposals.
                </td>
              </tr>
            ) : latest.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              latest.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3 text-brand font-medium">{p.ref}</td>
                  <td className="px-4 py-3 text-text!">{p.thirdParty || '-'}</td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTimeAmPm(p.lastModified)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
