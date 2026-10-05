import { Card } from '../../../shared/components/dashboard/DashboardKit'

// custom/payroll/admin/about.php — pure static text (module descriptor,
// modPayroll::getDescLong()), no dynamic data or backend call at all —
// confirmed by reading that file directly. Text mirrors the real page.
export function AboutPayrollTab() {
  return (
    <Card className="!h-auto space-y-4">
      <h3 className="text-xl font-bold text-text!">
        Payroll for <span className="text-brand">Ecuenta ERP CRM</span>
      </h3>

      <div>
        <h4 className="text-lg font-semibold text-text!">Features</h4>
        <p className="text-sm text-text-muted mt-1">Description of the module...</p>
        <p className="text-sm text-text-muted mt-1">
          Other external modules are available on{' '}
          <a href="https://voxforem.com" target="_blank" rel="noreferrer" className="text-brand hover:underline">
            voxforem.com
          </a>
          .
        </p>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-text!">Translations</h4>
        <p className="text-sm text-text-muted mt-1">
          Translations can be completed manually by editing files into directories <em>langs</em>.
        </p>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-text!">Licenses</h4>
        <h5 className="text-sm font-semibold text-text! mt-2">Main code</h5>
        <p className="text-sm text-text-muted mt-1">GPLv3 or (at your option) any later version. See file COPYING for more information.</p>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-text!">Documentation</h4>
        <p className="text-sm text-text-muted mt-1">All texts and readmes are licensed under GFDL.</p>
      </div>
    </Card>
  )
}
