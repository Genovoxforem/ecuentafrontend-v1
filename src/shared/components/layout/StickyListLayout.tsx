import type { ReactNode } from 'react'
import { Card } from '../dashboard/DashboardKit'
import { useTheme } from '../../../context/ThemeContext'

// Page frame for a long list: the title, toolbar and filters stay at the top and only the rows scroll,
// under a column header that stays put (and a total row that stays at the bottom).
//
// The app's scroll container has `p-6` and pages that fill it use `-m-6` to reach its edges (see
// AppShell). `min-h-0` on every flex ancestor is what lets the row area shrink and scroll instead of
// growing the page.
export function StickyListLayout({ header, children }: { header: ReactNode; children: ReactNode }) {
  const { theme } = useTheme()
  const compact = theme === 'blue-metal'
  return (
    <div className="blue-density-list -m-6 flex-1 flex flex-col min-h-0">
      <div className={`blue-density-header sticky -top-6 z-10 border-b border-border bg-white px-6 dark:bg-gray-950 ${compact ? 'space-y-2 py-2' : 'space-y-3 py-3'}`}>{header}</div>
      <div className={`blue-density-list-content flex-1 flex flex-col min-h-0 px-6 ${compact ? 'space-y-3 py-3' : 'space-y-4 py-4'}`}>{children}</div>
    </div>
  )
}

// The card that holds the rows. It is as tall as its rows up to the space that is left, then scrolls
// inside itself, so a short list is not stretched and a long one never pushes the page down.
export function ScrollCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Card className={`!h-auto !p-0 overflow-hidden flex-initial min-h-0 ${className}`}>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </Card>
  )
}

// Classes for the table parts that stay in view: `thead` under the top of the scrolling card, `tfoot`
// at its bottom. The background is opaque so rows do not show through.
export const STICKY_THEAD = 'sticky top-0 z-10 bg-surface'
export const STICKY_TFOOT = 'sticky bottom-0 z-10 bg-surface'
