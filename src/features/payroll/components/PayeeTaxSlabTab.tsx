import { useState } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { usePayeeTaxSlab, useAddPayeeTaxSlab, useUpdatePayeeTaxSlab, type PayeeTaxSlabRow } from '../payrollAdminTabs.queries'

const CURRENT_YEAR = String(new Date().getFullYear())

export function PayeeTaxSlabTab() {
  const { data, isLoading, isError, error, refetch } = usePayeeTaxSlab()
  const addSlab = useAddPayeeTaxSlab()
  const updateSlab = useUpdatePayeeTaxSlab()

  const [year, setYear] = useState(CURRENT_YEAR)
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [deductionPercent, setDeductionPercent] = useState('')
  const [formError, setFormError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<{ fromAmount: string; toAmount: string; deductionPercent: string }>({ fromAmount: '', toAmount: '', deductionPercent: '' })

  const rows = data ?? []
  const canAddMore = rows.length < 4

  function handleAdd() {
    setFormError('')
    if (!fromAmount || !toAmount || !deductionPercent) return setFormError('From Amount, To Amount and Deductions in % are all required.')
    if (Number(toAmount) > 0 && Number(toAmount) <= Number(fromAmount)) return setFormError("The 'To Amount' must be '0' or greater than 'From Amount'.")
    addSlab.mutate(
      { year, fromAmount, toAmount, deductionPercent },
      {
        onSuccess: () => {
          setFromAmount('')
          setToAmount('')
          setDeductionPercent('')
        },
        onError: (e) => setFormError(e instanceof Error ? e.message : 'Could not add this bracket.'),
      },
    )
  }

  function startEdit(row: PayeeTaxSlabRow) {
    setEditingId(row.id)
    setEditRow({ fromAmount: row.fromAmount, toAmount: row.toAmount, deductionPercent: row.deductionPercent })
  }

  function saveEdit(id: string) {
    updateSlab.mutate({ id, ...editRow }, { onSuccess: () => setEditingId(null) })
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <Field label="Select Year" required>
          <input value={year} onChange={(e) => setYear(e.target.value)} className={`${inputClasses} max-w-[160px]`} />
        </Field>
      </Card>

      {isLoading ? (
        <LegacyLoadingCard label="Loading Payee Tax slab…" />
      ) : isError ? (
        <LegacyErrorCard title="Couldn't load Payee Tax slab" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      ) : (
        <Card className="!h-auto !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">From Amount</th>
                <th className="font-medium px-4 py-2.5">To Amount</th>
                <th className="font-medium px-4 py-2.5">Deductions in %</th>
                <th className="font-medium px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {canAddMore && (
                <tr className="border-b border-border">
                  <td className="px-4 py-3">
                    <input type="number" step="0.01" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} placeholder="Enter Amount" className={inputClasses} />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" step="0.01" value={toAmount} onChange={(e) => setToAmount(e.target.value)} placeholder="Enter Amount" className={inputClasses} />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={deductionPercent} onChange={(e) => setDeductionPercent(e.target.value)} placeholder="Enter Deduction" className={inputClasses} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={addSlab.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
                    >
                      {addSlab.isPending && <Loader2 size={14} className="animate-spin" />}
                      Update
                    </button>
                  </td>
                </tr>
              )}
              {rows.length === 0 && !canAddMore && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-faint text-sm">
                    No brackets for {year} yet.
                  </td>
                </tr>
              )}
              {rows.map((row) =>
                editingId === row.id ? (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <input value={editRow.fromAmount} onChange={(e) => setEditRow((r) => ({ ...r, fromAmount: e.target.value }))} className={inputClasses} />
                    </td>
                    <td className="px-4 py-3">
                      <input value={editRow.toAmount} onChange={(e) => setEditRow((r) => ({ ...r, toAmount: e.target.value }))} className={inputClasses} />
                    </td>
                    <td className="px-4 py-3">
                      <input value={editRow.deductionPercent} onChange={(e) => setEditRow((r) => ({ ...r, deductionPercent: e.target.value }))} className={inputClasses} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(row.id)}
                          disabled={updateSlab.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
                        >
                          Modify
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-surface-hover">
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text!">{row.fromAmount}</td>
                    <td className="px-4 py-3 text-text-muted">{row.toAmount}</td>
                    <td className="px-4 py-3 text-text-muted">{row.deductionPercent}</td>
                    <td className="px-4 py-3">
                      <button type="button" title="Modify" onClick={() => startEdit(row)} className="text-text-faint hover:text-brand">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </Card>
      )}
      {formError && <p className="text-sm text-danger">{formError}</p>}
    </div>
  )
}
