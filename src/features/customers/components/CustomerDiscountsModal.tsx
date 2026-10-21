import { useState } from 'react'
import { BadgePercent, Check, LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import { formatMoney } from '../../../utils/format'
import { useVatRateOptions } from '../../products/products.queries'
import { useCreateCustomerRebate, useCustomerDiscounts, useCustomerRebates, useDeleteCustomerDiscount, useSetRelativeDiscount, type RebateStatus } from '../customerRebates.queries'
import type { CustomerRebate } from '../../../api/customers'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

const STATUS_TABS: { key: RebateStatus; label: string }[] = [
  { key: 'available', label: 'Available' },
  { key: 'consumed', label: 'Used' },
  { key: 'all', label: 'All' },
]

function invoiceLabel(invoice: CustomerRebate['invoice']): string {
  if (!invoice) return ''
  if (typeof invoice === 'string') return invoice
  return invoice.ref ?? (invoice.id ? `#${invoice.id}` : '')
}

// Customer discounts (absolute rebates) — societe/fapi/rebates.php. Lists the
// customer's available and used discounts with their totals, and adds a new
// fixed-amount discount (VAT derived server-side from amount and rate).
export function CustomerDiscountsModal({ socid, relativePercent, onClose }: { socid: string; relativePercent: number | string; onClose: () => void }) {
  const [status, setStatus] = useState<RebateStatus>('available')
  const { data, isLoading, isError, error, refetch } = useCustomerRebates(socid, status)
  const { data: vatRates } = useVatRateOptions()
  const createRebate = useCreateCustomerRebate(socid)
  const discounts = useCustomerDiscounts(socid)
  const setRelative = useSetRelativeDiscount(socid)
  const deleteDiscount = useDeleteCustomerDiscount(socid)
  const canEdit = discounts.data?.can_edit ?? false
  const [editingRelative, setEditingRelative] = useState(false)
  const [relativeDraft, setRelativeDraft] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [vat, setVat] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')

  const currency = data?.currency ?? ''
  const money = (n: number) => `${formatMoney(n)}${currency ? ` ${currency}` : ''}`

  function handleCreate() {
    setFormError('')
    const amountHt = Number(amount)
    if (!(amountHt > 0)) return setFormError('Enter an amount greater than 0.')
    if (!description.trim()) return setFormError('A description is required.')
    const rate = vatRates?.find((v) => v.value === vat)?.rate ?? (Number(vat) || 0)
    createRebate.mutate(
      { amountHt, vatRate: rate, description: description.trim() },
      {
        onSuccess: () => {
          setAmount('')
          setDescription('')
          setShowForm(false)
          setStatus('available')
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg bg-surface border border-border shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <BadgePercent size={16} className="text-brand" /> Customer Discounts
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-text-faint">Relative discount</p>
              {editingRelative ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input type="number" min="0" max="100" step="0.01" value={relativeDraft} onChange={(e) => setRelativeDraft(e.target.value)} className="w-20 text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1" />
                  <button
                    type="button"
                    disabled={setRelative.isPending}
                    onClick={() => setRelative.mutate({ percent: Number(relativeDraft) || 0 }, { onSuccess: () => setEditingRelative(false) })}
                    className="p-1 rounded-md bg-brand text-white disabled:opacity-60"
                    aria-label="Save relative discount"
                  >
                    {setRelative.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                  </button>
                </div>
              ) : (
                <p className="text-base font-semibold text-text!">
                  {discounts.data?.relative_percent ?? relativePercent}%
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setRelativeDraft(String(discounts.data?.relative_percent ?? relativePercent))
                        setEditingRelative(true)
                      }}
                      className="ml-2 text-xs font-medium text-brand hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </p>
              )}
              {setRelative.isError && <p className="text-xs text-danger mt-1">{setRelative.error instanceof Error ? setRelative.error.message : 'Could not set the discount.'}</p>}
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-text-faint">Available (excl. tax)</p>
              <p className="text-base font-semibold text-text!">{data ? money(data.totals.available_ht) : '—'}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-text-faint">Available (incl. tax)</p>
              <p className="text-base font-semibold text-text!">{data ? money(data.totals.available_ttc) : '—'}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-text-faint">Already used (incl. tax)</p>
              <p className="text-base font-semibold text-text!">{data ? money(data.totals.consumed_ttc) : '—'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatus(t.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${status === t.key ? 'bg-brand text-white' : 'border border-border text-text-muted hover:bg-surface-hover'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {data?.can_create && !showForm && (
              <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover">
                <Plus size={13} /> New discount
              </button>
            )}
          </div>

          {showForm && (
            <div className="rounded-md border border-border p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-faint">Amount (excl. tax)*</span>
                  <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-faint">VAT rate</span>
                  {vatRates ? (
                    <select value={vat} onChange={(e) => setVat(e.target.value)} className={inputCls}>
                      <option value="">0%</option>
                      {vatRates.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="number" min="0" step="0.01" value={vat} onChange={(e) => setVat(e.target.value)} className={inputCls} placeholder="0" />
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-faint">Description*</span>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
                </label>
              </div>
              {(formError || createRebate.isError) && (
                <p className="text-xs text-danger">{formError || (createRebate.error instanceof Error ? createRebate.error.message : 'Could not create the discount.')}</p>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createRebate.isPending}
                  onClick={handleCreate}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {createRebate.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />} Save discount
                </button>
              </div>
            </div>
          )}

          {isError ? (
            <div className="text-sm text-danger flex items-center justify-between">
              <span>{error instanceof Error ? error.message : 'Could not load the discounts.'}</span>
              <button type="button" onClick={() => refetch()} className="text-xs text-brand hover:underline">
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface-alt">
                    <th className="font-medium px-3 py-2">Date</th>
                    <th className="font-medium px-3 py-2">Description</th>
                    <th className="font-medium px-3 py-2 text-right">Excl. tax</th>
                    <th className="font-medium px-3 py-2 text-right">VAT</th>
                    <th className="font-medium px-3 py-2 text-right">Incl. tax</th>
                    <th className="font-medium px-3 py-2">Status</th>
                    <th className="font-medium px-3 py-2">By</th>
                    {canEdit && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={canEdit ? 8 : 7} className="px-3 py-6 text-center text-text-faint">
                        <LoaderCircle size={14} className="inline animate-spin mr-1.5" /> Loading discounts…
                      </td>
                    </tr>
                  ) : !data || data.items.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 8 : 7} className="px-3 py-6 text-center text-text-faint italic">
                        No {status === 'all' ? '' : status === 'available' ? 'available ' : 'used '}discounts for this customer.
                      </td>
                    </tr>
                  ) : (
                    data.items.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.date}</td>
                        <td className="px-3 py-2 text-text!">{r.description}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(r.amount_ht)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                          {formatMoney(r.amount_tva)} <span className="text-xs">({r.tva_tx}%)</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{formatMoney(r.amount_ttc)}</td>
                        <td className="px-3 py-2">
                          {r.consumed ? (
                            <span className="text-xs text-text-muted">Used{invoiceLabel(r.invoice) ? ` on ${invoiceLabel(r.invoice)}` : ''}</span>
                          ) : (
                            <span className="text-xs font-medium text-success-fg">Available</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-text-muted">{r.by}</td>
                        {canEdit && (
                          <td className="px-3 py-2 text-right">
                            {!r.consumed && (
                              <button
                                type="button"
                                title="Delete this discount"
                                disabled={deleteDiscount.isPending}
                                onClick={() => window.confirm(`Delete this discount (${formatMoney(r.amount_ttc)})?`) && deleteDiscount.mutate(r.id)}
                                className="text-text-faint hover:text-danger disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
