import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Landmark, Check, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { useBankAccountFormOptions, useCreateBankAccount } from '../banking.queries'

const inputClasses = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

const ACCOUNT_TYPES = [
  { value: '3', label: 'Current or credit card account' },
  { value: '1', label: 'Cash account' },
  { value: '2', label: 'Savings account' },
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-text">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

// Real POST to compta/bank/card.php?action=add — no JSON API on this
// backend, but a genuine classic form-POST create (see useCreateBankAccount
// in banking.queries.ts for the full field mapping and why this is safe to
// attempt rather than leaving inert). Country/State/Accounting Account/
// Accounting Code Journal options are parsed straight out of that same
// page's own real <option> lists (see bankAccountFormParser.ts) — Account
// type and Status aren't scraped since Dolibarr hardcodes those inline in
// the PHP source itself.
export function BankAccountCreateForm() {
  const navigate = useNavigate()
  const { data: options, isLoading: optionsLoading, isError: optionsError } = useBankAccountFormOptions()
  const createAccount = useCreateBankAccount()

  const [ref, setRef] = useState('')
  const [label, setLabel] = useState('')
  const [type, setType] = useState('3')
  const [currencyCode, setCurrencyCode] = useState('')
  const [closed, setClosed] = useState(false)
  const [countryId, setCountryId] = useState('')
  const [stateId, setStateId] = useState('')
  const [url, setUrl] = useState('')
  const [comment, setComment] = useState('')
  const [initialBalance, setInitialBalance] = useState('0')
  const [date, setDate] = useState(todayIso())
  const [minAllowed, setMinAllowed] = useState('')
  const [minDesired, setMinDesired] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [iban, setIban] = useState('')
  const [bic, setBic] = useState('')
  const [bankAddress, setBankAddress] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')
  const [accountingAccount, setAccountingAccount] = useState('')
  const [accountingJournal, setAccountingJournal] = useState('')
  const [formError, setFormError] = useState('')

  // Seed country/currency defaults once the real page's own selected values
  // (e.g. Zambia) are known — not on every render, so a user's own choice
  // isn't clobbered if the options refetch.
  useEffect(() => {
    if (options?.defaultCountryValue) setCountryId((prev) => prev || options.defaultCountryValue)
  }, [options?.defaultCountryValue])

  async function handleSubmit() {
    setFormError('')
    if (!ref.trim() || !label.trim() || !currencyCode || !countryId || !accountingAccount) {
      setFormError('Ref, Bank or cash label, Currency, Account country and Accounting account are required.')
      return
    }
    try {
      const newId = await createAccount.mutateAsync({
        ref,
        label,
        type,
        currencyCode,
        closed,
        countryId,
        stateId,
        url,
        comment,
        initialBalance,
        date,
        minAllowedBalance: minAllowed,
        minDesiredBalance: minDesired,
        bankName,
        accountNumber,
        iban,
        bic,
        bankAddress,
        ownerName,
        ownerAddress,
        accountingAccount,
        accountingJournal,
      })
      navigate(ROUTES.bankingAccountDetail.replace(':id', String(newId)))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create bank account.')
    }
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Landmark size={20} className="text-brand" /> New Financial Account
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
          disabled={createAccount.isPending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createAccount.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create Account
        </button>
      }
    >
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <Field label="Ref" required>
            <input type="text" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={12} className={inputClasses} />
          </Field>
          <Field label="Bank or cash label" required>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Account type" required>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClasses}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Currency" required>
            <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} className={inputClasses}>
              <option value="">{optionsLoading ? 'Loading…' : 'Select a currency'}</option>
              {options?.currencies.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" required>
            <select value={closed ? '1' : '0'} onChange={(e) => setClosed(e.target.value === '1')} className={inputClasses}>
              <option value="0">Open</option>
              <option value="1">Closed</option>
            </select>
          </Field>
          <Field label="Account country" required>
            <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className={inputClasses}>
              <option value="">{optionsLoading ? 'Loading…' : 'Select Country'}</option>
              {options?.countries.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="State/Province">
            <select value={stateId} onChange={(e) => setStateId(e.target.value)} className={inputClasses}>
              <option value="">Select a state / province</option>
              {options?.states.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Web">
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Initial balance">
            <input type="text" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Minimum allowed balance">
            <input type="text" value={minAllowed} onChange={(e) => setMinAllowed(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Minimum desired balance">
            <input type="text" value={minDesired} onChange={(e) => setMinDesired(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="Comment">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className={inputClasses} />
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-text! mb-4">Bank details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <Field label="Bank name">
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Account number">
            <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="IBAN account number">
            <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} className={inputClasses} />
          </Field>

          <Field label="BIC/SWIFT code">
            <input type="text" value={bic} onChange={(e) => setBic(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Account owner name">
            <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClasses} />
          </Field>
          <div />

          <Field label="Bank address">
            <textarea value={bankAddress} onChange={(e) => setBankAddress(e.target.value)} rows={2} className={inputClasses} />
          </Field>
          <Field label="Account owner address">
            <textarea value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} rows={2} className={inputClasses} />
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-text! mb-4">Accounting</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Accounting account" required>
            <select value={accountingAccount} onChange={(e) => setAccountingAccount(e.target.value)} className={inputClasses}>
              <option value="">{optionsLoading ? 'Loading…' : 'Select an accounting account'}</option>
              {options?.accountingAccounts.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Accounting code journal">
            <select value={accountingJournal} onChange={(e) => setAccountingJournal(e.target.value)} className={inputClasses}>
              <option value="">Select a journal</option>
              {options?.accountingJournals.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {optionsError && <p className="text-sm text-danger">Couldn't load Country/Accounting Account options from the backend — try reloading.</p>}
      {formError && <p className="text-sm text-danger">{formError}</p>}
    </StickyFormShell>
  )
}
