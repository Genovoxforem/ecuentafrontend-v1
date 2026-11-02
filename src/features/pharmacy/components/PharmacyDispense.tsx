import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CreditCard, Minus, Pill as PillIcon, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react'
import { PharmacyApiError } from '../pharmacy.api'
import { createSale } from '../pharmacy.actions'
import { usePharmacyMedicineSearch, usePharmacyPopular, type PharmacyMedicine } from '../pharmacy.queries'
import { kwacha } from '../pharmacyFormat'
import { pharmacyToast } from '../pharmacyToast'
import { Pill, Status } from './PharmacyUi'

interface CartLine {
  med: PharmacyMedicine
  qty: number
}

const PAYMENTS: [string, string][] = [['01', 'Cash'], ['05', 'Card'], ['06', 'Mobile']]
const FIELD = 'h-9 w-full rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const Key = ({ children }: { children: string }) => <kbd className="rounded border border-border bg-surface px-1.5 text-xs font-semibold text-text-faint">{children}</kbd>
const SheetKey = ({ children }: { children: string }) => (
  <kbd className="inline-block min-w-12 rounded-md border border-border bg-surface-hover px-2 py-1 text-center text-xs font-bold text-text-muted">{children}</kbd>
)
// The classic sale panel prints totals as "K 0.00" (a space), tiles as "K85.00".
const kw = (v: number) => `K ${(Math.round(v * 100) / 100 || 0).toFixed(2)}`
const isRx = (m: PharmacyMedicine) => !!m.rx_only || (!!m.schedule_class && m.schedule_class !== '')

// The classic "Keyboard shortcuts" sheet.
const SHORTCUTS: [string, string][] = [
  ['F2', 'Search / add item'],
  ['Enter', 'Add highlighted · confirm qty'],
  ['↑ ↓', 'Pick match'],
  ['F6', 'Discount %'],
  ['F7', 'Hold sale'],
  ['F12', 'Pay & fiscalise'],
  ['+ −', 'Selected line qty'],
  ['Del', 'Remove line'],
  ['Esc', 'Clear / cancel'],
]

