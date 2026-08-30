import { useLocation } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { NotBuiltPage } from '../../shared/components/dashboard/NotBuiltPage'
import { EXPENSE_PLACEHOLDERS } from '../../features/expenses/expensesPlaceholders'

// One shared module for the 11 Expenses nav items confirmed this session to
// have a real backing page (and, for most, a real JSON action) but no
// rebuilt UI yet — same convention as PayrollPlaceholderModule.tsx.
export function ExpensePlaceholderModule() {
  const { pathname } = useLocation()
  const entry = EXPENSE_PLACEHOLDERS.find((p) => p.path === pathname)
  if (!entry) return <NotBuiltPage icon={HelpCircle} title="Unknown Expenses page" description="No placeholder entry found for this route." />
  return <NotBuiltPage icon={entry.icon} title={entry.title} description={entry.description} />
}
