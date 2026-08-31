import { useState } from 'react'
import { ListTree } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'w-56 h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-surface disabled:text-text-faint'

// No screenshot exists for this page's exact layout (unlike the other 12
// Setup pages) — built from reading admin/menus.php (MenuHandlers tab,
// writes MAIN_MENU_STANDARD/MAIN_MENU_SMARTPHONE consts) and
// admin/menus/index.php (MenuAdmin tab, real llx_menu CRUD) directly.
// Same "no real API" verdict as every other Setup page: both are classic
// form-POST/GET-link pages, no JSON anywhere.
const TABS = ['Menu Handlers', 'Menu Admin', 'Add Menu Entry'] as const
type Tab = (typeof TABS)[number]

export function MenusSetup() {
  const [tab, setTab] = useState<Tab>('Menu Handlers')

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ListTree size={20} className="text-brand" /> Menus
      </h2>

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

      {tab === 'Menu Handlers' && (
        <>
          <p className="text-sm text-text-muted">Choose here the menu manager to use for standard usage, and for smartphone usage.</p>
          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_120px] px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
              <span>Menu</span>
              <span>Internal Users</span>
              <span>External Users</span>
            </div>
            <div className="grid grid-cols-[1fr_120px_120px] px-4 py-3 border-b border-border items-center">
              <span className="text-sm text-brand">Default Menu Manager</span>
              <select disabled className={`${inputCls} col-span-2 w-full`} title="No real API — no way to read installed menu handlers without scraping">
                <option>eldy_menu.php</option>
              </select>
            </div>
            <div className="grid grid-cols-[1fr_120px_120px] px-4 py-3 items-center">
              <span className="text-sm text-brand">Default Menu Manager For Smartphone</span>
              <select disabled className={`${inputCls} col-span-2 w-full`} title="No real API — no way to read installed menu handlers without scraping">
                <option>smartphone_menu.php</option>
              </select>
            </div>
          </Card>
          <div>
            <button type="button" disabled title="No real API exists for this page — see the module's other Setup pages" className="rounded-lg bg-neutral-bg px-6 py-2.5 text-sm font-medium text-text-faint cursor-default">
              Save
            </button>
          </div>
        </>
      )}

      {tab === 'Menu Admin' && (
        <>
          <p className="text-sm text-text-muted">Add, remove, or reorder custom top/left menu entries (llx_menu).</p>
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
                    No real API exists to list custom menu entries here — this page has no JSON equivalent, only a classic Dolibarr admin page.
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'Add Menu Entry' && (
        <>
          <p className="text-sm text-text-muted">Add a new custom top or left menu entry.</p>
          <Card className="!h-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['Menu Type', 'Title', 'URL', 'Language Key', 'Position'].map((label) => (
                <div key={label}>
                  <label className="text-xs text-text-faint">{label}</label>
                  <input disabled placeholder={label} title="No real create API exists for this page" className={`mt-1 ${inputCls} w-full`} />
                </div>
              ))}
            </div>
            <button type="button" disabled title="No real API exists for this page" className="mt-4 rounded-lg bg-neutral-bg px-6 py-2.5 text-sm font-medium text-text-faint cursor-default">
              Create Menu Entry
            </button>
          </Card>
        </>
      )}
    </div>
  )
}
