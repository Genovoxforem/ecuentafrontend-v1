import { useEffect, useState } from 'react'
import { MessageSquare, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SetupShell } from './SetupShell'
import { changedSettings, useSaveStoredSettings, useStoredSettings, type StoredValues } from '../storedSettings.data'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60'
const selectCls = inputCls + ' appearance-none'

// The two settings of the classic admin/sms.php edit form on newecuenta (names read from it, 6 Nov 2026): a Yes / No select (1 / 0) and the default
// sender phone number. Neither is stored there, and the form shows "No" and an empty number. That form has no "method" field because no SMS sender
// manager is installed: the classic view prints "Method to use to send SMS: Undefined", which is shown here as it is.
const DISABLE = 'MAIN_DISABLE_ALL_SMS'
const FROM = 'MAIN_MAIL_SMS_FROM'
const DEFAULTS: StoredValues = { [DISABLE]: '0', [FROM]: '' }

export function SmsSetup() {
  const stored = useStoredSettings(DEFAULTS)
  const save = useSaveStoredSettings()
  const [form, setForm] = useState<StoredValues>(DEFAULTS)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (stored.data) setForm(stored.data.values)
  }, [stored.data])

  const set = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }))

  async function handleModify() {
    setMessage(null)
    const changes = changedSettings(stored.data?.values ?? DEFAULTS, form)
    if (Object.keys(changes).length === 0) return setMessage({ ok: true, text: 'Nothing to save: no setting was changed.' })
    try {
      const n = await save.mutateAsync(changes)
      setMessage({ ok: true, text: `Saved (${n} setting${n === 1 ? '' : 's'}).` })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Could not save the settings.' })
    }
  }

  return (
    <SetupShell
      icon={MessageSquare}
      title="SMS setup"
      description="This page allows you to define global options on SMS features"
      onSave={handleModify}
      saveLabel="Modify"
      saving={save.isPending}
      saveDisabled={!stored.data}
      saved={message ? <span className={message.ok ? undefined : 'text-danger'}>{message.text}</span> : stored.isError ? <span className="text-danger">The stored settings could not be read (administrators only).</span> : undefined}
      footerExtra={
        <button type="button" disabled title="No SMS provider is configured on this backend" className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-faint cursor-not-allowed">
          Test Sending
        </button>
      }
    >
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
          <select value={form[DISABLE]} onChange={(e) => set(DISABLE, e.target.value)} disabled={!stored.data} aria-label="Disable all SMS sending" className={selectCls + ' w-32'}>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-4">
          <span className="text-sm text-brand flex items-center gap-1.5">
            Method To Use To Send SMS
            <AlertTriangle size={13} className="text-danger" />
          </span>
          <span className="text-sm text-text-muted">Undefined</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-brand">Default Sender Phone Number For SMS Sending</span>
          <input value={form[FROM]} onChange={(e) => set(FROM, e.target.value)} disabled={!stored.data} aria-label="Default sender phone number for SMS sending" className={inputCls + ' w-48'} />
        </div>
      </Card>
    </SetupShell>
  )
}
