import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import { RealToggle } from '../../settings/components/RealToggle'
import { useAppearanceSetup, useSaveAppearanceSetup } from '../appearanceSetup.queries'
import type { TabHandle } from './tabHandle'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'
const COLOR_THEMES: [string, string][] = [
  ['0', 'Eldy'],
  ['1', 'Colorful'],
]
const LINE_COUNTS = ['1', '2', '3', '4', '5', '6']

export const AppearanceSetupTab = forwardRef<TabHandle>(function AppearanceSetupTab(_props, ref) {
  const { data: setup, isLoading, refetch } = useAppearanceSetup()
  const save = useSaveAppearanceSetup()
  const [colorTheme, setColorTheme] = useState('0')
  const [linesToShow, setLinesToShow] = useState('2')

  useEffect(() => {
    if (!setup) return
    setColorTheme(setup.colorTheme)
    setLinesToShow(setup.linesToShow)
  }, [setup])

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!setup) return
      await save.mutateAsync({ token: setup.token, colorTheme, linesToShow })
      refetch()
    },
    isSaving: save.isPending,
  }))

  if (isLoading || !setup) {
    return (
      <div className="flex items-center justify-center gap-2 py-16">
        <LoaderCircle size={20} className="animate-spin text-brand" />
        <p className="text-sm text-text-faint">Loading real appearance settings…</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
      <div>
        <label className="block text-xs text-text-muted mb-1">Color theme</label>
        <select value={colorTheme} onChange={(e) => setColorTheme(e.target.value)} className={fieldCls}>
          {COLOR_THEMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Hide Category Images</label>
        <RealToggle constName="TAKEPOS_HIDE_CATEGORY_IMAGES" initial={setup.hideCategoryImages} />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Hide Product Images</label>
        <RealToggle constName="TAKEPOS_HIDE_PRODUCT_IMAGES" initial={setup.hideProductImages} />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Number of lines of images to show</label>
        <select value={linesToShow} onChange={(e) => setLinesToShow(e.target.value)} className={fieldCls}>
          {LINE_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  )
})
