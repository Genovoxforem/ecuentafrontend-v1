import { useState } from 'react'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useTaxDeductions,
  useTaxFeeOptions,
  useSaveTaxDeduction,
  useDeleteTaxDeduction,
  type TaxDeductionRow,
} from '../payrollAdminTabs.queries'

const CURRENCY_OPTIONS = [
  { value: 'ZMW', label: 'Zambian Kwacha (ZMW)' },
  { value: 'USD', label: 'US Dollar (USD)' },
]

const emptyForm = { id: '', name: '', method: 'percentage' as 'percentage' | 'amount', amount: '', deductionsFromCode: '1' as '1' | '2', payType: 'employee' as 'employee' | 'employer', currencyCode: 'ZMW', accountFeeId: '' }

export function TaxDeductionsTab() {
  const { data, isLoading, isError, error, refetch } = useTaxDeductions()
  const { data: feeOptions } = useTaxFeeOptions()
  const saveTaxDeduction = useSaveTaxDeduction()
  const deleteTaxDeduction = useDeleteTaxDeduction()

  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  function handleClear() {
    setForm(emptyForm)
    setFormError('')
  }

  function handleEdit(row: TaxDeductionRow) {
    setForm({
      id: row.id,
      name: row.name,
      method: (row.deductionMethod as 'percentage' | 'amount') || 'percentage',
      amount: row.percent,
      deductionsFromCode: row.deductionsFromCode,
      payType: (row.payType as 'employee' | 'employer') || 'employee',
      currencyCode: row.currencyCode || 'ZMW',
      accountFeeId: row.accountFeeId,
    })
    setFormError('')
  }

  function handleSubmit() {
    setFormError('')
    if (!form.name.trim()) return setFormError('Tax Deductions name is required.')
    if (!form.amount) return setFormError('Deductions in % / Amount is required.')
    if (!form.accountFeeId) return setFormError('Please select a valid accounting code.')
    saveTaxDeduction.mutate(
      { id: form.id || undefined, name: form.name.trim(), method: form.method, amount: form.amount, deductionsFromCode: form.deductionsFromCode, payType: form.payType, currencyCode: form.currencyCode, accountFeeId: form.accountFeeId },
      { onSuccess: handleClear, onError: (e) => setFormError(e instanceof Error ? e.message : 'Could not save the tax deduction.') },
    )
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Tax Deductions" required>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClasses} />
          </Field>
          <Field label="Deductions Method">
            <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as 'percentage' | 'amount' }))} className={inputClasses}>
              <option value="percentage">% Percentage</option>
              <option value="amount">Amount</option>
            </select>
          </Field>
          <Field label="Deductions in % / Amount" required>
            <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputClasses} />
          </Field>
          <Field label="Deductions From">
            <select value={form.deductionsFromCode} onChange={(e) => setForm((f) => ({ ...f, deductionsFromCode: e.target.value as '1' | '2' }))} className={inputClasses}>
              <option value="1">Basic Salary</option>
              <option value="2">Gross Salary</option>
            </select>
          </Field>
          <Field label="Pay type">
            <select value={form.payType} onChange={(e) => setForm((f) => ({ ...f, payType: e.target.value as 'employee' | 'employer' }))} className={inputClasses}>
              <option value="employee">Employee</option>
              <option value="employer">Employer</option>
            </select>
          </Field>
          <Field label="Currency">
            <select value={form.currencyCode} onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value }))} className={inputClasses}>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Account" required>
            <select value={form.accountFeeId} onChange={(e) => setForm((f) => ({ ...f, accountFeeId: e.target.value }))} className={inputClasses}>
              <option value="">Select Accounting Code...</option>
              {(feeOptions ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveTaxDeduction.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {saveTaxDeduction.isPending && <Loader2 size={14} className="animate-spin" />}
            {form.id ? 'Update' : 'Save'}
          </button>
          <button type="button" onClick={handleClear} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-surface-hover">
            Clear
          </button>
        </div>
        {formError && <p className="text-sm text-danger mt-2">{formError}</p>}
      </Card>

      {isLoading ? (
        <LegacyLoadingCard label="Loading tax deductions…" />
      ) : isError ? (
        <LegacyErrorCard title="Couldn't load tax deductions" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      ) : (
        <Card className="!h-auto !p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Sl.No</th>
                <th className="font-medium px-4 py-2.5">Deductions Name</th>
                <th className="font-medium px-4 py-2.5">% / Amount</th>
                <th className="font-medium px-4 py-2.5">Deductions From</th>
                <th className="font-medium px-4 py-2.5">Payment Type</th>
                <th className="font-medium px-4 py-2.5">Currency</th>
                <th className="font-medium px-4 py-2.5">Account</th>
                <th className="font-medium px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-text-faint text-sm">
                    No tax deductions yet.
                  </td>
                </tr>
              ) : (
                (data ?? []).map((row, i) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text!">{i + 1}</td>
                    <td className="px-4 py-3 text-text-muted">{row.name}</td>
                    <td className="px-4 py-3 text-text-muted">{row.percent}</td>
                    <td className="px-4 py-3 text-text-muted">{row.deductionsFromCode === '1' ? 'Basic Salary' : 'Gross Salary'}</td>
                    <td className="px-4 py-3 text-text-muted capitalize">{row.payType}</td>
                    <td className="px-4 py-3 text-text-muted">{row.currencyCode}</td>
                    <td className="px-4 py-3 text-text-muted">{row.accountLabel}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" title={`Edit ${row.name}`} onClick={() => handleEdit(row)} className="text-text-faint hover:text-brand">
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title={`Delete ${row.name}`}
                          onClick={() => {
                            if (confirm(`Delete "${row.name}"?`)) deleteTaxDeduction.mutate(row.id)
                          }}
                          className="text-text-faint hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
