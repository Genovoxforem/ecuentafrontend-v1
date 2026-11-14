import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { ModulesPasswordGate } from './ModulesPasswordGate'
import { DeployExternalModule, DevelopOwnModule, FindExternalModules } from './ExternalModulesTabs'
import { Cog } from 'lucide-react'
import { SetupShell } from './SetupShell'
import { OtherSetupConstants } from './OtherSetupConstants'
import { MenuEntriesAdmin } from './MenuEntries'
import { OtherSetupModules } from './OtherSetupModules'

// "Available App/Modules" reads admin/fapi/modules.php and "Const" admin/fapi/consts.php (read-only, 5 Nov 2026). "Find / Deploy External" are
// admin/modules.php modes (a static informational tab and a 3rd-party-site search proxy); "Develop Your Own" is purely static; "Menu Setup"
// is admin/menus/index.php (llx_menu CRUD) - the same list as MenusSetup.tsx's "Menu Admin" tab (MenuEntries.tsx, admin/menus/fapi).
const TABS = ['Available App/Modules', 'Find External App/Modules', 'Deploy/Install External App/Module', 'Develop Your Own App/Modules', 'Const', 'Menu Setup'] as const
type Tab = (typeof TABS)[number]

export function OtherSetup() {
  // ?tab=modules opens the module list (the target of the "back to module list" button on the module setup pages).
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'modules' ? 'Available App/Modules' : 'Const')
  // The classic module list asks for a password first ("Login for Modules"); asked again each time the page is opened.
  const [modulesUnlocked, setModulesUnlocked] = useState(false)

  return (
    <SetupShell
      icon={Cog}
      title="Other Setup"
      description="This page allows you to edit (override) parameters not available in other pages. These are mostly reserved for developers/advanced troubleshooting only."
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

      {tab === 'Available App/Modules' && (modulesUnlocked ? <OtherSetupModules /> : <ModulesPasswordGate onUnlock={() => setModulesUnlocked(true)} onBack={() => navigate(ROUTES.home)} />)}

      {tab === 'Find External App/Modules' && <FindExternalModules />}

      {tab === 'Deploy/Install External App/Module' && <DeployExternalModule />}

      {tab === 'Develop Your Own App/Modules' && <DevelopOwnModule />}

      {tab === 'Const' && <OtherSetupConstants />}

      {tab === 'Menu Setup' && <MenuEntriesAdmin />}
    </SetupShell>
  )
}
