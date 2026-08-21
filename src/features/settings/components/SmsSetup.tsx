import { useState } from 'react'
import { MessageSquare, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

export function SmsSetup() {
  const [disableSending, setDisableSending] = useState('Unknown')
  const [method, setMethod] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [saved, setSaved] = useState(false)

  function handleModify() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <MessageSquare size={20} className="text-brand" /> SMS setup
      </h2>
      <p className="text-sm text-text-muted">This page allows you to define global options on SMS features</p>

      <p className="text-sm text-warning-fg bg-warning-bg border border-warning/30 rounded-md px-3 py-2">
        No SMS sender manager available. A SMS sender manager is not installed with the default distribution because they depend on an external vendor — same gap on this backend, which has no SMS
        provider integration either.
      </p>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
          <span>Parameter</span>
          <span>Value</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm text-brand">Disable All SMS Sending (For Test Purposes Or Demos)</span>
          <select value={disableSending} onChange={(e) => setDisableSending(e.target.value)} className={selectCls + ' w-32'}>
            <option>Unknown</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-4">
          <span className="text-sm text-brand flex items-center gap-1.5">
            Method To Use To Send SMS
            {!method && <AlertTriangle size={13} className="text-danger" />}
          </span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={selectCls + ' w-40'}>
            <option value="">Undefined</option>
          </select>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-brand">Default Sender Phone Number For SMS Sending</span>
          <input value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} className={inputCls + ' w-48'} />
        </div>
      </Card>

      {saved && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Saved (session-only — no SMS-config endpoint exists on this backend yet).</Card>}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleModify} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          Modify
        </button>
        <button type="button" disabled title="No SMS provider is configured on this backend" className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-faint cursor-not-allowed">
          Test Sending
        </button>
      </div>
    </div>
  )
}
