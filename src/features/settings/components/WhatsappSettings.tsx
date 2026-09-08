import { MessageCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-surface disabled:text-text-faint'

// compta/facture/send_whatsapp_settings.php — confirmed no JSON API by
// reading the file directly: it reads llx_whatsapp_settings with a plain
// SQL SELECT and prints either a create form (table empty) or a one-row
// table with an "Edit" link (table has a row), no fetch/AJAX involved in
// the read at all. The Save button posts to whatsapp_ajax.php, which IS a
// real write (raw INSERT/UPDATE into llx_whatsapp_settings) but returns
// plain text ("success"), not JSON, has no permission check of its own, and
// has no way from here to tell create from update without first scraping
// this page's own HTML to find an existing row's id — so, consistent with
// every other page in this Setup/Tools group (Menus, Other Setup, Cashflow
// Settings), the real write stays disabled rather than fired blind.
export function WhatsappSettings() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <MessageCircle size={20} className="text-brand" /> Whatsapp API Settings
      </h2>
      <a href="#" className="text-sm text-brand hover:underline">
        How to get token and instance id?
      </a>

      <Card className="!h-auto space-y-4">
        <div>
          <label className="block text-sm mb-1 text-text-muted">Token*</label>
          <input disabled placeholder="Your WhatsApp API token" title="No real API exists for this page — see the module's other Setup pages" className={inputCls + ' w-full max-w-md'} />
        </div>
        <div>
          <label className="block text-sm mb-1 text-text-muted">Instance ID*</label>
          <input disabled placeholder="Your WhatsApp Instance ID" title="No real API exists for this page — see the module's other Setup pages" className={inputCls + ' w-full max-w-md'} />
        </div>
        <button type="button" disabled title="No real API exists for this page" className="rounded-lg bg-neutral-bg px-6 py-2.5 text-sm font-medium text-text-faint cursor-default">
          Submit
        </button>
      </Card>

      <p className="text-xs text-text-faint italic">
        No screenshot of this page's current saved state exists — left showing the reference page's empty/create form rather than guessing whether a token is already configured.
      </p>
    </div>
  )
}
