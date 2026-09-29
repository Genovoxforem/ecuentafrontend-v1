import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Percent, Save, X } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../../shared/components/layout/StickyFormShell'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { ROUTES } from '../../../../routes'
import { useCreateSalesTax, useSalesTaxCreateForm, type SalesTaxCreateForm } from '../../salesTaxCreate.queries'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// MM/dd/yyyy (the real form's own format) <-> yyyy-MM-dd (native date input).
const toIso = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}
const toUs = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`text-xs font-medium mb-1 ${required ? 'text-danger' : 'text-text-faint'}`}>
        {label}
        {required && '*'}
        {hint && <span className="italic font-normal text-text-faint"> {hint}</span>}
      </p>
      {children}
    </div>
  )
}

// compta/tva/card.php?action=create — the real "VAT - New" form. Bank accounts
// and payment types come from the backend page itself; Save posts the real
// action=add form and (like the original) is refused with the backend's own
// "Field 'X' is required" messages when something is missing.
function SalesTaxForm({ data }: { data: SalesTaxCreateForm }) {
  const navigate = useNavigate()
  const create = useCreateSalesTax()
  const [refund, setRefund] = useState(false)
  const [label, setLabel] = useState(data.defaultLabels.payment)
  const [labelTouched, setLabelTouched] = useState(false)
  const [datep, setDatep] = useState(data.defaultDate)
  const [datev, setDatev] = useState('')
  const [amount, setAmount] = useState('')
  const [accountid, setAccountid] = useState('-1')
  const [typePayment, setTypePayment] = useState('')
  const [numPayment, setNumPayment] = useState('')

  const today = () => {
    const d = new Date()
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
  }

  const pickType = (r: boolean) => {
    setRefund(r)
    // Like the real page's own JS: only swap the suggested label while it's untouched.
    if (!labelTouched) setLabel(r ? data.defaultLabels.refund : data.defaultLabels.payment)
  }

  const save = () =>
    create.mutate(
      { token: data.token, refund, datep, datev, label, amount, accountid, typePayment, numPayment },
      { onSuccess: () => navigate(ROUTES.ledgerSalesTaxList) },
    )

  const dateInput = (value: string, set: (v: string) => void) => (
    <div className="flex gap-2">
      <input type="date" value={toIso(value)} onChange={(e) => set(toUs(e.target.value))} className={inputCls} />
      <button type="button" onClick={() => set(today())} className="h-9 px-3 rounded-md border border-input-border text-sm text-text hover:bg-surface-hover">
        Now
      </button>
    </div>
  )

  const typeBtn = (active: boolean) =>
    `rounded-md border px-4 py-1.5 text-sm font-medium ${active ? 'border-brand bg-brand/10 text-brand' : 'border-input-border text-text hover:bg-surface-hover'}`

  return (
    <StickyFormShell
      scrollsInternally={false}
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Percent size={20} className="text-brand" /> VAT - New
        </h2>
      }
      footerLeft={null}
      footerRight={
        <>
          <button
            type="button"
            onClick={save}
            disabled={create.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
          <button
            type="button"
            onClick={() => navigate(ROUTES.ledgerSalesTaxList)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <X size={14} /> Cancel
          </button>
        </>
      }
    >
      {create.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-3.5 py-3 text-sm text-danger">
          {create.error instanceof Error ? create.error.message : 'Saving failed.'}
        </div>
      )}
      <Card className="!h-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
          <Field label="Type">
            <div className="flex gap-2">
              <button type="button" onClick={() => pickType(false)} className={typeBtn(!refund)}>
                Payment
              </button>
              <button type="button" onClick={() => pickType(true)} className={typeBtn(refund)}>
                Refund
              </button>
            </div>
          </Field>
          <Field label="Date of payment" required>
            {dateInput(datep, setDatep)}
          </Field>
          <Field label="End date for period" required>
            {dateInput(datev, setDatev)}
          </Field>

          <Field label="Label" required>
            <input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value)
                setLabelTouched(true)
              }}
              className={inputCls}
            />
          </Field>
          <Field label="Amount" required>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
          <Field label="Bank account" required>
            <select value={accountid} onChange={(e) => setAccountid(e.target.value)} className={inputCls}>
              {data.bankAccounts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payment Type" required>
            <select value={typePayment} onChange={(e) => setTypePayment(e.target.value)} className={inputCls}>
              {data.paymentTypes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Number" hint="(Check/Transfer NO)">
            <input value={numPayment} onChange={(e) => setNumPayment(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </Card>
    </StickyFormShell>
  )
}

export function SalesTaxCreatePage() {
  const { data, isLoading, isError, error, refetch } = useSalesTaxCreateForm()
  if (isLoading) return <LegacyLoadingCard label="Loading form…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return <SalesTaxForm data={data} />
}
