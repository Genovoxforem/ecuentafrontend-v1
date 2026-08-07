import { useState } from 'react'
import { X, LogIn, LogOut, type LucideIcon } from 'lucide-react'
import { useAttendanceStatus, useClockIn, useClockOut } from '../../../../features/attendance/attendance.queries'

function timeLabel(mysqlDateTime: string | null) {
  if (!mysqlDateTime) return '-'
  return new Date(mysqlDateTime.replace(' ', 'T')).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// Small variant-aware button matching this panel's source design system
// (components/ui/Button.jsx) — kept local since the app-wide shared Button
// doesn't have danger/success variants or an icon slot.
function PanelButton({
  variant,
  icon: Icon,
  disabled,
  onClick,
  children,
}: {
  variant: 'danger' | 'success'
  icon: LucideIcon
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const variantClass = variant === 'danger' ? 'bg-danger text-white hover:bg-danger-hover' : 'bg-success text-white hover:bg-success-hover'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed ${variantClass}`}
    >
      <Icon size={14} />
      {children}
    </button>
  )
}

// Ports the legacy Navbar's Clock In/Out button. Backed by
// useAttendanceStatus/useClockIn/useClockOut (stubbed in this project — see
// attendance.queries.ts), so status always reads "not clocked in" and the
// actions are no-ops. The legacy version opens a separate modal per action;
// this collapses both into one panel that shows whichever action is valid.
export function ClockInPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useAttendanceStatus()
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const pending = clockIn.isPending || clockOut.isPending

  async function handleSubmit() {
    setError('')
    try {
      if (data?.isClockedIn) {
        await clockOut.mutateAsync(note)
      } else {
        await clockIn.mutateAsync(note)
      }
      setNote('')
    } catch {
      setError('Could not update attendance.')
    }
  }

  return (
    <div className="absolute right-0 mt-1 w-72 bg-surface border border-border rounded-lg shadow-xl z-30">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-sm font-semibold text-text">Attendance</span>
        <button type="button" onClick={onClose} title="Close" className="p-1 rounded-md text-text-faint hover:bg-surface-alt">
          <X size={16} />
        </button>
      </div>

      <div className="p-3">
        {isLoading && <p className="text-xs text-text-faint text-center py-4">Loading…</p>}
        {data && (
          <>
            <div className="text-sm mb-3">
              {data.isClockedIn ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-success font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Clocked in
                  </span>
                  <div className="text-xs text-text-faint mt-0.5">
                    Since {timeLabel(data.clockInTime)} · {data.workingHours}h so far
                  </div>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-text-muted font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-fg" />
                  Not clocked in
                </span>
              )}
            </div>

            <label className="block text-xs text-text-muted mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full mb-3 px-2 py-1.5 rounded-md border border-input-border bg-white dark:bg-gray-900 text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />

            {error && <p className="text-xs text-danger mb-2">{error}</p>}

            <PanelButton variant={data.isClockedIn ? 'danger' : 'success'} icon={data.isClockedIn ? LogOut : LogIn} disabled={pending} onClick={handleSubmit}>
              {pending ? 'Saving…' : data.isClockedIn ? 'Clock Out' : 'Clock In'}
            </PanelButton>
          </>
        )}
      </div>
    </div>
  )
}
