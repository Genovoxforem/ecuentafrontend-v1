import { useState } from 'react'
import { Wallet, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { accountLabel, useCashflowSettings, type CashflowSection } from '../whatsappCashflow.data'
import { SetupShell } from './SetupShell'

// compta/facture/cashflowsettings.php: one form per section (operating / investing / financing) with Inflow and Outflow lists and a submit. The accounts are read
// from admin/fapi/cashflow.php (12 Nov 2026, AN-182 read side). The save has no key-authenticated writer yet (the classic page posts to cashflow_action.php on the
// PHP session, which this app does not use any more: BUG-95), so the lists are read-only and "Create statements" stays disabled until the backend adds one.
// The "How to get token and instance id?" link and the PHP warning card are what the reference page prints (dead leftovers from the WhatsApp page), kept to match it.
const TABS: { label: string; key: CashflowSection }[] = [
  { label: 'Cash flows from operating activities', key: 'operating' },
  { label: 'Cash flows from investing activities', key: 'investing' },
  { label: 'Cash flows from financing activities', key: 'financing' },
]

function AccountPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-danger-bg text-danger-fg px-2.5 py-1 text-sm">
      <X size={12} />
      {label}
    </span>
  )
}

function AccountGroup({ title, codes, labels }: { title: string; codes: string[]; labels: ReadonlyMap<string, string> }) {
  return (
    <div>
      <p className="font-semibold text-text! mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {codes.length === 0 ? <span className="text-sm text-text-faint italic">No account selected.</span> : codes.map((c) => <AccountPill key={c} label={accountLabel(c, labels)} />)}
      </div>
    </div>
  )
}

export function CashflowSettings() {
  const [tab, setTab] = useState<CashflowSection>('operating')
  const { data, isLoading, isError, error, refetch } = useCashflowSettings()
  const section = data?.sections[tab]

  return (
    <SetupShell
      icon={Wallet}
      title="Cash Flow Settings"
      description={
        <a href="#" className="text-brand hover:underline">
          How to get token and instance id?
        </a>
      }
      underlinedTabs={false}
      tabs={TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setTab(t.key)}
          className={`rounded-md px-4 py-2 text-sm font-medium ${tab === t.key ? 'bg-brand text-white' : 'bg-surface text-text-muted hover:bg-surface-hover'}`}
        >
          {t.label}
        </button>
      ))}
    >
      {isLoading && <LegacyLoadingCard label="Loading the cash flow accounts…" />}
      {isError && <LegacyErrorCard title="Couldn't load the cash flow settings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && section && (
        <Card className="!h-auto space-y-4">
          <AccountGroup title="Select Inflow statement" codes={section.inflow} labels={data.labels} />
          <AccountGroup title="Select Outflow statement" codes={section.outflow} labels={data.labels} />
          <button type="button" disabled title="The API only reads these accounts: there is no key-authenticated save yet (master AN-182)" className="rounded-lg bg-neutral-bg px-4 py-2 text-sm font-medium text-text-faint cursor-default">
            Create statements
          </button>
        </Card>
      )}
    </SetupShell>
  )
}
