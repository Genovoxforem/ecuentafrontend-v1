import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { resolveLegacyRoute } from '../legacyRoute'

// A reference to another record (order, quotation, invoice, …) that the
// backend gave as its own card-page URL. It links to that record's React page;
// when that kind of record has no React page the reference stays plain text
// rather than sending the user to a backend page.
export function LegacyObjectLink({
  url,
  children,
  className = 'text-brand hover:underline',
  plainClassName,
}: {
  url: string | null | undefined
  children: ReactNode
  className?: string
  plainClassName?: string
}) {
  const to = resolveLegacyRoute(url)
  if (!to) return <span className={plainClassName}>{children}</span>
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  )
}
