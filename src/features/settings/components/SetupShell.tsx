import type { ComponentType, ReactNode } from 'react'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'

// The frame every Setup page (Administrator → Setup / Tools) sits in: the title, its one-line
// description and any tab strip stay pinned at the top, the Save button stays pinned at the
// bottom, and only the settings between them scroll. Without it the title and the Save button
// scrolled out of view on the long pages (Company, Display, PDF, …).
//
// `saved` is the page's "Saved (…)" notice. It is shown next to the Save button, where the
// user is looking after pressing it — as a card at the end of the page it landed below the fold.
// A page that saves as you go (a toggle, a per-row action) passes no `onSave` and gets no footer.
export function SetupShell({
  icon: Icon,
  title,
  onBack,
  description,
  headerRight,
  tabs,
  underlinedTabs = true,
  onSave,
  saveLabel = 'Save',
  saving = false,
  saveDisabled = false,
  saved,
  footerExtra,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: ReactNode
  // A step of a wizard: a back arrow before the title.
  onBack?: () => void
  description?: ReactNode
  // Sits at the right end of the title row (a page-wide switch).
  headerRight?: ReactNode
  // A tab strip: render the buttons only — the shell draws the line under them.
  tabs?: ReactNode
  // false for pill-style tabs, which sit above the bottom line instead of on it.
  underlinedTabs?: boolean
  onSave?: () => void
  saveLabel?: string
  // Shows a spinner in the button while the save request is running.
  saving?: boolean
  saveDisabled?: boolean
  saved?: ReactNode
  // Anything else the footer needs next to Save (a secondary button).
  footerExtra?: ReactNode
  children: ReactNode
}) {
  return (
    <StickyFormShell
      headerClassName={tabs && underlinedTabs ? 'pt-3 pb-0' : 'py-3'}
      header={
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {onBack && (
                <button type="button" onClick={onBack} aria-label="Back" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                  <ChevronLeft size={18} />
                </button>
              )}
              <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
                <Icon size={20} className="text-brand" /> {title}
              </h2>
            </div>
            {headerRight}
          </div>
          {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
          {tabs && <div className="mt-2 flex flex-wrap gap-2">{tabs}</div>}
        </div>
      }
      footerLeft={onSave ? saved ? <p className="line-clamp-2 text-sm font-medium text-success-fg">{saved}</p> : <span /> : undefined}
      footerRight={
        onSave ? (
          <>
            {footerExtra}
            <button
              type="button"
              onClick={onSave}
              disabled={saveDisabled}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} {saveLabel}
            </button>
          </>
        ) : undefined
      }
    >
      {children}
    </StickyFormShell>
  )
}
