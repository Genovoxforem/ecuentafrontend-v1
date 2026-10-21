import { useLocation } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { NotBuiltPage } from '../../shared/components/dashboard/NotBuiltPage'
import { BANKING_PLACEHOLDERS } from '../../features/banking/bankingPlaceholders'
import { LegacyBankingPage } from '../../features/banking/components/LegacyBankingPage'

// Reuses one legacy-HTML-backed React page for the remaining Banking pages.
export function BankingPlaceholderModule() {
  const { pathname } = useLocation()
  const entry = BANKING_PLACEHOLDERS.find((p) => p.path === pathname)
  if (!entry) return <NotBuiltPage icon={HelpCircle} title="Unknown Banking page" description="No placeholder entry found for this route." />
  return <LegacyBankingPage entry={entry} />
}
