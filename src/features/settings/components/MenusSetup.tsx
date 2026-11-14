import { useState } from 'react'
import { ListTree } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SetupShell } from './SetupShell'
import { MenuEntriesAdmin, MenuEntryForm } from './MenuEntries'

const inputCls = 'w-56 h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-surface disabled:text-text-faint'

// Built from reading admin/menus.php (MenuHandlers tab, writes MAIN_MENU_STANDARD/MAIN_MENU_SMARTPHONE consts, no JSON API: still disabled) and
// admin/menus/index.php (Menu Admin tab, llx_menu CRUD): the Menu Admin and Add Menu Entry tabs run on admin/menus/fapi (menus.php, menu_save.php,
// menu_delete.php, menu_move.php), see MenuEntries.tsx.
const TABS = ['Menu Handlers', 'Menu Admin', 'Add Menu Entry'] as const
type Tab = (typeof TABS)[number]

export function MenusSetup() {
  const [tab, setTab] = useState<Tab>('Menu Handlers')

  return (
    <SetupShell
      icon={ListTree}
      title="Menus"
      tabs={TABS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 ${
            tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          {t}
        </button>
      ))}
    >

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
              <select disabled className={`${inputCls} col-span-2 w-full`} title="No JSON API reads or saves the menu manager choice">
                <option>eldy_menu.php</option>
              </select>
            </div>
            <div className="grid grid-cols-[1fr_120px_120px] px-4 py-3 items-center">
              <span className="text-sm text-brand">Default Menu Manager For Smartphone</span>
              <select disabled className={`${inputCls} col-span-2 w-full`} title="No JSON API reads or saves the menu manager choice">
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
          <MenuEntriesAdmin />
        </>
      )}

      {tab === 'Add Menu Entry' && (
        <>
          <p className="text-sm text-text-muted">Add a new custom top or left menu entry.</p>
          <MenuEntryForm handlers={['all']} onDone={() => setTab('Menu Admin')} />
        </>
      )}
    </SetupShell>
  )
}
