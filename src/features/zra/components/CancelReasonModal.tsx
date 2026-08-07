import { useState } from 'react'
import { X } from 'lucide-react'

// Matches the real cancel flow (zra-import.php's fnacancelasy): a reason is
// required before zraupdateimport.php will accept the cancel (status=4).
export function CancelReasonModal({
  itemName,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  itemName: string
  onClose: () => void
  onConfirm: (reason: string) => void
  isSubmitting: boolean
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  function handleConfirm() {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation.')
      return
    }
    onConfirm(reason.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-lg font-semibold text-text!">Cancel Confirmation</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-text-muted">
            Cancel <span className="text-text font-medium">{itemName}</span>? This submits a cancellation to the live ZRA gateway.
          </p>
          <div>
            <label className="block text-sm mb-1 text-danger">Reason*</label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              rows={3}
              className="w-full px-3 py-1.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 resize-none"
              autoFocus
            />
            {error && <p className="text-xs text-danger mt-1">{error}</p>}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-text-muted hover:bg-surface-alt">
            Close
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md text-sm font-medium bg-danger text-white hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Cancelling…' : 'Confirm Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
