import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTheme, usesBlueLayout } from '../../../context/ThemeContext'

// A place in the page banner that a page can put its own controls into (a
// status box, a filter, a search field) instead of drawing a header card of its
// own under the banner. The controls stay part of the page's React tree, so
// their state and handlers work as before; only where they appear changes.
let slot: HTMLElement | null = null
const listeners = new Set<() => void>()

export function setBannerSlot(element: HTMLElement | null) {
  if (slot === element) return
  slot = element
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Where the banner is not shown (every theme but the blue one) the controls
// simply stay where the page puts them.
export function InBanner({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const target = useSyncExternalStore(subscribe, () => slot)
  if (usesBlueLayout(theme) && target) return createPortal(children, target)
  return <div className="flex flex-wrap items-center justify-between gap-3">{children}</div>
}

// The one-line description a page prints under its title ("Plans, payment rules,
// numbering ...") is drawn inside the banner, right after the title, as a quiet
// note behind a thin divider. Where the banner is not shown the note stays a
// plain line under the heading, as before.
let noteSlot: HTMLElement | null = null
const noteListeners = new Set<() => void>()

export function setBannerNoteSlot(element: HTMLElement | null) {
  if (noteSlot === element) return
  noteSlot = element
  for (const listener of noteListeners) listener()
}

const subscribeNote = (listener: () => void) => {
  noteListeners.add(listener)
  return () => {
    noteListeners.delete(listener)
  }
}

export function BannerNote({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const target = useSyncExternalStore(subscribeNote, () => noteSlot)
  if (usesBlueLayout(theme) && target) return createPortal(children, target)
  return <p className="mt-0.5 text-sm text-text-muted">{children}</p>
}
