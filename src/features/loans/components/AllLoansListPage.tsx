import { useEffect, useState } from 'react'
import { HandCoins, X, Plus, Check, LoaderCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useLoanManagementForm, useLoanProductInfo, useCustomerAccountOptions, useCreateLoanManagement, type NewLoanManagementInput } from '../loans.queries'
import { useBankAccountsList } from '../../banking/banking.queries'
import { isoToMdy } from '../../banking/bankEntryDetailParser'

const emptyForm = (loanId: string): NewLoanManagementInput => ({
  loanId,
  productId: '',
  borrowerId: '',
  currencyCode: 'ZMW',
  customerAccountId: '',
  paymentTypeId: '',
  bankAccountId: '',
  firstPaymentDate: '',
  releaseDate: '',
  appliedAmount: '',
  latePaymentPenalties: '',
  description: '',
  remarks: '',
})

// custom/loanmanagement/loanmanagementlist.php — the real custom "Loan
// Management" plugin (distinct from the core Dolibarr "Loan" tracker under
// Banking). Its list has no JSON API of its own (a plain server-rendered
// DataTable, currently 0 rows on this backend), but its "New Loan" panel is
// a genuine classic form-POST create, wired for real here — see
// loans.queries.ts / loanManagementParser.ts. Two real quirks reproduced
// faithfully rather than fixed: no CSRF token on this form at all, and the
// Customer Account dropdown (dependent on Borrower) currently comes back
// broken server-side — see the hooks' own comments.
export function AllLoansListPage() {
  const { data, isLoading, isError, error, refetch } = useLoanManagementForm()
  const { data: bankAccounts } = useBankAccountsList()
  const createLoan = useCreateLoanManagement()

  const [showAddLoan, setShowAddLoan] = useState(false)
  const [form, setForm] = useState<NewLoanManagementInput | null>(null)
  const [firstPaymentIso, setFirstPaymentIso] = useState('')
  const [releaseIso, setReleaseIso] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const productInfo = useLoanProductInfo(form?.productId)
  const customerAccounts = useCustomerAccountOptions(form?.borrowerId)

  useEffect(() => {
    if (showAddLoan && data && !form) setForm(emptyForm(data.nextLoanId))
  }, [showAddLoan, data, form])

  // Real behavior (confirmed live): picking a Loan Product auto-fills Late
  // Payment Penalties from the product's own real config.
  useEffect(() => {
    if (productInfo.data && form) setForm((f) => (f ? { ...f, latePaymentPenalties: productInfo.data!.penal } : f))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productInfo.data])

  function openPanel() {
    setSubmitError(null)
    setFirstPaymentIso('')
    setReleaseIso('')
    setForm(data ? emptyForm(data.nextLoanId) : null)
    setShowAddLoan(true)
  }

  function closePanel() {
    setShowAddLoan(false)
    setForm(null)
  }

  async function handleCreate() {
    if (!form) return
    setSubmitError(null)
    if (!form.productId || !form.borrowerId || !form.currencyCode || !form.paymentTypeId || !form.bankAccountId || !form.firstPaymentDate || !form.releaseDate || !form.appliedAmount || form.latePaymentPenalties === '') {
      setSubmitError('Fill in every required field.')
      return
    }
    try {
      await createLoan.mutateAsync(form)
      closePanel()
      refetch()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not create this loan.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <HandCoins size={20} className="text-brand" /> All Loan
        </h2>
        <button type="button" onClick={openPanel} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add New
        </button>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading…" />}
      {isError && <LegacyErrorCard title="Couldn't load loans" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Loan ID</th>
                <th className="font-medium px-4 py-2.5">Loan Product</th>
                <th className="font-medium px-4 py-2.5">Borrower</th>
                <th className="font-medium px-4 py-2.5">Contact No</th>
                <th className="font-medium px-4 py-2.5">Release Date</th>
                <th className="font-medium px-4 py-2.5">Applied Amount</th>
                <th className="font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-text-faint italic text-center">
                    No loans found.
                  </td>
                </tr>
              ) : (
                data.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text!">{r.loanId}</td>
                    <td className="px-4 py-2 text-text-muted">{r.loanProduct}</td>
                    <td className="px-4 py-2 text-text-muted">{r.borrower}</td>
                    <td className="px-4 py-2 text-text-muted">{r.contactNo || '—'}</td>
                    <td className="px-4 py-2 text-text-muted">{r.releaseDate}</td>
                    <td className="px-4 py-2 text-text-muted">{r.appliedAmount}</td>
                    <td className="px-4 py-2 text-text-muted">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {showAddLoan && form && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={closePanel}>
          <div className="w-full max-w-xl h-full bg-surface border-l border-border shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface z-10">
              <h3 className="flex items-center gap-2 text-base font-bold text-text!">
                <HandCoins size={18} className="text-brand" /> New Loan
              </h3>
              <button type="button" onClick={closePanel} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {submitError && <p className="text-sm text-danger">{submitError}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Loan ID" required>
                  <input value={form.loanId} readOnly className={`${inputClasses} bg-surface-alt cursor-not-allowed`} />
                </Field>

                <Field label="Loan Product" required>
                  <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className={inputClasses}>
                    <option value="">Select Loan Product</option>
                    {data?.productOptions.filter((o) => o.value !== '-1').map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {productInfo.data && (
                  <div className="sm:col-span-2 text-xs text-text-muted rounded-md bg-info-bg/40 p-2 space-y-0.5">
                    {productInfo.data.des
                      .split(/<\/?div>/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                  </div>
                )}

                <Field label="Borrower (customer)" required>
                  <select
                    value={form.borrowerId}
                    onChange={(e) => setForm({ ...form, borrowerId: e.target.value, customerAccountId: '' })}
                    className={inputClasses}
                  >
                    <option value="">Select Third Party</option>
                    {data?.borrowerOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Currency" required>
                  <select value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value })} className={inputClasses}>
                    {data?.currencyOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Customer Account" required>
                  <select value={form.customerAccountId} onChange={(e) => setForm({ ...form, customerAccountId: e.target.value })} className={inputClasses}>
                    <option value="">{customerAccounts.isFetching ? 'Loading…' : 'Select Customer Account'}</option>
                    {(customerAccounts.data ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Payment Type" required>
                  <select value={form.paymentTypeId} onChange={(e) => setForm({ ...form, paymentTypeId: e.target.value })} className={inputClasses}>
                    <option value="">Select a payment type</option>
                    {data?.paymentTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Payment Account Bank" required>
                  <select value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} className={inputClasses}>
                    <option value="">Select a bank account</option>
                    {(bankAccounts ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="First Payment Date" required>
                  <input
                    type="date"
                    value={firstPaymentIso}
                    onChange={(e) => {
                      setFirstPaymentIso(e.target.value)
                      setForm({ ...form, firstPaymentDate: isoToMdy(e.target.value) })
                    }}
                    className={inputClasses}
                  />
                </Field>

                <Field label="Release Date" required>
                  <input
                    type="date"
                    value={releaseIso}
                    onChange={(e) => {
                      setReleaseIso(e.target.value)
                      setForm({ ...form, releaseDate: isoToMdy(e.target.value) })
                    }}
                    className={inputClasses}
                  />
                </Field>

                <Field label="Applied Amount" required>
                  <input
                    type="number"
                    value={form.appliedAmount}
                    onChange={(e) => setForm({ ...form, appliedAmount: e.target.value })}
                    className={inputClasses}
                  />
                </Field>

                <Field label="Late Payment Penalties (%)" required>
                  <input
                    type="number"
                    value={form.latePaymentPenalties}
                    onChange={(e) => setForm({ ...form, latePaymentPenalties: e.target.value })}
                    className={inputClasses}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Description">
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputClasses} />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Remarks">
                    <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} className={inputClasses} />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => data && setForm(emptyForm(data.nextLoanId))}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={createLoan.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {createLoan.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create Loan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
