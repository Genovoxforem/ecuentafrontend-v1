import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useBankAccountsDropdown } from '../../banking/banking.queries'
import { useWarehouses } from '../../warehouses/warehouseExtras.queries'
import { useUsersSummary } from '../../users/users.queries'
import { useHotelCustomerSearch } from '../../hotel/hotel.queries'
import { useTerminalSetup, useSaveTerminalSetup, type SaveTerminalSetupInput } from '../terminalSetup.queries'
import type { TabHandle } from './tabHandle'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'
const YES_NO: [string, string][] = [
  ['1', 'Yes'],
  ['0', 'No'],
]
const COM_PORTS = Array.from({ length: 20 }, (_, i) => `COM${i + 1}`)
const BAUD_RATES = ['4800', '9600', '19200', '38400', '57600', '115200']

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="col-span-1">
      <label className={`block text-xs mb-1 ${required ? 'text-danger font-medium' : 'text-text-muted'}`}>
        {label}
        {required && ' *'}
      </label>
      {children}
      {hint && <p className="text-[11px] text-text-faint mt-1">{hint}</p>}
    </div>
  )
}

// terminal.php?terminal=<n> — see terminalSetupParser.ts / terminalSetup.queries.ts
// for the real field names, form action, and live-confirmed round-trip.
export const TerminalSetupTab = forwardRef<TabHandle, { terminal: 1 | 2 }>(function TerminalSetupTab({ terminal }, ref) {
  const { data: setup, isLoading, isError, error, refetch } = useTerminalSetup(terminal)
  const { data: bankAccounts } = useBankAccountsDropdown()
  const warehouses = useWarehouses()
  const { data: usersSummary } = useUsersSummary()
  const save = useSaveTerminalSetup()

  const [socidQuery, setSocidQuery] = useState('')
  const { data: customerResults } = useHotelCustomerSearch(socidQuery)
  const [form, setForm] = useState<SaveTerminalSetupInput | null>(null)

  useEffect(() => {
    if (!setup) return
    setForm({
      terminal,
      token: setup.token,
      socid: setup.socid,
      cash: setup.bankAccounts.cash,
      cheque: setup.bankAccounts.cheque,
      cb: setup.bankAccounts.cb,
      bankCheque041: setup.bankAccounts.bankCheque041,
      bankTransfer051: setup.bankAccounts.bankTransfer051,
      debitCard061: setup.bankAccounts.debitCard061,
      mobileMoney071: setup.bankAccounts.mobileMoney071,
      other081: setup.bankAccounts.other081,
      warehouseId: setup.warehouseId,
      forceDecreaseStock: setup.forceDecreaseStock,
      noDecreaseStock: setup.noDecreaseStock,
      keycodeForEnter: setup.keycodeForEnter,
      enablePasscode: setup.enablePasscode,
      terminalPasscode: '',
      connectorUrl: setup.connectorUrl,
      scaleComPort: setup.scaleComPort,
      scaleBaudRate: setup.scaleBaudRate,
      assignUserId: setup.assignUserId,
      adminUserId: setup.adminUserId,
      header: setup.header,
      footer: setup.footer,
    })
    setSocidQuery('')
  }, [setup, terminal])

  const set = <K extends keyof SaveTerminalSetupInput>(key: K, value: SaveTerminalSetupInput[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!form) return
      await save.mutateAsync(form)
      refetch()
    },
    isSaving: save.isPending,
  }))

  const bankAccountOptions = bankAccounts ?? []
  const bankSelect = (value: string, onChange: (v: string) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls}>
      <option value="-1">Select a bank account</option>
      {bankAccountOptions.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
    </select>
  )
  const userSelect = (value: string, onChange: (v: string) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls}>
      <option value="-1">Select a users</option>
      {(usersSummary?.users ?? []).map((u) => <option key={u.id} value={u.id}>{u.name || u.login}</option>)}
    </select>
  )
  const selectedCustomer = form && setup && form.socid === setup.socid && setup.socid !== '-1' && setup.socid !== ''

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-center">
        <LoaderCircle size={20} className="animate-spin text-brand" />
        <p className="text-sm text-text-faint">Loading real terminal {terminal} settings…</p>
      </div>
    )
  }
  if (isError) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger-bg p-4">
        <p className="text-sm font-semibold text-danger-fg">Couldn't load terminal settings</p>
        <p className="text-xs text-danger-fg/80 mt-0.5">{error instanceof Error ? error.message : 'Unknown error.'}</p>
        <button type="button" onClick={() => refetch()} className="text-xs font-medium text-danger-fg underline mt-2">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
        <div className="relative col-span-1">
          <Field label="Default generic third party to use for sales" required>
            <input
              value={socidQuery}
              onChange={(e) => setSocidQuery(e.target.value)}
              placeholder={selectedCustomer ? `Current: customer #${form.socid} — type to search and change` : 'Search customer (2+ chars)…'}
              className={fieldCls}
            />
          </Field>
          {socidQuery.trim().length >= 2 && customerResults && customerResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
              {customerResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => { set('socid', c.id); setSocidQuery(c.name) }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-surface-hover"
                >
                  <span className="text-text! truncate">{c.name}</span>
                  <span className="text-text-faint font-mono shrink-0">{c.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Field label="Default account to use to receive cash payments">{bankSelect(form.cash, (v) => set('cash', v))}</Field>
        <Field label="Default account to use to receive payments by check">{bankSelect(form.cheque, (v) => set('cheque', v))}</Field>

        <Field label="Default account to use to receive payments by credit cards">{bankSelect(form.cb, (v) => set('cb', v))}</Field>
        <Field label="Default account to use for payments in Bank cheque">{bankSelect(form.bankCheque041, (v) => set('bankCheque041', v))}</Field>
        <Field label="Default account to use for payments in Bank transfer">{bankSelect(form.bankTransfer051, (v) => set('bankTransfer051', v))}</Field>

        <Field label="Default account to use for payments in Debit card">{bankSelect(form.debitCard061, (v) => set('debitCard061', v))}</Field>
        <Field label="Default account to use for payments in Mobile money">{bankSelect(form.mobileMoney071, (v) => set('mobileMoney071', v))}</Field>
        <Field label="Default account to use for payments in Other">{bankSelect(form.other081, (v) => set('other081', v))}</Field>

        <Field label='Stock decrease for batch products was forced. Allow POS stock decrease even when Lot/Serial module is active (uses FEFO)'>
          <select value={form.forceDecreaseStock} onChange={(e) => set('forceDecreaseStock', e.target.value as '0' | '1')} className={fieldCls}>
            {YES_NO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label='Disable stock decrease when a sale is done from Point of Sale (if "no", stock decrease is done for each sale done from POS, irrespective of the option set in module Stock).'>
          <select value={form.noDecreaseStock} onChange={(e) => set('noDecreaseStock', e.target.value as '0' | '1')} className={fieldCls}>
            {YES_NO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <div />

        <Field label="Force and restrict warehouse to use for stock decrease">
          <select value={form.warehouseId} onChange={(e) => set('warehouseId', e.target.value)} className={fieldCls}>
            <option value="-1">Select a warehouse</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.ref}</option>)}
          </select>
        </Field>
        <div className="col-span-1 flex items-end pb-2">
          <p className="text-xs text-text-faint">Stock decrease for batch products was forced. Decrease first by the oldest eatby and sellby dates.</p>
        </div>
        <Field label='Key code for "Enter" defined in barcode reader (Example: 13)'>
          <input value={form.keycodeForEnter} onChange={(e) => set('keycodeForEnter', e.target.value)} className={fieldCls} />
        </Field>

        <Field label="Enable Admin Passcode">
          <select value={form.enablePasscode} onChange={(e) => set('enablePasscode', e.target.value as '0' | '1')} className={fieldCls}>
            {YES_NO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Terminal Passcode Value" hint="Use this passcode or the selected admin user password to authorize price changes.">
          <input
            type="password"
            value={form.terminalPasscode}
            onChange={(e) => set('terminalPasscode', e.target.value)}
            placeholder="Saved - enter new passcode to change"
            className={fieldCls}
          />
        </Field>
        <Field label="TakePOS Connector URL / IP address">
          <input value={form.connectorUrl} onChange={(e) => set('connectorUrl', e.target.value)} className={fieldCls} />
        </Field>

        <Field label="Weighing Scale COM Port">
          <select value={form.scaleComPort} onChange={(e) => set('scaleComPort', e.target.value)} className={fieldCls}>
            <option value="">-- Select COM Port --</option>
            {COM_PORTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Weighing Scale Baud Rate">
          <select value={form.scaleBaudRate} onChange={(e) => set('scaleBaudRate', e.target.value)} className={fieldCls}>
            {BAUD_RATES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Assign User Login">{userSelect(form.assignUserId, (v) => set('assignUserId', v))}</Field>

        <Field label="Admin/supervisor User Login">{userSelect(form.adminUserId, (v) => set('adminUserId', v))}</Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 border-t border-border" />
        <h3 className="text-sm font-semibold text-text!">Free text on invoices</h3>
        <div className="flex-1 border-t border-border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Field label="Header">
          <textarea value={form.header} onChange={(e) => set('header', e.target.value)} rows={5} className={`${fieldCls} h-auto resize-y`} />
        </Field>
        <Field label="Footer">
          <textarea value={form.footer} onChange={(e) => set('footer', e.target.value)} rows={5} className={`${fieldCls} h-auto resize-y`} />
        </Field>
      </div>
    </div>
  )
})
