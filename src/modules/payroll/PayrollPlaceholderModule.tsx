import { useLocation } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { NotBuiltPage } from '../../shared/components/dashboard/NotBuiltPage'
import { PAYROLL_PLACEHOLDERS } from '../../features/payroll/payrollPlaceholders'

// One shared module for all 51 Payroll nav items confirmed this session to
// have a real legacy page but no JSON API — looks itself up by path rather
// than needing 51 near-identical wrapper files.
export function PayrollPlaceholderModule() {
  const { pathname } = useLocation()
  const entry = PAYROLL_PLACEHOLDERS.find((p) => p.path === pathname)
  if (!entry) return <NotBuiltPage icon={HelpCircle} title="Unknown Payroll page" description="No placeholder entry found for this route." />
  return <NotBuiltPage icon={entry.icon} title={entry.title} description={entry.description} />
}
