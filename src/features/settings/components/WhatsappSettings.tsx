import { MessageCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useWhatsappSettings } from '../whatsappCashflow.data'
import { SetupShell } from './SetupShell'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-surface disabled:text-text-faint'

// compta/facture/send_whatsapp_settings.php reads llx_whatsapp_settings with a plain SQL SELECT; the Save button posts to whatsapp_ajax.php, a real write
// (raw INSERT/UPDATE) that answers plain text, so the save has no key-authenticated API and stays on the classic page (the fields stay disabled).
// The saved instance id and whether a token exists are read from admin/fapi/whatsapp.php (12 Nov 2026, AN-181 read side); the token itself is never sent.
export function WhatsappSettings() {
  const { data, isLoading, isError, error, refetch } = useWhatsappSettings()

  return (
    <SetupShell
      icon={MessageCircle}
      title="Whatsapp API Settings"
      description={
        <a href="#" className="text-brand hover:underline">
          How to get token and instance id?
        </a>
      }
    >
      {isLoading && <LegacyLoadingCard label="Loading the WhatsApp settings…" />}
      {isError && <LegacyErrorCard title="Couldn't load the WhatsApp settings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && (
        <>
          <Card className="!h-auto space-y-4">
            <div>
              <label className="block text-sm mb-1 text-text-muted">Token*</label>
              <input
                disabled
                readOnly
                value={data.tokenSet ? '••••••••' : ''}
                placeholder="Your WhatsApp API token"
                title="Saved on the classic page: the API only reads these settings (the token is never sent)"
                className={inputCls + ' w-full max-w-md'}
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-text-muted">Instance ID*</label>
              <input
                disabled
                readOnly
                value={data.instance}
                placeholder="Your WhatsApp Instance ID"
                title="Saved on the classic page: the API only reads these settings"
                className={inputCls + ' w-full max-w-md'}
              />
            </div>
            <button type="button" disabled title="Saved on the classic page: the API only reads these settings" className="rounded-lg bg-neutral-bg px-6 py-2.5 text-sm font-medium text-text-faint cursor-default">
              Submit
            </button>
          </Card>
          {!data.enabled && data.note && <p className="text-xs text-text-faint italic">{data.note}</p>}
        </>
      )}
    </SetupShell>
  )
}
