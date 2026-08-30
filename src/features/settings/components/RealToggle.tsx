import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useToggleConstant } from '../constantToggle.queries'

// A real toggle backed by core/ajax/constantonoff.php (see
// constantToggle.queries.ts's header comment for the exact contract and its
// "no read endpoint" caveat). `initial` is only a locally-assumed starting
// position (matching the reference screenshot's default), not a confirmed
// live value — every click after that is a genuine write.
export function RealToggle({ constName, initial = false, onValue = '1' }: { constName: string; initial?: boolean; onValue?: string | number }) {
  const [checked, setChecked] = useState(initial)
  const toggle = useToggleConstant()

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
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