// The classic POS / Dispense counter. Matches come from pos.php medicine_search?term= (popular_medicines while the box is
// empty — it answered an empty list on newecuenta). Enter on a match asks for the quantity, Enter again adds it. Hold only
// clears the sale (as the classic one does); Pay & fiscalise posts pos.php create_sale and opens the printable receipt.
export function PharmacyDispense() {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [term, setTerm] = useState('')
  const [mode, setMode] = useState<'search' | 'qty'>('search')
  const [pending, setPending] = useState<PharmacyMedicine | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [hi, setHi] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [customer, setCustomer] = useState('Walk-in')
  const [rxNo, setRxNo] = useState('')
  const [prescriber, setPrescriber] = useState('')
  const [pay, setPay] = useState('01')
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const discountInput = useRef<HTMLInputElement>(null)
  const search = usePharmacyMedicineSearch(mode === 'search' ? term : '')
  const popular = usePharmacyPopular()
  const shown = term && mode === 'search' ? search : popular
  const tiles = (shown.data ?? []).slice(0, 30)

  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 250)
    return () => clearTimeout(t)
  }, [text])
  useEffect(() => setHi(0), [term])

  const add = (med: PharmacyMedicine, qty = 1) => {
    setSel(med.id)
    setCart((c) => (c.some((l) => l.med.id === med.id) ? c.map((l) => (l.med.id === med.id ? { ...l, qty: l.qty + qty } : l)) : [...c, { med, qty }]))
  }
  const bump = (id: number, delta: number) => setCart((c) => c.flatMap((l) => (l.med.id !== id ? [l] : l.qty + delta <= 0 ? [] : [{ ...l, qty: l.qty + delta }])))
  const drop = (id: number) => {
    setCart((c) => c.filter((l) => l.med.id !== id))
    setSel((s) => (s === id ? null : s))
  }
  const toSearch = () => {
    setMode('search')
    setPending(null)
    setText('')
    setTimeout(() => input.current?.focus(), 0)
  }
  const pick = (m: PharmacyMedicine) => {
    setPending(m)
    setMode('qty')
    setText('1')
    setTimeout(() => {
      input.current?.focus()
      input.current?.select()
    }, 0)
  }
  const clearSale = () => {
    setCart([])
    setSel(null)
    setDiscount(0)
  }
  const focusDiscount = () => {
    discountInput.current?.focus()
    discountInput.current?.select()
  }
  const hold = () => {
    if (cart.length === 0) return
    pharmacyToast('Sale held')
    clearSale()
  }

  const subtotal = cart.reduce((s, l) => s + l.med.price_ttc * l.qty, 0)
  const off = (subtotal * Math.min(Math.max(discount, 0), 100)) / 100
  const total = subtotal - off

  async function payNow(code: string) {
    if (busy) return
    if (cart.length === 0) return pharmacyToast('Add at least one item — F2', true)
    setBusy(true)
    const lines = cart.map((l) => ({ product_id: l.med.id, qty: l.qty, price_ht: l.med.price_ht, price_ttc: l.med.price_ttc, tva_tx: Number(l.med.tva_tx ?? 0), ...(discount > 0 ? { discount_percent: discount } : {}) }))
    try {
      const r = await createSale(lines, code, prescriber)
      pharmacyToast(`Paid · ${r.invoice_ref ?? 'invoice'} · ZRA ${r.zra?.code || '—'}`)
      if (r.invoice_id && !window.open(`/takeposnew/receipt.php?invoice_id=${encodeURIComponent(String(r.invoice_id))}&print=1`, '_blank', 'noopener')) pharmacyToast('Allow pop-ups to auto-print the receipt', true)
      clearSale()
      toSearch()
      void qc.invalidateQueries({ queryKey: ['pharmacy'] })
    } catch (e) {
      pharmacyToast(e instanceof PharmacyApiError ? `Sale failed: ${e.message}` : 'Sale failed', true)
    } finally {
      setBusy(false)
    }
  }

  // Window shortcuts (read through a ref so the listener is added once).
  const live = useRef({ help, sel, cart, pay, hold, payNow, toSearch, clearSale, bump, drop })
  live.current = { help, sel, cart, pay, hold, payNow, toSearch, clearSale, bump, drop }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = live.current
      if (s.help) {
        if (e.key === 'Escape' || e.key === 'F1') {
          e.preventDefault()
          setHelp(false)
        }
        return
      }
      const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')
      if (e.key === 'F1') {
        e.preventDefault()
        setHelp(true)
      } else if (e.key === 'F2') {
        e.preventDefault()
        s.toSearch()
      } else if (e.key === 'F6') {
        e.preventDefault()
        focusDiscount()
      } else if (e.key === 'F7') {
        e.preventDefault()
        s.hold()
      } else if (e.key === 'F12') {
        e.preventDefault()
        void s.payNow(s.pay)
      } else if (!inField) {
        if (e.key === 'Escape') {
          e.preventDefault()
          if (s.cart.length) {
            s.clearSale()
            pharmacyToast('Sale cleared')
          }
        } else if ((e.key === '+' || e.key === '=') && s.sel !== null) {
          e.preventDefault()
          s.bump(s.sel, 1)
        } else if (e.key === '-' && s.sel !== null) {
          e.preventDefault()
          s.bump(s.sel, -1)
        } else if (e.key === 'Delete' && s.sel !== null) {
          e.preventDefault()
          s.drop(s.sel)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (mode === 'search') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (tiles.length) setHi((h) => (h + (e.key === 'ArrowDown' ? 1 : -1) + tiles.length) % tiles.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (tiles[hi]) pick(tiles[hi])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (text) setText('')
        else input.current?.blur()
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (pending) {
        const n = parseInt(text, 10)
        add(pending, !n || n < 1 ? 1 : n)
        toSearch()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      toSearch()
    }
  }

  const fkeys: [string, string, () => void, boolean?][] = [
    ['F2', 'Item', toSearch],
    ['F6', 'Disc', focusDiscount],
    ['F7', 'Hold', hold],
    ['F12', 'Pay', () => void payNow(pay), true],
  ]

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className="grid flex-1 min-h-0 grid-rows-[minmax(0,1fr)] gap-4 xl:grid-cols-[1fr_18rem]">
        <div className="min-h-0 min-w-0 space-y-4 overflow-y-auto pr-1">
          <div className="sticky top-0 z-10 -mb-1 flex gap-3 bg-surface pb-1">
            <div className={`relative flex-1 ${mode === 'qty' ? 'ring-2 ring-brand/40 rounded-xl' : ''}`}>
              {mode === 'qty' ? <PillIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand" /> : <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand" />}
              <input
                ref={input}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onSearchKey}
                aria-label="Command line"
                placeholder="Scan barcode or type medicine, generic or salt…"
                className="h-11 w-full rounded-xl border-2 border-brand bg-input-bg pl-10 pr-40 text-sm text-text outline-none"
              />
              <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 text-xs text-text-faint">
                {mode === 'qty' && pending ? `Qty × ${pending.label}` : 'Enter to add'} <Key>F2</Key>
              </span>
            </div>
            <button type="button" onClick={() => setHelp(true)} className="h-11 shrink-0 rounded-xl border border-border bg-surface-alt px-4 text-sm font-semibold text-text hover:bg-surface-hover">Shortcuts</button>
          </div>
          <Status loading={shown.isLoading} error={shown.error} empty={tiles.length === 0 && !!term && mode === 'search'} emptyText="No medicine matches." />
          {!term && !shown.isLoading && !shown.error && tiles.length === 0 && <p className="text-sm text-text-faint">No popular medicines yet — type or scan to find one.</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {tiles.map((m, i) => {
              const inCart = cart.find((l) => l.med.id === m.id)
              return (
                <div key={m.id} className={`relative rounded-xl border bg-surface-alt p-3 ${i === hi && mode === 'search' ? 'border-brand ring-1 ring-brand' : 'border-border'} ${inCart ? 'bg-brand/10' : ''}`} style={m.stock !== undefined && m.stock !== null && m.stock <= 0 ? { opacity: 0.55 } : undefined}>
                  {inCart && <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-(--color-brand) px-1 text-xs font-bold text-white">{inCart.qty}</span>}
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/10 text-brand"><PillIcon size={14} /></span>
                  <p className="mt-2 truncate text-sm font-semibold text-text!">{m.label}</p>
                  <p className="truncate text-xs text-text-faint">{[m.generic, m.strength, m.dosage_form].filter(Boolean).join(' · ') || m.ref}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-text! tabular-nums">{kwacha(m.price_ttc)}</span>
                    {isRx(m) ? <Pill tone="bad" dot={false}>Rx{m.schedule_class ? ` ${m.schedule_class}` : ''}</Pill> : <Pill tone="ok" dot={false}>OTC</Pill>}
                  </div>
                  <button type="button" aria-label={`Add ${m.label}`} onClick={() => add(m)} className="mt-2 grid h-8 w-8 place-items-center rounded-full bg-(--color-brand) text-white hover:bg-brand-hover"><Plus size={15} /></button>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-info-bg px-3 py-1 font-medium text-info-fg">● FEFO auto-batch</span>
            <span className="rounded-full bg-surface-hover px-3 py-1 font-medium text-text-muted">keyboard-first · touch optional</span>
          </div>
        </div>

        <section className="max-h-full self-start overflow-y-auto rounded-2xl border border-border bg-surface-alt">
          <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-text!">Current sale <span className="text-xs font-normal text-text-faint">#DRAFT</span></div>
          <div className="grid grid-cols-2 gap-2 px-4 pb-3">
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} aria-label="Customer" className={FIELD} />
            <input value={rxNo} onChange={(e) => setRxNo(e.target.value)} placeholder="Rx #" aria-label="Rx number" className={FIELD} />
            <input value={prescriber} onChange={(e) => setPrescriber(e.target.value)} placeholder="Prescriber (Dr. name · licence) — F4" aria-label="Prescriber" className={`${FIELD} col-span-2`} />
          </div>
          <div className="min-h-32 border-y border-border">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-text-faint">
                <ShoppingCart size={28} />
                Scan or type a medicine, or tap a tile. Press F2 to search.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {cart.map((l) => (
                  <li key={l.med.id} onClick={() => setSel(l.med.id)} className={`flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm ${l.med.id === sel ? 'bg-brand/10' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text!">{l.med.label}</p>
                      <p className="text-xs text-text-faint tabular-nums">{kwacha(l.med.price_ttc)} each</p>
                    </div>
                    <button type="button" aria-label="Less" onClick={() => bump(l.med.id, -1)} className="rounded border border-border p-1 hover:bg-surface-hover"><Minus size={12} /></button>
                    <span className="w-6 text-center tabular-nums">{l.qty}</span>
                    <button type="button" aria-label="More" onClick={() => bump(l.med.id, 1)} className="rounded border border-border p-1 hover:bg-surface-hover"><Plus size={12} /></button>
                    <span className="w-20 text-right font-semibold tabular-nums">{kwacha(l.med.price_ttc * l.qty)}</span>
                    <button type="button" aria-label="Remove" onClick={() => drop(l.med.id)} className="text-text-faint hover:text-danger-fg"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1.5 px-4 py-3 text-sm">
            <div className="flex justify-between text-text-muted"><span>Subtotal (incl. VAT)</span><b className="tabular-nums text-text!">{kw(subtotal)}</b></div>
            <div className="flex items-center justify-between text-text-muted">
              <label className="flex items-center gap-2">Discount <Key>F6</Key>
                <input ref={discountInput} type="number" min={0} max={100} value={discount} aria-label="Discount percent" onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} className="h-7 w-14 rounded border border-input-border bg-input-bg px-2 text-right text-text" /> %
              </label>
              <b className="tabular-nums text-text!">−{kw(off)}</b>
            </div>
            <div className="flex justify-between border-t border-dashed border-border pt-2 text-base font-bold text-text!"><span>Total</span><span className="tabular-nums">{kw(total)}</span></div>
            <div className="flex gap-2 pt-2">
              {PAYMENTS.map(([code, label]) => (
                <button key={code} type="button" onClick={() => setPay(code)} className={`rounded-full px-3 py-1 text-xs font-semibold ${pay === code ? 'bg-(--color-brand) text-white' : 'bg-surface-hover text-text-muted'}`}>{label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={hold} className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-text hover:bg-surface-hover">Hold <Key>F7</Key></button>
              <button type="button" onClick={() => { clearSale() }} className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-text hover:bg-surface-hover">Clear <Key>Esc</Key></button>
              <button type="button" disabled={busy} onClick={() => void payNow(pay)} className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-(--color-brand) text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60">
                <CreditCard size={16} /> {busy ? 'Fiscalising…' : 'Pay & fiscalise'} <kbd className="rounded bg-white/20 px-1.5 text-xs font-semibold">F12</kbd>
              </button>
            </div>
          </div>
        </section>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-text-muted">
        {fkeys.map(([k, label, fn, primary]) => (
          <button key={k} type="button" onClick={fn} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold ${primary ? 'border-transparent bg-(--color-brand) text-white' : 'border-border hover:bg-surface-hover'}`}><Key>{k}</Key> {label}</button>
        ))}
      </div>
      {help && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh]" onClick={(e) => e.target === e.currentTarget && setHelp(false)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface-alt">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-serif text-xl font-bold text-text!">Keyboard shortcuts</h3>
              <button type="button" aria-label="Close" onClick={() => setHelp(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-muted hover:bg-surface-hover"><X size={16} /></button>
            </div>
            <ul className="grid gap-x-8 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">
              {SHORTCUTS.map(([k, d]) => (
                <li key={k} className="flex items-center gap-3"><SheetKey>{k}</SheetKey><span className="text-text-muted">{d}</span></li>
              ))}
            </ul>
            <p className="px-5 pb-4 text-xs text-text-faint">In a browser tab, F5/F11/F12 may be claimed by the browser — use the on-screen buttons. The installed POS captures every key.</p>
          </div>
        </div>
      )}
    </div>
  )
}
