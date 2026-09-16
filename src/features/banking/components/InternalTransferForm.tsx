import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Check, X, LoaderCircle } from 'lucide-react'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useBankAccountsList, useCreateInternalTransfer } from '../banking.queries'
import { ROUTES } from '../../../routes'

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// compta/bank/transfer.php — no JSON API (confirmed live), but a genuine
// classic form-POST create: writes a debit in the source account and a
// credit in the target account with the same amount/label/date. See
// useCreateInternalTransfer in banking.queries.ts. The From/To dropdowns
// use the already-confirmed-real useBankAccountsList() data rather than
// re-scraping the real page's own <select> — only its CSRF token is
// scraped, at submit time.
export function InternalTransferForm() {
  const navigate = useNavigate()
  const { data: accounts } = useBankAccountsList()
  const createTransfer = useCreateInternalTransfer()

  const [accountFromId, setAccountFromId] = useState('')
  const [accountToId, setAccountToId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [amountTo, setAmountTo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const accountFrom = accounts?.find((a) => a.id === Number(accountFromId))
  const accountTo = accounts?.find((a) => a.id === Number(accountToId))
  const crossCurrency = !!accountFrom && !!accountTo && accountFrom.currencyCode !== accountTo.currencyCode

  async function handleSubmit() {
    setError(null)
    if (!accountFromId || !accountToId) {
      setError('Select both a From and a To account.')
      return
    }
    if (accountFromId === accountToId) {
      setError('From and To must be different accounts.')
      return
    }
    try {
      await createTransfer.mutateAsync({
        accountFromId,
        accountToId,
        date,
        label,
        amount,
        amountTo: crossCurrency ? amountTo : undefined,
      })
      navigate(ROUTES.bankingAccounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed.')
    }
  }

  return (
    <StickyFormShell
      scrollsInternally={false}
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ArrowLeftRight size={20} className="text-brand" /> Internal Transfer
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.bankingAccounts} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button
          type="button"
          disabled={createTransfer.isPending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createTransfer.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Add
        </button>
      }
    >
      <div className="rounded-lg bg-info-bg/40 p-3 text-sm text-info-fg">
        Transfer from one account to another — this writes two records (a debit in the source account and a credit in the target account). The same amount (except sign), label and date are used for both.
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="From" required>
          <select value={accountFromId} onChange={(e) => setAccountFromId(e.target.value)} className={inputClasses}>
            <option value="">Select a bank account</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} ({a.currencyCode})
              </option>
            ))}
          </select>
        </Field>

        <Field label="To" required>
          <select value={accountToId} onChange={(e) => setAccountToId(e.target.value)} className={inputClasses}>
            <option value="">Select a bank account</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} ({a.currencyCode})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date" required>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
        </Field>

        <Field label="Description">
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClasses} />
        </Field>

        <Field label="Amount" required>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClasses} />
        </Field>

        {crossCurrency && (
          <Field label={`Amount To (in ${accountTo?.currencyCode})`} required>
            <input value={amountTo} onChange={(e) => setAmountTo(e.target.value)} className={inputClasses} />
          </Field>
        )}
      </div>
    </StickyFormShell>
  )
}
