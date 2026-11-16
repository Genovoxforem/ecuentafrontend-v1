import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  Network,
  ListChecks,
  FileEdit,
  FileText,
  Cloud,
  Landmark,
  User,
  Briefcase,
  CalendarOff,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SetupShell } from './SetupShell'
import { changedSettings, useSaveStoredSettings, useStoredSettings, type StoredValues } from '../storedSettings.data'

const inputCls = 'w-16 h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm text-right outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60'

interface AlertRow {
  // the setting constant the classic admin/delais.php edit form posts (read from that form on newecuenta, 6 Nov 2026: the same 16 inputs in this order)
  constant: string
  icon: LucideIcon
  label: string
}

const ALERTS: AlertRow[] = [
  { constant: 'MAIN_DELAY_ACTIONS_TODO', icon: CalendarClock, label: 'Planned Events (Agenda Events) Not Completed' },
  { constant: 'MAIN_DELAY_PROJECT_TO_CLOSE', icon: Network, label: 'Project Not Closed In Time' },
  { constant: 'MAIN_DELAY_TASKS_TODO', icon: ListChecks, label: 'Planned Task (Project Tasks) Not Completed' },
  { constant: 'MAIN_DELAY_PROPALS_TO_CLOSE', icon: FileEdit, label: 'Proposal Not Closed' },
  { constant: 'MAIN_DELAY_PROPALS_TO_BILL', icon: FileEdit, label: 'Proposal Not Billed' },
  { constant: 'MAIN_DELAY_ORDERS_TO_PROCESS', icon: FileText, label: 'Order Not Processed' },
  { constant: 'MAIN_DELAY_CUSTOMER_BILLS_UNPAYED', icon: FileText, label: 'Unpaid Customer Invoice' },
  { constant: 'MAIN_DELAY_SUPPLIER_ORDERS_TO_PROCESS', icon: FileText, label: 'Purchase Order Not Processed' },
  { constant: 'MAIN_DELAY_SUPPLIER_BILLS_TO_PAY', icon: FileText, label: 'Unpaid Vendor Invoice' },
  { constant: 'MAIN_DELAY_NOT_ACTIVATED_SERVICES', icon: Cloud, label: 'Service To Activate' },
  { constant: 'MAIN_DELAY_RUNNING_SERVICES', icon: Cloud, label: 'Expired Service' },
  { constant: 'MAIN_DELAY_TRANSACTIONS_TO_CONCILIATE', icon: Landmark, label: 'Pending Bank Reconciliation' },
  { constant: 'MAIN_DELAY_CHEQUES_TO_DEPOSIT', icon: Landmark, label: 'Check Deposit Not Done' },
  { constant: 'MAIN_DELAY_MEMBERS', icon: User, label: 'Delayed Membership Fee' },
  { constant: 'MAIN_DELAY_EXPENSEREPORTS', icon: Briefcase, label: 'Expense Report To Approve' },
  { constant: 'MAIN_DELAY_HOLIDAYS', icon: CalendarOff, label: 'Leave Requests To Approve' },
]

// "Disable meteorological view": the select of the classic form (values 0 / 1 / 2).
const METEO_OPTIONS = [
  { value: '0', label: 'No' },
  { value: '1', label: 'Yes' },
  { value: '2', label: 'On small screen (smartphone) only' },
]
const METEO_LEVELS = ['MAIN_METEO_LEVEL0', 'MAIN_METEO_LEVEL1', 'MAIN_METEO_LEVEL2', 'MAIN_METEO_LEVEL3']

// What the classic form shows for a setting that is not stored: a delay of 0 and the meteo defaults (0 / 10 / 20 / 30).
const DEFAULTS: StoredValues = {
  ...Object.fromEntries(ALERTS.map((a) => [a.constant, '0'])),
  MAIN_DISABLE_METEO: '0',
  MAIN_METEO_LEVEL0: '0',
  MAIN_METEO_LEVEL1: '10',
  MAIN_METEO_LEVEL2: '20',
  MAIN_METEO_LEVEL3: '30',
}

// Setup > Alerts: the delays are the MAIN_DELAY_* constants and the weather-icon setting, read with core/fapi/constants.php and saved with
// admin/fapi/const_save.php (only the ones that changed). The image thresholds are drawn from the stored MAIN_METEO_LEVEL values.
export function AlertsSetup() {
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

  const levels = METEO_LEVELS.map((n) => form[n])
  const thresholds = [`<= ${levels[0]}`, `<= ${levels[1]}`, `<= ${levels[2]}`, `<= ${levels[3]}`, `> ${levels[3]}`]

  return (
    <SetupShell
      icon={AlertTriangle}
      title="Delay before displaying a warning alert for:"
      description={
        <>
          Set the delay before an alert icon <AlertTriangle size={13} className="inline text-danger -mt-0.5" /> is shown onscreen for the late element. Only elements from enabled modules are shown.
        </>
      }
      onSave={handleModify}
      saveLabel="Modify"
      saving={save.isPending}
      saveDisabled={!stored.data}
      saved={message ? <span className={message.ok ? undefined : 'text-danger'}>{message.text}</span> : stored.isError ? <span className="text-danger">The stored delays could not be read (administrators only).</span> : undefined}
    >
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
          <span>Delay Before Displaying A Warning Alert For:</span>
          <span>Value</span>
        </div>
        {ALERTS.map((a) => (
          <div key={a.constant} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 gap-4">
            <span className="flex items-center gap-2.5 text-sm text-brand min-w-0">
              <a.icon size={15} className="shrink-0 text-text-muted" />
              <span className="truncate">{a.label}</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <input type="number" min={0} value={form[a.constant]} onChange={(e) => set(a.constant, e.target.value)} disabled={!stored.data} aria-label={a.label} className={inputCls} />
              <span className="text-sm text-text-muted">Days</span>
            </span>
          </div>
        ))}

        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
          <span>Parameter</span>
          <span>Value</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm text-brand">Disable Meteorological View</span>
          <select value={form.MAIN_DISABLE_METEO} onChange={(e) => set('MAIN_DISABLE_METEO', e.target.value)} disabled={!stored.data} aria-label="Disable Meteorological View" className="h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none">
            {METEO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="!h-auto">
        <p className="text-sm text-text-muted mb-2">The following images will be shown on the dashboard when the number of late actions reach the following values: Standard mode enabled</p>
        <ul className="text-sm text-text-muted space-y-1">
          {thresholds.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </Card>
    </SetupShell>
  )
}
