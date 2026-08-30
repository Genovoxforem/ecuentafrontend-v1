import { useState } from 'react'
import { Cog } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-surface disabled:text-text-faint'

// No real API anywhere in this module (confirmed this session): "Available
// App/Modules" and "Find/Deploy External" are admin/modules.php in its 3
// modes (classic enable/disable form-POST + a static informational tab and
// a 3rd-party-site search proxy); "Develop Your Own" is purely static;
// "Const" is admin/const.php (real llx_const CRUD, classic form-POST); "Menu
// Setup" is admin/menus/index.php (real llx_menu CRUD, classic GET-links) —
// same content as MenusSetup.tsx's own "Menu Admin" tab, since
// modules_prepare_head() maps both UI tabs to that one file.
const TABS = ['Available App/Modules', 'Find External App/Modules', 'Deploy/Install External App/Module', 'Develop Your Own App/Modules', 'Const', 'Menu Setup'] as const
type Tab = (typeof TABS)[number]

// Real values as shown live on the reference page (admin/const.php) — kept
// as a static snapshot since there's no JSON endpoint to fetch or save
// these rows; editing is disabled rather than faked.
const CONST_ROWS = [
  { name: 'BANK_ASK_PAYMENT_BANK_DURING_PROPOSAL', value: '1', comment: 'Ask bank account during creation of a proposal' },
  { name: 'CONTRACT_SUPPORT_PRODUCTS', value: '1', comment: '' },
  { name: 'ECOMMERCENG_DEBUG', value: '0', comment: 'This is to enable ECommerceng log of web services requests' },
  { name: 'ECOMMERCENG_ENABLE_LOG_IN_NOTE', value: '0', comment: 'Store into private note the last full response returned by web service' },
  { name: 'ECOMMERCENG_MAXRECORD_PERSYNC', value: '2000', comment: 'Max nb of record per synch' },
  { name: 'ECOMMERCENG_MAXSIZE_MULTICALL', value: '400', comment: 'Max size for multicall' },
  { name: 'EXPENSEREPORT_ALLOW_OVERLAPPING_PERIODS', value: '1', comment: '' },
  { name: 'INVOICE_DISABLE_REPLACEMENT', value: '1', comment: '' },
  { name: 'MAIN_ENABLE_LOG_TO_HTML', value: '1', comment: 'If this option is set to 1, it is possible to see log output at end of HTML' },
  { name: 'MAIN_FEATURES_LEVEL', value: '2', comment: 'Level of features to show: -1=stable+deprecated, 0=stable only (default)' },
  { name: 'MAIN_SECURITY_CSRF_WITH_TOKEN', value: '0', comment: 'If this option is set to 1, a CSRF protection using an antiCSRF token is' },
  { name: 'TAKEPOS_WEIGHING_SCALE', value: '1', comment: '' },
  { name: 'USER_ACTIVE_TOKEN', value: '6', comment: '' },
  { name: 'USER_HIDE_INACTIVE_IN_COMBOBOX1', value: '0', comment: '' },
  { name: 'USER_POS_TOKEN', value: '6', comment: '' },
]

export function OtherSetup() {
  const [tab, setTab] = useState<Tab>('Const')

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Cog size={20} className="text-brand" /> Other Setup
      </h2>
      <p className="text-sm text-text-muted">This page allows you to edit (override) parameters not available in other pages. These are mostly reserved for developers/advanced troubleshooting only.</p>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px ${
              tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Available App/Modules' && (
        <Card className="!h-auto">
          <p className="text-sm text-text-faint italic">
            No real API exists for this page (admin/modules.php's module enable/disable is a classic form-POST) — and reproducing the full module grid (60+ real modules on this install) is
            out of scope for a design-only shell. Use the legacy system to enable/disable modules.
          </p>
        </Card>
      )}

      {tab === 'Find External App/Modules' && (
        <Card className="!h-auto">
          <p className="text-sm text-text-faint italic">
            Mostly static links plus a search proxy to an external 3rd-party marketplace site — no local API. Not reproduced here.
          </p>
        </Card>
      )}

      {tab === 'Deploy/Install External App/Module' && (
        <Card className="!h-auto space-y-3">
          <p className="text-sm text-text-muted">Upload a module package (zip) to install it.</p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-text-muted border border-input-border rounded px-3 py-2 cursor-pointer hover:bg-surface-hover">
              Choose File
              <input type="file" accept=".zip" className="hidden" />
            </label>
            <button type="button" disabled title="No real API exists for this page" className="rounded-md bg-neutral-bg px-4 py-2 text-sm font-medium text-text-faint cursor-default">
              Install
            </button>
          </div>
        </Card>
      )}

      {tab === 'Develop Your Own App/Modules' && (
        <Card className="!h-auto">
          <p className="text-sm text-text-muted">Purely informational tab on the reference page (links to the Dolibarr module-development documentation) — no data, nothing to wire.</p>
        </Card>
      )}

      {tab === 'Const' && (
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-4 border-b border-border">
            <input disabled placeholder="Name" className={`${inputCls} w-full`} />
            <input disabled placeholder="Value" className={`${inputCls} w-full`} />
            <div className="flex gap-2">
              <input disabled placeholder="Comment" className={`${inputCls} flex-1`} />
              <button type="button" disabled title="No real API exists for this page" className="rounded-md bg-neutral-bg px-4 text-sm font-medium text-text-faint cursor-default shrink-0">
                Add
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-4 py-2">Name</th>
                  <th className="font-medium px-4 py-2">Value</th>
                  <th className="font-medium px-4 py-2">Comment</th>
                </tr>
              </thead>
              <tbody>
                {CONST_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-text!">{row.name}</td>
                    <td className="px-4 py-2 text-text-muted">{row.value}</td>
                    <td className="px-4 py-2 text-text-faint">{row.comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-text-faint italic">
            Real values as read live on the reference page — no JSON endpoint exists to fetch or save these, so this table is a static snapshot rather than a live/editable one.
          </p>
        </Card>
      )}

      {tab === 'Menu Setup' && (
        <Card className="!h-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2">Menu</th>
                <th className="font-medium py-2">Position</th>
                <th className="font-medium py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="py-4 text-text-faint italic">
                  No real API exists to list custom menu entries here — same real llx_menu editor as Menus → Menu Admin, only a classic Dolibarr admin page.
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
