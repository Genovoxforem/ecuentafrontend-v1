import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { LoaderCircle, CircleCheck } from 'lucide-react'
import { RealToggle } from '../../settings/components/RealToggle'
import { useParametersSetup, useSaveParametersSetup, useSwitchNumberingModule } from '../parametersSetup.queries'
import type { TabHandle } from './tabHandle'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'
const TERMINAL_COUNTS = Array.from({ length: 8 }, (_, i) => String(i + 1))

export const ParametersSetupTab = forwardRef<TabHandle>(function ParametersSetupTab(_props, ref) {
  const { data: setup, isLoading, refetch } = useParametersSetup()
  const save = useSaveParametersSetup()
  const switchNumbering = useSwitchNumberingModule()

  const [numTerminals, setNumTerminals] = useState('1')
  const [rootCategoryId, setRootCategoryId] = useState('-1')
  const [sortProductField, setSortProductField] = useState('rowid')
  const [numpad, setNumpad] = useState('0')
  const [emailTemplate, setEmailTemplate] = useState('-1')

  useEffect(() => {
    if (!setup) return
    setNumTerminals(setup.numTerminals)
    setRootCategoryId(setup.rootCategoryId)
    setSortProductField(setup.sortProductField)
    setNumpad(setup.numpad)
    setEmailTemplate(setup.emailTemplate)
  }, [setup])

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!setup) return
      await save.mutateAsync({ token: setup.token, numTerminals, rootCategoryId, sortProductField, numpad, emailTemplate })
      refetch()
    },
    isSaving: save.isPending,
  }))

  if (isLoading || !setup) {
    return (
      <div className="flex items-center justify-center gap-2 py-16">
        <LoaderCircle size={20} className="animate-spin text-brand" />
        <p className="text-sm text-text-faint">Loading real parameters…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-text! mb-2">Numbering module for POS sales</h3>
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
              <tr className="border-t border-border">
                <td className="px-3 py-2.5 font-medium text-text!">Simple</td>
                <td className="px-3 py-2.5 text-text-muted">Returns the reference number with format TC0-yymm-nnnn where yy is year, mm is month and nnnn is sequential with no reset.</td>
                <td className="px-3 py-2.5 text-right">
                  {setup.activeNumberingModule === 'mod_takepos_ref_simple' ? (
                    <span className="inline-flex items-center gap-1 text-success text-xs font-medium"><CircleCheck size={13} /> Active</span>
                  ) : (
                    <button
                      type="button"
                      disabled={switchNumbering.isPending}
                      onClick={() => switchNumbering.mutate({ token: setup.token }, { onSuccess: () => refetch() })}
                      className="text-xs text-brand hover:underline disabled:opacity-50"
                    >
                      Set active
                    </button>
                  )}
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2.5 font-medium text-text!">Universal</td>
                <td className="px-3 py-2.5 text-text-muted">Returns a customizable number according to a defined mask.</td>
                <td className="px-3 py-2.5 text-right">
                  {setup.activeNumberingModule === 'other' ? (
                    <span className="inline-flex items-center gap-1 text-success text-xs font-medium"><CircleCheck size={13} /> Active</span>
                  ) : (
                    <span className="text-xs text-text-faint">—</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Number of Terminals</label>
          <select value={numTerminals} onChange={(e) => setNumTerminals(e.target.value)} className={fieldCls}>
            {TERMINAL_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Selling services</label>
          <RealToggle constName="CASHDESK_SERVICES" initial={setup.cashdeskServices} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Root category of products to sell</label>
          <select value={rootCategoryId} onChange={(e) => setRootCategoryId(e.target.value)} className={fieldCls}>
            <option value="-1">Select a Category</option>
            {setup.rootCategoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">Field for sorting products</label>
          <select value={sortProductField} onChange={(e) => setSortProductField(e.target.value)} className={fieldCls}>
            {setup.sortProductFieldOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Group same products lines</label>
          <RealToggle constName="TAKEPOS_GROUP_SAME_PRODUCT" initial={setup.groupSameProduct} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Type of Pad to enter payment</label>
          <select value={numpad} onChange={(e) => setNumpad(e.target.value)} className={fieldCls}>
            {setup.numpadOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">Add a "Direct cash payment" button</label>
          <RealToggle constName="TAKEPOS_DIRECT_PAYMENT" initial={setup.directPayment} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Template for email</label>
          <select value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)} className={fieldCls}>
            {setup.emailTemplateOptions.length === 0 && <option value="-1">None</option>}
            {setup.emailTemplateOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Control cash popup at opening POS</label>
          <RealToggle constName="TAKEPOS_CONTROL_CASH_OPENING" initial={setup.controlCashOpening} />
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">Add a "Gift receipt" button</label>
          <RealToggle constName="TAKEPOS_GIFT_RECEIPT" initial={setup.giftReceipt} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Allow delayed payment</label>
          <RealToggle constName="TAKEPOS_DELAYED_PAYMENT" initial={setup.delayedPayment} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Enable On screen Keyboard</label>
          <RealToggle constName="TAKEPOS_ONSCREEN_KEYBOARD" initial={setup.onscreenKeyboard} />
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">Enable Quick Synchronize</label>
          <RealToggle constName="TAKEPOS_QUICK_SYNCHRONIZE" initial={setup.quickSynchronize} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Enable Ecuenta POS</label>
          <RealToggle constName="ECUENTA_POS_ENABLED" initial={setup.ecuentaPosEnabled} />
        </div>
      </div>
    </div>
  )
})
