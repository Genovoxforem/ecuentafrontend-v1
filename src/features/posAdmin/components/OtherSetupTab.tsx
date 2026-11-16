import { useImperativeHandle, forwardRef } from 'react'
import { LoaderCircle, Circle, CircleCheck, Play, Square, RotateCw, ExternalLink, Radio, Bell } from 'lucide-react'
import { RealToggle } from '../../settings/components/RealToggle'
import { useOtherSetup, useWebSocketStatus, useWebSocketAction } from '../otherSetup.queries'
import type { TabHandle } from './tabHandle'
import logoFull from '../../../assets/Ecuenta_logo.png'

// takepos/admin/other.php has no form fields (see otherSetup.queries.ts), so the shared Save button has nothing to do here: save() is a no-op.
// Laid out like the classic page: an "External websites" table, a "WebSocket Notification Server" table (Status with Start / Refresh,
// Port, Server File) and a "Socket.IO Notifications" table. Port and Server File come from the classic page's own rows and show only when it is available.
const th = 'px-3 py-2.5 text-left text-xs font-semibold text-text'
const rowCls = 'border-t border-border'
const btn = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-50'

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
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-2">
              <th className={th}>External websites for more add-on (non-core) modules...</th>
              <th className={`${th} text-right`}>URL</th>
            </tr>
          </thead>
          <tbody>
            <tr className={rowCls}>
              <td className="px-3 py-4 text-text">
                <div className="flex items-center gap-6">
                  <img src={logoFull} alt="Ecuenta" className="h-14 w-auto shrink-0" />
                  <span className="mx-auto inline-flex items-center gap-2">
                    <ExternalLink size={14} className="text-text-faint" /> TakePOS modules and other POS solutions for Ecuenta
                  </span>
                </div>
              </td>
              {/* The classic page's link is a bare "#/45-Pos" fragment with no real target: shown as text, not as a link. */}
              <td className="px-3 py-4 text-right text-text-muted">#/45-Pos</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <h3 className="flex items-center gap-2 bg-surface-2 px-3 py-2.5 text-sm font-semibold text-text!">
          <Radio size={14} /> WebSocket Notification Server
        </h3>
        <table className="w-full text-sm">
          <tbody>
            <tr className={rowCls}>
              <th className={`${th} w-1/3`}>Status</th>
              <td className="px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5">
                  {wsLoading ? (
                    <LoaderCircle size={14} className="animate-spin text-text-faint" />
                  ) : ws?.running ? (
                    <CircleCheck size={14} className="text-success" />
                  ) : (
                    <Circle size={14} className="fill-danger text-danger" />
                  )}
                  {wsLoading ? 'Checking...' : ws?.running ? 'Running' : 'Stopped'}
                  {ws?.running && ws.pid > 0 && <span className="text-xs text-text-faint">(PID {ws.pid})</span>}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="inline-flex items-center gap-2">
                  {!ws?.running && (
                    <button type="button" disabled={wsAction.isPending} onClick={() => wsAction.mutate('start', { onSuccess: () => refetchWs() })} className={btn}>
                      <Play size={12} /> Start
                    </button>
                  )}
                  {ws?.running && (
                    <>
                      <button type="button" disabled={wsAction.isPending} onClick={() => wsAction.mutate('stop', { onSuccess: () => refetchWs() })} className={btn}>
                        <Square size={12} /> Stop
                      </button>
                      <button type="button" disabled={wsAction.isPending} onClick={() => wsAction.mutate('restart', { onSuccess: () => refetchWs() })} className={btn}>
                        <RotateCw size={12} /> Restart
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => refetchWs()} className={btn}>
                    <RotateCw size={12} /> Refresh
                  </button>
                </span>
              </td>
            </tr>
            {setup.port && (
              <tr className={rowCls}>
                <th className={th}>Port</th>
                <td className="px-3 py-2.5 text-text" colSpan={2}>
                  {setup.port}
                </td>
              </tr>
            )}
            {setup.serverFile && (
              <tr className={rowCls}>
                <th className={th}>Server File</th>
                <td className="px-3 py-2.5 font-mono text-xs text-danger" colSpan={2}>
                  {setup.serverFile}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {wsAction.isError && <p className="px-3 pb-3 text-xs text-danger">{wsAction.error instanceof Error ? wsAction.error.message : 'Failed.'}</p>}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <h3 className="flex items-center gap-2 bg-surface-2 px-3 py-2.5 text-sm font-semibold text-text!">
          <Bell size={14} /> Socket.IO Notifications
        </h3>
        <table className="w-full text-sm">
          <tbody>
            <tr className={rowCls}>
              <th className={`${th} w-1/3`}>Enable Notifications</th>
              <td className="px-3 py-2.5">
                <RealToggle constName="ENABLE_SOCKETIO_NOTIFICATIONS" initial={setup.socketioNotifications} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
})
