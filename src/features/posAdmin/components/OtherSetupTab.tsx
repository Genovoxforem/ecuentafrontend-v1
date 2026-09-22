import { useImperativeHandle, forwardRef } from 'react'
import { LoaderCircle, Circle, CircleCheck, Play, Square, RotateCw, ExternalLink } from 'lucide-react'
import { RealToggle } from '../../settings/components/RealToggle'
import { useOtherSetup, useWebSocketStatus, useWebSocketAction } from '../otherSetup.queries'
import type { TabHandle } from './tabHandle'

// No classic form fields exist on this tab (see otherSetup.queries.ts's own
// comment) — nothing for the shared Save button to do here, so this tab's
// save() is a no-op.
export const OtherSetupTab = forwardRef<TabHandle>(function OtherSetupTab(_props, ref) {
  const { data: setup, isLoading } = useOtherSetup()
  const { data: ws, isLoading: wsLoading, refetch: refetchWs } = useWebSocketStatus()
  const wsAction = useWebSocketAction()

  useImperativeHandle(ref, () => ({ save: async () => {}, isSaving: false }))

  if (isLoading || !setup) {
    return (
      <div className="flex items-center justify-center gap-2 py-16">
        <LoaderCircle size={20} className="animate-spin text-brand" />
        <p className="text-sm text-text-faint">Loading real settings…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Real page's own link here is a bare "#/45-pos" fragment with no
          real external target (confirmed live) — shown as static text
          rather than fabricating a URL it doesn't actually have. */}
      <p className="flex items-center gap-1.5 text-sm text-text-faint">
        <ExternalLink size={14} /> TakePOS Modules and other POS solutions for Ecuenta
      </p>

      <div className="rounded-lg border border-border p-4">
        <h3 className="font-semibold text-text! mb-3">WebSocket Notification Server</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm">
            {wsLoading ? (
              <LoaderCircle size={14} className="animate-spin text-text-faint" />
            ) : ws?.running ? (
              <CircleCheck size={14} className="text-success" />
            ) : (
              <Circle size={14} className="text-danger" />
            )}
            {wsLoading ? 'Checking…' : ws?.running ? 'Running' : 'Stopped'}
          </span>
          {ws?.running && ws.pid > 0 && <span className="text-xs text-text-faint">PID {ws.pid}</span>}

          {!ws?.running && (
            <button
              type="button"
              disabled={wsAction.isPending}
              onClick={() => wsAction.mutate('start', { onSuccess: () => refetchWs() })}
              className="flex items-center gap-1 rounded-md bg-success px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Play size={12} /> Start
            </button>
          )}
          {ws?.running && (
            <>
              <button
                type="button"
                disabled={wsAction.isPending}
                onClick={() => wsAction.mutate('stop', { onSuccess: () => refetchWs() })}
                className="flex items-center gap-1 rounded-md border border-danger/40 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger-bg disabled:opacity-50"
              >
                <Square size={12} /> Stop
              </button>
              <button
                type="button"
                disabled={wsAction.isPending}
                onClick={() => wsAction.mutate('restart', { onSuccess: () => refetchWs() })}
                className="flex items-center gap-1 rounded-md bg-warning px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <RotateCw size={12} /> Restart
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => refetchWs()}
            className="flex items-center gap-1 rounded-md border border-input-border px-2.5 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover"
          >
            Refresh
          </button>
        </div>
        {wsAction.isError && <p className="text-xs text-danger mt-2">{wsAction.error instanceof Error ? wsAction.error.message : 'Failed.'}</p>}
      </div>

      <div className="rounded-lg border border-border p-4">
        <h3 className="font-semibold text-text! mb-3">Socket.IO Notifications</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Enable Notifications</span>
          <RealToggle constName="ENABLE_SOCKETIO_NOTIFICATIONS" initial={setup.socketioNotifications} />
        </div>
      </div>
    </div>
  )
})
