import { Settings } from 'lucide-react'
import { Card } from '../../shared/components/dashboard/DashboardKit'

// Was leftover template scaffolding (fake "admin@example.com" form,
// pre-rebrand dark-slate theme, no connection to this app's real settings
// at all). The actual settings live under the Administrator sidebar menu's
// specific sub-pages (Company/Organization, Security, ...); this bare
// /settings route isn't linked from anywhere reachable, so it's just an
// honest landing rather than the previous fake form.
export function SettingsModule() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Settings size={20} className="text-brand" /> Settings
      </h2>
      <Card>
        <p className="text-sm text-text-muted">Use the Administrator menu in the sidebar for company, security, and other setup pages.</p>
      </Card>
    </div>
  )
}
