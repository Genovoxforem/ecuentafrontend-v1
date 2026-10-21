import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CircleAlert, CircleCheck, ChevronDown, ChevronRight } from 'lucide-react'
import { getProductStockDiff, isMissingEndpoint } from '../../../api/products'
import { formatNumber } from '../../../utils/format'

// Why virtual stock differs from physical (product/fapi/stock_diff.php): every component with the
// rule that decided it, the total checked against what the class reports, and the pending documents.
// The classic stock_api breakdown (passed as `fallback`) is shown only on a backend without the route.
export function VirtualStockBreakdown({ id, fallback }: { id: string | undefined; fallback: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'stockDiff', id],
    queryFn: () => getProductStockDiff(id ?? ''),
    enabled: !!id,
    staleTime: 1000 * 30,
    retry: false,
  })
  if (isLoading) return null
  if (error) return isMissingEndpoint(error) ? <>{fallback}</> : <p className="mt-2 text-xs text-danger">{error instanceof Error ? error.message : 'Could not load the virtual stock breakdown.'}</p>
  if (!data) return null

  const counted = data.components.filter((c) => c.counted && c.qty !== 0)
  const drafts = data.components.filter((c) => !c.counted && c.qty !== 0)
  const pending = [
    ['Customer orders', data.pending.customer_orders],
    ['Supplier orders', data.pending.supplier_orders],
    ['Shipments', data.pending.shipments],
  ] as const

  return (
    <div className="mt-1 border-t border-border pt-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">Why virtual stock differs</span>
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          {data.difference === 0 ? 'No difference' : `${data.difference > 0 ? '+' : ''}${formatNumber(data.difference)}`}
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          <div className={`flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs ${data.reconciliation.matches ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
            {data.reconciliation.matches ? <CircleCheck size={14} className="mt-0.5 shrink-0" /> : <CircleAlert size={14} className="mt-0.5 shrink-0" />}
            <p>
              Physical {formatNumber(data.physical)} → virtual {formatNumber(data.virtual)}.{' '}
              {data.reconciliation.matches ? data.reconciliation.note : `Unexplained: ${formatNumber(data.reconciliation.unexplained)} (components add to ${formatNumber(data.reconciliation.computed)}, the system reports ${formatNumber(data.reconciliation.from_class)}).`}
            </p>
          </div>

          {counted.length === 0 ? (
            <p className="text-xs text-text-faint">Nothing pending moves this product's virtual stock.</p>
          ) : (
            <ul className="space-y-1.5">
              {counted.map((c) => (
                <li key={c.key} className="text-xs">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-text!">{c.label}</span>
                    <span className="tabular-nums text-text!">
                      {formatNumber(c.qty)} × {c.sign > 0 ? '+' : '−'}1 = {c.effect > 0 ? '+' : ''}
                      {formatNumber(c.effect)}
                    </span>
                  </div>
                  <p className="text-text-faint">{c.why}</p>
                </li>
              ))}
            </ul>
          )}

          {drafts.length > 0 && (
            <div className="text-xs text-text-muted">
              <p className="font-medium text-text-faint">Not counted</p>
              {drafts.map((c) => (
                <p key={c.key}>
                  {c.label}: {formatNumber(c.qty)} <span className="text-text-faint">({c.why})</span>
                </p>
              ))}
            </div>
          )}

          {pending.some(([, docs]) => docs.length > 0) && (
            <div className="space-y-2 text-xs">
              {pending.map(([label, docs]) =>
                docs.length === 0 ? null : (
                  <div key={label}>
                    <p className="font-medium text-text-faint">{label}</p>
                    <ul className="mt-0.5 space-y-0.5 text-text-muted">
                      {docs.map((d, i) => (
                        <li key={`${d.ref}-${i}`}>
                          {d.ref}
                          {d.qty !== undefined && ` · ${formatNumber(d.qty)}`}
                          {d.status_label && ` · ${d.status_label}`}
                          {d.is_draft && ' · draft'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
