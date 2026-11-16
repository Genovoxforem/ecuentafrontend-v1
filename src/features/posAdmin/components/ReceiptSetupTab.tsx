import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import { RealToggle } from '../../settings/components/RealToggle'
import { useReceiptSetup, useSaveReceiptSetup, useSetPrintMethod, type PrintMethod } from '../receiptSetup.queries'
import type { TabHandle } from './tabHandle'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'
const YES_NO: [string, string][] = [
  ['1', 'Yes'],
  ['0', 'No'],
]

const METHODS: { key: PrintMethod; name: string; desc: string; setupHref?: string }[] = [
  { key: 'browser', name: 'Browser', desc: 'Simple and easy receipt printing. Only a few parameters to configure the receipt. Print via browser.' },
  { key: 'receiptprinter', name: 'Ecuenta Receipt Printer', desc: 'Powerful method with a lot of parameters. Full customizable with templates. Cannot print from the cloud.', setupHref: '/admin/receiptprinter.php' },
  { key: 'takeposconnector', name: 'TakePOS Connector', desc: 'External module with extra features. Posibility to print from the cloud.' },
]

export const ReceiptSetupTab = forwardRef<TabHandle>(function ReceiptSetupTab(_props, ref) {
  const { data: setup, isLoading, refetch } = useReceiptSetup()
  const save = useSaveReceiptSetup()
  const setMethod = useSetPrintMethod()

  const [header, setHeader] = useState('')
  const [footer, setFooter] = useState('')
  const [receiptName, setReceiptName] = useState('')
  const [showCustomer, setShowCustomer] = useState<'0' | '1'>('1')
  const [printPaymentMethod, setPrintPaymentMethod] = useState<'0' | '1'>('1')
  const [autoPrintTickets, setAutoPrintTickets] = useState<'0' | '1'>('1')

  useEffect(() => {
    if (!setup) return
    setHeader(setup.header)
    setFooter(setup.footer)
    setReceiptName(setup.receiptName)
    setShowCustomer(setup.showCustomer)
    setPrintPaymentMethod(setup.printPaymentMethod)
    setAutoPrintTickets(setup.autoPrintTickets)
  }, [setup])

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!setup) return
      await save.mutateAsync({ token: setup.token, header, footer, receiptName, showCustomer, printPaymentMethod, autoPrintTickets })
      refetch()
    },
    isSaving: save.isPending,
  }))

  if (isLoading || !setup) {
    return (
      <div className="flex items-center justify-center gap-2 py-16">
        <LoaderCircle size={20} className="animate-spin text-brand" />
        <p className="text-sm text-text-faint">Loading real receipt settings…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-text! mb-2">Print method</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface-2">
                <th className="font-medium px-3 py-2">Name</th>
                <th className="font-medium px-3 py-2">Description</th>
                <th className="font-medium px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {METHODS.map((m) => (
                <tr key={m.key} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium text-text!">{m.name}</td>
                  <td className="px-3 py-2.5 text-text-muted">
                    {m.desc}
                    {m.setupHref && (
                      <>
                        {' '}
                        <a href={m.setupHref} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          Setup
                        </a>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {/* The classic page shows a switch per method: the active one is on and has no link to turn it off; the others switch it on. */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={setup.activeMethod === m.key}
                      aria-label={`${m.name} print method`}
                      title={setup.activeMethod === m.key ? 'Active print method' : `Use ${m.name}`}
                      disabled={setMethod.isPending || setup.activeMethod === m.key || m.key === 'browser'}
                      onClick={() => m.key !== 'browser' && setMethod.mutate({ token: setup.token, value: m.key }, { onSuccess: () => refetch() })}
                      className={`h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-default ${setup.activeMethod === m.key ? 'bg-brand' : 'border border-border bg-surface-alt disabled:opacity-60'}`}
                    >
                      <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${setup.activeMethod === m.key ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-text!">Setup</h3>
        <div className="space-y-1">
          <span className="block text-xs text-text-muted">Group VAT by rate in tickets|receipts</span>
          <RealToggle constName="TAKEPOS_TICKET_VAT_GROUPPED" initial={setup.vatGrouped} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Free text on invoices - Header</label>
          <textarea value={header} onChange={(e) => setHeader(e.target.value)} rows={3} className={`${fieldCls} h-auto resize-y`} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Free text on invoices - Footer</label>
          <textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={3} className={`${fieldCls} h-auto resize-y`} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Receipt Name</label>
          <input value={receiptName} onChange={(e) => setReceiptName(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Print customer on tickets|receipts</label>
          <select value={showCustomer} onChange={(e) => setShowCustomer(e.target.value as '0' | '1')} className={fieldCls}>
            {YES_NO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Print payment method on tickets|receipts</label>
          <select value={printPaymentMethod} onChange={(e) => setPrintPaymentMethod(e.target.value as '0' | '1')} className={fieldCls}>
            {YES_NO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Automatically print tickets|receipts</label>
          <select value={autoPrintTickets} onChange={(e) => setAutoPrintTickets(e.target.value as '0' | '1')} className={fieldCls}>
            {YES_NO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
})
