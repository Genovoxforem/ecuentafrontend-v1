import type { ReactNode } from 'react'

// The one correct way to build a create/edit page whose header stays pinned to the true top
// of AppShell's <main> and whose action bar stays pinned to the true bottom, with content
// scrolling between them — "true" meaning flush with main's own edges, not main's padding
// edge. Use this for every new create/edit page instead of rebuilding the pattern by hand;
// that's exactly how the header/footer padding and button layout drifted across the six pages
// this was extracted from.
//
// Two real bugs shaped this, both easy to reintroduce by hand:
//  1) position:sticky's top/bottom offset is always measured from the nearest scrolling
//     ancestor's own PADDING edge, never wherever an ancestor's negative margin visually
//     bleeds the content to. That's why this uses -top-6/-bottom-6 (not top-0/bottom-0) —
//     it shifts the stick point by exactly AppShell main's p-6 inset so it clamps flush
//     against main's true edge. A vertical negative margin on the sticky bars themselves
//     (rather than once on the outer -m-6 wrapper here) also shrinks their own contribution
//     to the column's flex stacking, making the next sibling start early and overlap them.
//  2) percentage min-height doesn't reliably resolve against main's content-box height
//     through the ancestor chain on a real (non-devtools) viewport — measured ~27px short,
//     leaving a gap under the footer whenever a step's content is shorter than the viewport.
//     flex-1 relies on AppShell main's own `flex flex-col` and flexbox's fill/overflow
//     algorithm instead, which doesn't have that problem.
export function StickyFormShell({
  header,
  headerClassName = 'py-3',
  footerLeft,
  footerRight,
  scrollsInternally = true,
  children,
}: {
  header: ReactNode
  // Vertical padding for the header bar — override when the header has more than one
  // stacked row (e.g. a title plus a step indicator) and needs tighter spacing.
  headerClassName?: string
  // Left side of the footer bar — conventionally the Cancel link.
  footerLeft: ReactNode
  // Right side of the footer bar — the secondary/primary action button(s), grouped together.
  footerRight: ReactNode
  // Set false for pages whose content is a plain stack of cards with no child that manages
  // its own internal scrolling (e.g. a create form's field cards, as opposed to a list page's
  // fixed-height table panel). true (the default, matching every page this was extracted
  // from) lets the wrapper shrink below its content's intrinsic size via min-h-0 so a child
  // card's own overflow-auto can engage — but that same shrink makes content taller than the
  // viewport spill past the wrapper's now-undersized box, so the footer (laid out right after
  // that box, not after the spillover) ends up stuck mid-content instead of past it. false
  // drops min-h-0 so the wrapper's automatic min-height stays content-based: it still grows
  // to fill the viewport when content is short (no gap under the footer), but never shrinks
  // below taller content, so the footer's sticky containing block always covers the true
  // content height and the page scrolls as a whole via AppShell's own scrollport instead.
  scrollsInternally?: boolean
  children: ReactNode
}) {
  return (
    <div className={`-m-6 flex-1 flex flex-col ${scrollsInternally ? 'min-h-0' : ''}`}>
      <div className={`sticky -top-6 z-10 border-b border-border bg-white px-6 dark:bg-gray-950 ${headerClassName}`}>{header}</div>
      {/* flex flex-col (not just flex-1): lets a single-card page opt its Card into flex-1
          too, so the card's own box stretches down to meet the footer instead of leaving a
          bare gap below a short field grid — same fill-or-overflow reasoning as this wrapper
          itself. min-h-0 lets it shrink below its content's intrinsic size when a child card
          handles its own internal scrolling (needed for that child's overflow-auto to engage
          at all, per the usual nested-flexbox-scroll gotcha). */}
      <div className={`flex-1 flex flex-col ${scrollsInternally ? 'min-h-0' : ''} space-y-4 px-6 py-4`}>{children}</div>
      <div className="sticky -bottom-6 z-10 flex items-center justify-between gap-3 border-t border-border bg-white px-6 py-2.5 dark:bg-gray-950">
        {footerLeft}
        <div className="flex items-center gap-3">{footerRight}</div>
      </div>
    </div>
  )
}
