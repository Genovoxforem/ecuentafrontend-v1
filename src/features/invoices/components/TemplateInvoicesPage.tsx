import { Flag } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { isBackendUnavailable, BackendUnavailableInline } from '../../../shared/components/BackendUnavailable'
import { formatMoney } from '../../../utils/format'
import { useInvoiceTemplates } from '../invoiceTemplates.queries'

function fmtDate(v: string | null) {
  if (!v) return 'NA'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return 'NA'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Real GET /api/invoice-templates/ data (see invoiceTemplates.queries.ts),
// reading llx_facture_rec directly. Read-only, matching the legacy page's
// own instructions for how templates get created.
export function TemplateInvoicesPage() {
  const { data, isLoading, isError, error } = useInvoiceTemplates()
  const items = data?.items ?? []

  const totals = items.reduce(
    (acc, r) => ({ ht: acc.ht + r.amountExclTax, vat: acc.vat + r.vat, ttc: acc.ttc + r.amountInclTax }),
    { ht: 0, vat: 0, ttc: 0 },
  )

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Flag size={20} className="text-brand" /> Template Invoices
      </h2>

      <p className="text-sm text-text-muted">
        To create a template invoice, create a standard invoice, then, without validating it, click onto button "Convert into template invoice".
      </p>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Ref.</th>
              <th className="font-medium px-4 py-2.5">Third-Party</th>
              <th className="font-medium px-4 py-2.5 text-right">Amount (Excl. Tax)</th>
              <th className="font-medium px-4 py-2.5 text-right">VAT</th>
              <th className="font-medium px-4 py-2.5 text-right">Amount (Inc. Tax)</th>
              <th className="font-medium px-4 py-2.5">Template/Recurring Invoice</th>
              <th className="font-medium px-4 py-2.5">Frequency</th>
              <th className="font-medium px-4 py-2.5">Frequency Unit</th>
              <th className="font-medium px-4 py-2.5">Number Of Generation Done</th>
              <th className="font-medium px-4 py-2.5">Date Latest Gen.</th>
              <th className="font-medium px-4 py-2.5">Date Next Gen.</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} className="px-4 py-4 text-text-faint italic">
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={12} className="px-4 py-4">
                  {isBackendUnavailable(error) ? (
                    <BackendUnavailableInline feature="Invoice Templates" />
                  ) : (
                    <span className="text-danger">Could not load template invoices.</span>
                  )}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-4 text-text-faint italic">
                  No Data Available In Table
                </td>
              </tr>
            ) : (
              <>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3 text-brand font-medium">{r.ref}</td>
                    <td className="px-4 py-3 text-text!">{r.thirdParty || '-'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-muted">{formatMoney(r.amountExclTax)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-muted">{formatMoney(r.vat)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text!">{formatMoney(r.amountInclTax)}</td>
                    <td className="px-4 py-3 text-text-muted">{r.isRecurring ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-text-muted">{r.isRecurring ? r.frequency : ''}</td>
                    <td className="px-4 py-3 text-text-muted">{r.isRecurring ? r.frequencyUnit.toUpperCase() : ''}</td>
                    <td className="px-4 py-3 text-text-muted">{r.isRecurring ? `${r.nbGenDone} / ${r.nbGenMax}` : 'NA'}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDate(r.dateLastGen)}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDate(r.dateNextGen)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.statusLabel === 'Active' ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>{r.statusLabel}</span>
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold text-text!">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.ht)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.vat)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.ttc)}</td>
                  <td className="px-4 py-3" colSpan={6} />
                </tr>
              </>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
