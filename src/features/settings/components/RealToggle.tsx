import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useToggleConstant } from '../constantToggle.queries'

// A real toggle: it writes the constant through admin/fapi/const_save.php / const_delete.php, or the classic core/ajax/constantonoff.php when the
// instance has no such route (see constantToggle.queries.ts for the write contract). `initial` is the position
// the switch starts in: the Setup screens read it from core/fapi/constants.php (settingConstants.data.ts) and pass `loading` until that
// answers, so the switch never shows a position it only assumed; every click after that is a genuine write.
export function RealToggle({ constName, initial = false, onValue = '1', loading = false }: { constName: string; initial?: boolean; onValue?: string | number; loading?: boolean }) {
  if (loading) return <span aria-label="Loading" className="inline-block h-5 w-9 animate-pulse rounded-full border border-border bg-surface-alt" />
  return <ToggleSwitch constName={constName} initial={initial} onValue={onValue} />
}

function ToggleSwitch({ constName, initial, onValue }: { constName: string; initial: boolean; onValue: string | number }) {
  const [checked, setChecked] = useState(initial)
  const toggle = useToggleConstant()

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-const={constName}
        disabled={toggle.isPending}
        onClick={() => {
          const next = !checked
          setChecked(next)
          toggle.mutate(
            { name: constName, on: next, value: onValue },
            { onError: () => setChecked(!next) },
          )
        }}
        className={`w-9 h-5 rounded-full transition-colors shrink-0 disabled:opacity-60 ${checked ? 'bg-brand' : 'bg-surface-alt border border-border'}`}
      >
        <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      {toggle.isPending && <Loader2 size={12} className="animate-spin text-text-faint" />}
      {toggle.isError && <span className="text-xs text-danger">Failed to save</span>}
    </div>
  )
}
