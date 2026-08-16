import { useState } from 'react'
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

const inputCls = 'w-16 h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm text-right outline-none focus:ring-2 focus:ring-brand/30'

interface AlertRow {
  key: string
  icon: LucideIcon
  label: string
  days: number
}

// The reference app's own real alert catalog (its GET /admin/delais.php
// content, reproduced from the screenshot) — each is a "warn after N days"
// threshold, not a live alert feed, so there's nothing to fetch beyond the
// threshold value itself. No alerts-config endpoint exists on this backend
// (this is a Dolibarr llx_const-table page), so these are local-only,
// same convention as Widgets/Default Values elsewhere in this app.
const DEFAULT_ALERTS: AlertRow[] = [
  { key: 'agenda_events', icon: CalendarClock, label: 'Planned Events (Agenda Events) Not Completed', days: 7 },
  { key: 'project_not_closed', icon: Network, label: 'Project Not Closed In Time', days: 7 },
  { key: 'task_not_completed', icon: ListChecks, label: 'Planned Task (Project Tasks) Not Completed', days: 7 },
  { key: 'proposal_not_closed', icon: FileEdit, label: 'Proposal Not Closed', days: 31 },
  { key: 'proposal_not_billed', icon: FileEdit, label: 'Proposal Not Billed', days: 7 },
  { key: 'order_not_processed', icon: FileText, label: 'Order Not Processed', days: 2 },
  { key: 'unpaid_customer_invoice', icon: FileText, label: 'Unpaid Customer Invoice', days: 31 },
  { key: 'purchase_order_not_processed', icon: FileText, label: 'Purchase Order Not Processed', days: 7 },
  { key: 'unpaid_vendor_invoice', icon: FileText, label: 'Unpaid Vendor Invoice', days: 2 },
  { key: 'service_to_activate', icon: Cloud, label: 'Service To Activate', days: 0 },
  { key: 'expired_service', icon: Cloud, label: 'Expired Service', days: 0 },
  { key: 'pending_bank_reconciliation', icon: Landmark, label: 'Pending Bank Reconciliation', days: 62 },
  { key: 'check_deposit_not_done', icon: Landmark, label: 'Check Deposit Not Done', days: 0 },
  { key: 'delayed_membership_fee', icon: User, label: 'Delayed Membership Fee', days: 31 },
  { key: 'expense_report_to_approve', icon: Briefcase, label: 'Expense Report To Approve', days: 15 },
  { key: 'leave_requests_to_approve', icon: CalendarOff, label: 'Leave Requests To Approve', days: 0 },
]

const IMAGE_THRESHOLDS = ['<= 0', '<= 10', '<= 20', '<= 30', '> 30']

export function AlertsSetup() {
  const [alerts, setAlerts] = useState(DEFAULT_ALERTS)
  const [disableMeteo, setDisableMeteo] = useState('No')
  const [saved, setSaved] = useState(false)

  function setDays(key: string, days: number) {
    setAlerts((cur) => cur.map((a) => (a.key === key ? { ...a, days } : a)))
  }

  function handleModify() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <AlertTriangle size={20} className="text-brand" /> Delay before displaying a warning alert for:
      </h2>
      <p className="text-sm text-text-muted">
        Set the delay before an alert icon <AlertTriangle size={13} className="inline text-danger -mt-0.5" /> is shown onscreen for the late element. Only elements from enabled modules are shown.
      </p>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
          <span>Delay Before Displaying A Warning Alert For:</span>
          <span>Value</span>
        </div>
        {alerts.map((a) => (
          <div key={a.key} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 gap-4">
            <span className="flex items-center gap-2.5 text-sm text-brand min-w-0">
              <a.icon size={15} className="shrink-0 text-text-muted" />
              <span className="truncate">{a.label}</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <input type="number" min={0} value={a.days} onChange={(e) => setDays(a.key, Number(e.target.value))} className={inputCls} />
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
          <select value={disableMeteo} onChange={(e) => setDisableMeteo(e.target.value)} className="h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none">
            <option>No</option>
            <option>Yes</option>
          </select>
        </div>
      </Card>

      <Card className="!h-auto">
        <p className="text-sm text-text-muted mb-2">The following images will be shown on the dashboard when the number of late actions reach the following values: Standard mode enabled</p>
        <ul className="text-sm text-text-muted space-y-1">
          {IMAGE_THRESHOLDS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Card>

      {saved && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Saved (session-only — no alerts-config endpoint exists on this backend yet).</Card>}

      <div className="flex justify-start">
        <button type="button" onClick={handleModify} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">
          Modify
        </button>
      </div>
    </div>
  )
}
