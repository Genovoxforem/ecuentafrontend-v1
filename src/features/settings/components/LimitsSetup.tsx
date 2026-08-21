import { useMemo, useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'w-20 h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm text-right outline-none focus:ring-2 focus:ring-brand/30'

function round(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

// Trims trailing zeros (3.5000 -> 3.5) without forcing a fixed decimal
// count, matching how the reference app displays these — e.g. VAT amounts
// below show their natural precision (0.5328), not padded to 8 places.
function trimmedFixed(value: number, maxDecimals: number) {
  return round(value, maxDecimals).toString()
}

interface Example {
  unitPrice: number
  qty: number
  vatRate: number
  vatLabel: string
}
const EXAMPLES: Example[] = [
  { unitPrice: 0.29, qty: 1, vatRate: 0, vatLabel: '0%' },
  { unitPrice: 3.33, qty: 1, vatRate: 0, vatLabel: '0%' },
  { unitPrice: 3.33, qty: 2, vatRate: 0, vatLabel: '0%' },
  { unitPrice: 3.33, qty: 1, vatRate: 16, vatLabel: '16% (A)' },
  { unitPrice: 3.33, qty: 2, vatRate: 16, vatLabel: '16% (A)' },
  { unitPrice: 3.33, qty: 1, vatRate: 16, vatLabel: '16% (B)' },
  { unitPrice: 3.33, qty: 2, vatRate: 16, vatLabel: '16% (B)' },
  { unitPrice: 3.33, qty: 1, vatRate: 16, vatLabel: '16% (RVAT)' },
  { unitPrice: 3.33, qty: 2, vatRate: 16, vatLabel: '16% (RVAT)' },
]

export function LimitsSetup() {
  const [maxDecimalsUnit, setMaxDecimalsUnit] = useState('5')
  const [maxDecimalsTotal, setMaxDecimalsTotal] = useState('2')
  const [maxDecimalsShown, setMaxDecimalsShown] = useState('8')
  const [roundingStep, setRoundingStep] = useState('')
  const [saved, setSaved] = useState(false)

  const totalDecimals = Math.max(0, Number(maxDecimalsTotal) || 0)
  const shownDecimals = Math.max(0, Number(maxDecimalsShown) || 0)

  // Genuinely recomputed from the parameters above on every render — this
  // mirrors the reference app's own "Examples with current configuration"
  // section, which is real live math (excl tax -> VAT -> incl tax,
  // rounded the same way the invoicing engine does), not fetched data.
  // There's nothing to call an API for here; editing Max Decimals For
  // Total Prices above actually changes every row below.
  const computed = useMemo(
    () =>
      EXAMPLES.map((ex) => {
        const excl = round(ex.unitPrice * ex.qty, totalDecimals)
        const vatRaw = excl * (ex.vatRate / 100)
        const incl = round(excl + vatRaw, totalDecimals)
        return { ...ex, excl, vat: trimmedFixed(vatRaw, shownDecimals), incl }
      }),
    [totalDecimals, shownDecimals],
  )

  function handleModify() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ArrowUpDown size={20} className="text-brand" /> Limits/Precision setup
      </h2>
      <p className="text-sm text-text-muted">You can define limits, precisions and optimizations used by Ecuenta here</p>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
          <span>Parameter</span>
          <span>Value</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm text-brand">Max. Decimals For Unit Prices</span>
          <input value={maxDecimalsUnit} onChange={(e) => setMaxDecimalsUnit(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm text-brand">Max. Decimals For Total Prices</span>
          <input value={maxDecimalsTotal} onChange={(e) => setMaxDecimalsTotal(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-4">
          <span className="text-sm text-brand max-w-3xl">
            Max. Decimals For Prices <b>Shown On Screen</b>. Add An Ellipsis "…" After This Parameter (e.g. "2…") If You Want To See "…" Suffixed To The Truncated Price.
          </span>
          <input value={maxDecimalsShown} onChange={(e) => setMaxDecimalsShown(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          <span className="text-sm text-brand max-w-3xl">
            Step Of Rounding Range (For Countries Where Rounding Is Done On Something Other Than Base 10. For Example, Put 0.05 If Rounding Is Done By 0.05 Steps)
          </span>
          <input value={roundingStep} onChange={(e) => setRoundingStep(e.target.value)} className={inputCls} placeholder="—" />
        </div>
      </Card>

      <div>
        <button type="button" onClick={handleModify} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">
          Modify
        </button>
      </div>
      {saved && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Saved (session-only — no limits/precision endpoint exists on this backend yet).</Card>}

      <div>
        <h3 className="text-base font-semibold text-text! mb-2">Examples with current configuration</h3>
        <p className="text-sm text-text-muted mb-2">Format: 1,234.5679</p>
        <div className="space-y-1 text-sm text-text-muted">
          {computed.map((ex, i) => (
            <p key={i}>
              Net unit price of a product: {ex.unitPrice} x Quantity: {ex.qty} - VAT: {ex.vatLabel} → Total price (excl/vat/incl tax) after rounding:{' '}
              <span className="text-text!">
                {ex.excl} / {ex.vat} / {ex.incl}
              </span>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
