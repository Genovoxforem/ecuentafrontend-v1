import { Link } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'

// Static info page — admin/index.php has no $action handling and no DB
// writes at all (confirmed by reading it directly), just the same welcome
// text and two links every time. Nothing to wire.
export function SetupLandingPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wrench size={20} className="text-brand" /> Setup
      </h2>

      <Card className="!h-auto !bg-info-bg border-info/30 text-info-fg text-sm">
        Before starting to use Ecuenta some initial parameters must be defined and modules enabled/configured. Setup parameters can be set by <b>administrator users</b> only. The following two
        sections are mandatory (the two first entries in the Setup menu):
      </Card>

      <Card className="!h-auto space-y-1">
        <Link to={ROUTES.companyOrganization} className="text-brand hover:underline font-medium">
          Setup → Company/Organization
        </Link>
        <p className="text-sm text-text-muted">Basic parameters used to customize the default behavior of your application (e.g for country-related features).</p>
      </Card>

      <Card className="!h-auto space-y-1">
        <Link to={ROUTES.menusSetup} className="text-brand hover:underline font-medium">
          Setup → Menus
        </Link>
        <p className="text-sm text-text-muted">This software is a suite of many modules/applications. The modules related to your needs must be enabled and configured. Menu entries will appears with the activation of these modules.</p>
      </Card>

      <p className="text-sm text-text-muted">Other Setup menu entries manage optional parameters.</p>
    </div>
  )
}
