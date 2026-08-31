import { useLocation } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { NotBuiltPage } from '../../shared/components/dashboard/NotBuiltPage'
import { BANKING_PLACEHOLDERS } from '../../features/banking/bankingPlaceholders'

// One shared module for all 17 Banking nav items confirmed this session to
// have a real legacy page but no JSON API — looks itself up by path rather
// than needing 17 near-identical wrapper files (same convention as
// PayrollPlaceholderModule.tsx).
export function BankingPlaceholderModule() {
  const { pathname } = useLocation()
  const entry = BANKING_PLACEHOLDERS.find((p) => p.path === pathname)
  if (!entry) return <NotBuiltPage icon={HelpCircle} title="Unknown Banking page" description="No placeholder entry found for this route." />
  return <NotBuiltPage icon={entry.icon} title={entry.title} description={entry.description} />
}
