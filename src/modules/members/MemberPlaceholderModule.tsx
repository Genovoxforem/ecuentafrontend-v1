import { useLocation } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { NotBuiltPage } from '../../shared/components/dashboard/NotBuiltPage'
import { MEMBER_PLACEHOLDERS } from '../../features/members/membersPlaceholders'

export function MemberPlaceholderModule() {
  const { pathname } = useLocation()
  const entry = MEMBER_PLACEHOLDERS.find((p) => p.path === pathname)
  if (!entry) return <NotBuiltPage icon={HelpCircle} title="Unknown Members page" description="No placeholder entry found for this route." />
  return <NotBuiltPage icon={entry.icon} title={entry.title} description={entry.description} />
}
