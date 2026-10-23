import { useState } from 'react'
import { Loader2, Printer, UserMinus, UserPlus, X } from 'lucide-react'
import { usePackerAssignment, usePackerCandidates, usePackingDetail, type PackingRow } from '../packingList.queries'

const selectCls = 'h-9 flex-1 min-w-0 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// One packing record: the printable list of what is being packed and the people packing it. Packers are kept by the
// server as one column of user ids, so a duplicate or an overflow comes back as an error to show.
export function PackingDetailModal({ row, onClose }: { row: PackingRow; onClose: () => void }) {
  const detail = usePackingDetail(row.shipmentId)
  const candidates = usePackerCandidates()
  const { assign, remove } = usePackerAssignment()
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  // The list row is refetched after every change, so the packers shown here come from the list query, not a copy.
  const packers = row.packers
  const taken = new Set(packers.map((p) => p.id))
  const options = (candidates.data ?? []).filter((u) => !taken.has(u.id))
  const busy = assign.isPending || remove.isPending
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : 'The change failed.')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:bg-transparent" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-border px-5 py-3">
          <div>
            <h3 className="text-base font-semibold text-text!">Packing list {row.ref}</h3>
            <p className="text-xs text-text-muted">{row.packingDate}</p>
          </div>
          <div className="flex items-center gap-1 print:hidden">
            <button type="button" onClick={() => window.print()} aria-label="Print" title="Print" className="rounded-md p-1 text-text-faint hover:bg-surface-hover hover:text-text">
              <Printer size={16} />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-text-faint hover:bg-surface-hover hover:text-text">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Packers</h4>
            {packers.length === 0 ? (
              <p className="text-sm italic text-text-faint">Nobody is assigned yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {packers.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-3 py-1.5 text-sm text-text">
                    {p.label}
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Remove ${p.label}`}
                      title="Remove this packer"
                      onClick={() => {
                        setError('')
                        remove.mutate({ packId: row.packId, userId: p.id }, { onError: fail })
                      }}
                      className="rounded p-1 text-text-faint hover:text-danger disabled:opacity-50 print:hidden"
                    >
                      <UserMinus size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2 print:hidden">
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className={selectCls}>
                <option value="">{candidates.isLoading ? 'Loading people…' : 'Add a packer…'}</option>
                {options.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!userId || busy}
                onClick={() => {
                  setError('')
                  assign.mutate({ packId: row.packId, userId: Number(userId) }, { onSuccess: () => setUserId(''), onError: fail })
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assign.isPending ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} Assign
              </button>
            </div>
            {error && <p role="alert" className="text-xs text-danger">{error}</p>}
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Items to pack</h4>
            {row.shipmentId === null ? (
              <p className="text-sm italic text-text-faint">This record is not linked to a shipment.</p>
            ) : detail.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 size={14} className="animate-spin" /> Loading the packing list…
              </p>
            ) : detail.isError ? (
              <p className="text-sm text-danger">{detail.error instanceof Error ? detail.error.message : "Couldn't load the packing list."}</p>
            ) : detail.data && detail.data.lines.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="py-1.5">Product</th>
                    <th className="py-1.5 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data.lines.map((l, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5 text-text">
                        {l.ref && <span className="font-medium">{l.ref} </span>}
                        <span className="text-text-muted">{l.label}</span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-text">{l.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm italic text-text-faint">The shipment has no lines.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
