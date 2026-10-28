import { useState } from 'react'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { useSetBatchTracking } from '../../products.queries'

// Lot/batch tracking on or off for one product. Turning it off is refused by the server while lots exist, and that
// message is shown as it comes.
export function BatchTrackingButton({ id, enabled }: { id: string; enabled: boolean }) {
  const confirm = useConfirm()
  const setTracking = useSetBatchTracking()
  const [error, setError] = useState('')
  async function toggle() {
    setError('')
    const turningOn = !enabled
    if (!(await confirm({ title: turningOn ? 'Enable lot tracking?' : 'Disable lot tracking?', message: turningOn ? 'Every stock movement of this product will then need a batch or serial number.' : 'Stock movements of this product will no longer carry a batch or serial number.', confirmLabel: turningOn ? 'Enable' : 'Disable', variant: 'default' }))) return
    setTracking.mutate({ id, enabled: turningOn }, { onError: (e) => setError(e instanceof Error ? e.message : 'Could not change the lot tracking.') })
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={setTracking.isPending} onClick={() => void toggle()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text text-sm font-medium hover:bg-surface-hover disabled:opacity-50">
        {setTracking.isPending ? 'Saving…' : enabled ? 'Disable lot tracking' : 'Enable lot tracking'}
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  )
}
