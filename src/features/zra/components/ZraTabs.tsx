import { Globe, LayoutDashboard } from 'lucide-react'
import { useZraMonitorUrl } from '../zra.queries'

export type ZraTab = 'dashboard' | 'monitor'

const TABS: { key: ZraTab; label: string; icon: typeof Globe }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'monitor', label: 'ZRA Monitor', icon: Globe },
]

// The backend dashboard's two tabs: the synchronization Dashboard and the
// ZRA Monitor (the ZRA server analysis page in a frame).
export function ZraTabs({ value, onChange, embedded = false }: { value: ZraTab; onChange: (tab: ZraTab) => void; embedded?: boolean }) {
  return (
    <div role="tablist" className={`flex items-center gap-1.5 ${embedded ? '' : 'rounded-xl border border-border bg-surface-alt p-1.5'}`}>
      {TABS.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              active ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:bg-surface-hover hover:text-text'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        )
      })}
    </div>
  )
}

export function ZraMonitorTab() {
  const { data: url, isLoading, isError, error, refetch } = useZraMonitorUrl(true)

  if (isLoading) return <p className="text-sm text-text-muted">Loading the ZRA monitor…</p>
  if (isError) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
        {error instanceof Error ? error.message : 'Could not load the ZRA monitor.'}{' '}
        <button type="button" onClick={() => refetch()} className="font-medium underline">
          Retry
        </button>
      </div>
    )
  }
  if (!url) return <p className="text-sm text-text-muted">The backend has no ZRA monitor page configured.</p>

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-alt">
      <iframe src={url} title="ZRA server analysis" loading="lazy" className="block h-[780px] w-full border-0 max-md:h-[900px]" />
    </div>
  )
}
