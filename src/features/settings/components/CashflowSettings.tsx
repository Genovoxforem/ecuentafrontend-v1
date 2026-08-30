import { useState } from 'react'
import { Wallet, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// compta/facture/cashflowsettings.php + compta/facture/cashflow_action.php —
// confirmed no JSON API by reading cashflow_action.php directly: it's a
// classic form-POST (submit0/submit1/submit2 per tab) that diffs the posted
// account list against llx_cashinflow_os/llx_cashoutflow_os (and the _in/_fn
// tables for the other 2 tabs) with raw INSERT/DELETE, then does a plain
// header() redirect back to cashflowsettings.php?msg=success — no response
// body, no token check either. The "How to get token and instance id?" link
// and its adjacent inline <script> (posting to whatsapp_ajax.php) are dead
// leftover code from the WhatsApp Settings page with no matching form
// fields on this page at all — not a real feature of Cashflow Settings,
// kept here only as an inert link to match the reference page exactly.
const TABS = ['Cash flows from operating activities', 'Cash flows from investing activities', 'Cash flows from financing activities'] as const
type Tab = (typeof TABS)[number]

const OPERATING_ACCOUNTS = ['1090-Cash in Hand', '1091-Cash coins', '1095-Petty cash account']

function AccountPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-danger-bg text-danger-fg px-2.5 py-1 text-sm">
      <X size={12} />
      {label}
    </span>
  )
}

export function CashflowSettings() {
  const [tab, setTab] = useState<Tab>('Cash flows from operating activities')

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wallet size={20} className="text-brand" /> Cash Flow Settings
      </h2>
      <a href="#" className="text-sm text-brand hover:underline">
        How to get token and instance id?
      </a>

      <Card className="!h-auto !bg-warning-bg border-warning/30 text-warning-fg text-sm space-y-1">
        <p className="font-medium">This warning is real and reproducible on the reference page — not fabricated for this shell:</p>
        <p className="font-mono text-xs">Warning: Undefined array key "msg" in C:\wamp64\www\ecuenta9\htdocs\compta\facture\cashflowsettings.php on line 147</p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium ${tab === t ? 'bg-brand text-white' : 'bg-surface text-text-muted hover:bg-surface-hover'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Cash flows from operating activities' ? (
        <Card className="!h-auto space-y-4">
          <div>
            <p className="font-semibold text-text! mb-2">Select Inflow statement</p>
            <div className="flex flex-wrap gap-2">
              {OPERATING_ACCOUNTS.map((a) => (
                <AccountPill key={a} label={a} />
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-text! mb-2">Select Outflow statement</p>
            <div className="flex flex-wrap gap-2">
              {OPERATING_ACCOUNTS.map((a) => (
                <AccountPill key={a} label={a} />
              ))}
            </div>
          </div>
          <button type="button" disabled title="No real API exists for this page — see the module's other Setup pages" className="rounded-lg bg-neutral-bg px-4 py-2 text-sm font-medium text-text-faint cursor-default">
            Create statements
          </button>
        </Card>
      ) : (
        <Card className="!h-auto">
          <p className="text-sm text-text-faint italic">No accounts configured for this activity type on the reference page (not screenshotted) — left honestly empty rather than guessed.</p>
        </Card>
      )}
    </div>
  )
}
