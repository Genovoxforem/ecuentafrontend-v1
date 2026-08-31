import { ExternalLink, Landmark } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// A fully separate top-level sidebar icon in the real app
// (mainmenu='specialexpence' in llx_menu, url=compta/charges/index.php) —
// Dolibarr's stock recurring/social-taxes module. Confirmed no AJAX/JSON of
// any kind (pure traditional server-rendered pages).
export function SpecialExpenses() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Landmark size={20} className="text-brand" /> Special Expenses
      </h2>
      <Card className="!h-auto space-y-2">
        <p className="text-sm text-text-muted">
          Real page: <code className="font-mono text-xs">compta/charges/index.php</code> (Dolibarr's stock recurring/social-taxes module) — classic form-POST, no JSON API of any kind.
        </p>
        <a href="/compta/charges/index.php" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
          <ExternalLink size={13} /> Open in the legacy system
        </a>
      </Card>
    </div>
  )
}
