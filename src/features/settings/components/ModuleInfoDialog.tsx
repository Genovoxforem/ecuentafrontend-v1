import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { AdminModule } from '../adminSetup.data'
import { useModuleActivation } from '../moduleActivation.data'

// The dialog the classic page opens from a module's Log icon: the module name, then the tabs Description (description, Version, Descriptor File of Module, Origin)
// and Technical Services Provided. Everything shown comes from the module catalogue answer. The activation line comes from the module's MAIN_MODULE_* constant (moduleActivation.data.ts); the technical services have no API
// (admin/modulehelp.php is classic only), so that tab says so instead of showing empty values (master row AN-211).
const TABS = ['Description', 'Technical services provided'] as const

const originText = (m: AdminModule) => {
  if (m.nature === 'core') return 'Core'
  if (m.nature === 'external') return m.publisher ? `External - ${m.publisher}` : 'External'
  return m.nature ? m.nature.charAt(0).toUpperCase() + m.nature.slice(1) : '-'
}

export function ModuleInfoDialog({ module: m, onClose }: { module: AdminModule; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Description')
  const { data: activation } = useModuleActivation(m.className)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const label = 'w-1/3 px-3 py-2 text-text-muted'
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Module/Application" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-text!">Module/Application</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md bg-danger text-white hover:opacity-90">
            <X size={16} color="#ffffff" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="px-1 text-sm font-semibold text-brand">{m.name}</p>
          {activation?.found && (
            <div className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2 text-xs text-text-muted">
              <span>
                Latest activation date: <span className="text-text">{activation.date}</span>
              </span>
              <span>
                Latest activation IP: <span className="font-semibold text-text">{activation.ip}</span>
              </span>
            </div>
          )}
          <div role="tablist" className="flex gap-6 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-1 pb-2 text-xs font-bold uppercase tracking-wide ${tab === t ? 'border-brand text-text' : 'border-transparent text-text-muted hover:text-text'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Description' ? (
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <p className="mb-3 text-base font-medium text-text!">{m.description}</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-t border-border">
                    <th className={`${label} text-left font-normal`}>Version</th>
                    <td className="px-3 py-2 font-semibold text-text">{m.version || '-'}</td>
                  </tr>
                  <tr className="border-t border-border">
                    <th className={`${label} text-left font-normal`}>Descriptor File Of Module</th>
                    <td className="px-3 py-2 font-mono text-xs text-pink-400">{m.className}.class.php</td>
                  </tr>
                  <tr className="border-t border-border">
                    <th className={`${label} text-left font-normal`}>Origin</th>
                    <td className="px-3 py-2 font-semibold text-text">{originText(m)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface-2 p-4 text-sm italic text-text-muted">
              The technical services this module provides are not part of the module catalogue the API returns.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
