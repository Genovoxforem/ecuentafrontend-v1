import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import { RealToggle } from '../../settings/components/RealToggle'
import { useBarSetup, useSaveBarSetup } from '../barSetup.queries'
import type { TabHandle } from './tabHandle'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'

export const BarSetupTab = forwardRef<TabHandle>(function BarSetupTab(_props, ref) {
  const { data: setup, isLoading, refetch } = useBarSetup()
  const save = useSaveBarSetup()
  const [supplementsCategory, setSupplementsCategory] = useState('-1')
  const [modifierCategory, setModifierCategory] = useState('-1')

  useEffect(() => {
    if (!setup) return
    setSupplementsCategory(setup.supplementsCategory)
    setModifierCategory(setup.modifierCategory)
  }, [setup])

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!setup) return
      await save.mutateAsync({ token: setup.token, supplementsCategory, modifierCategory })
      refetch()
    },
    isSaving: save.isPending,
  }))

  if (isLoading || !setup) {
    return (
      <div className="flex items-center justify-center gap-2 py-16">
        <LoaderCircle size={20} className="animate-spin text-brand" />
        <p className="text-sm text-text-faint">Loading real bar/restaurant settings…</p>
      </div>
    )
  }

  const toggle = (label: string, constName: string, initial: boolean) => (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <RealToggle constName={constName} initial={initial} />
    </div>
  )

  return (
    <div className="space-y-5">
      {toggle('Enable features for Bar or Restaurant', 'TAKEPOS_BAR_RESTAURANT', setup.barRestaurant)}

      {/* Real page's own Add floor/Add table/Generate Tables actions have
          no dedicated AJAX endpoint found on this page — read/write here
          would mean guessing a contract, so it says so instead of fabricating
          it (and does not link to the classic page: standing rule). */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="font-semibold text-text! mb-2">Floors &amp; Tables</h3>
        <p className="text-xs text-text-faint mb-2">Managing floor plans and tables isn't available here: no API exists for it yet (master report), so there is no page to open.</p>
      </div>

      <div className="rounded-lg border border-border p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-text-muted">Order Printers (enable)</span>
            <RealToggle constName="TAKEPOS_ORDER_PRINTERS" initial={setup.orderPrinters} />
          </div>
        </div>
        {toggle('Order Notes', 'TAKEPOS_ORDER_NOTES', setup.orderNotes)}
        {toggle('Use Basic Layout For Phones', 'TAKEPOS_PHONE_BASIC_LAYOUT', setup.phoneBasicLayout)}

        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm text-text-muted">Product Supplements</span>
          <RealToggle constName="TAKEPOS_SUPPLEMENTS" initial={setup.supplements} />
        </div>
        <div className="py-2 border-b border-border">
          <label className="block text-xs text-text-muted mb-1">Supplement Category</label>
          <select value={supplementsCategory} onChange={(e) => setSupplementsCategory(e.target.value)} className={fieldCls}>
            <option value="-1">Select a Category</option>
            {setup.categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm text-text-muted">Product Modifiers</span>
          <RealToggle constName="TAKEPOS_MODIFIERS" initial={setup.modifiers} />
        </div>
        <div className="py-2 border-b border-border">
          <label className="block text-xs text-text-muted mb-1">Modifier Category</label>
          <select value={modifierCategory} onChange={(e) => setModifierCategory(e.target.value)} className={fieldCls}>
            <option value="-1">Select a Category</option>
            {setup.categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        {toggle('QR — Customer Menu', 'TAKEPOS_QR_MENU', setup.qrMenu)}
        {toggle('QR — Order By The Customer Himself', 'TAKEPOS_AUTO_ORDER', setup.autoOrder)}
      </div>
    </div>
  )
})
