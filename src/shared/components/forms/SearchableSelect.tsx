import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'

export interface SearchableSelectOption {
  value: string
  label: string
  // Optional extra detail rendered as a smaller block under the label (e.g.
  // ref/classification/price/stock for a product picker) — every existing
  // caller omits this and keeps the original single-line row untouched.
  description?: ReactNode
  // Optional extra plain text matched against the search query alongside
  // label (e.g. a product's ref/barcode) — doesn't render, search-only.
  keywords?: string
}

// A Select2-style combobox: click to open, type to filter, click-outside or Escape to close.
// Reusable anywhere a plain <select> isn't enough — currently wired for the Currency field,
// but built generically (icon-less, no field-specific assumptions) so Country/Prospect-Customer
// can adopt it later without rework.
//
// The open panel renders through a portal into document.body, positioned by the trigger
// button's real screen coordinates, rather than as a normal `position: absolute` child.
// A plain absolute child gets silently clipped by any ancestor with non-visible overflow —
// which is exactly what happened once this component was used inside a table wrapped in
// `overflow-x-auto` (OrderCreateForm's Item Table product picker): the panel really did open
// and really did contain all the options, just invisibly, clipped away by the table's own
// scroll container. Portaling to body sidesteps every ancestor's overflow/z-index entirely.
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  onAddNew,
  addNewLabel = 'Add New',
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  onAddNew?: () => void
  addNewLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query
    ? options.filter((o) => `${o.label} ${o.keywords ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    : options
  const selected = options.find((o) => o.value === value)

  // Outside-click detection has to check both the trigger's own root AND the portaled panel —
  // the panel is no longer a DOM descendant of rootRef once it's rendered into document.body,
  // so without panelRef here every click inside the open dropdown would count as "outside" and
  // close it on mousedown, before the option button's own click handler ever got to run.
  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setHighlight(0)
    const raf = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(raf)
  }, [open])

  // Keeps the portaled panel glued under the trigger button — recomputed on open and on any
  // scroll/resize while open, since the panel no longer moves with its trigger automatically
  // the way a normal in-flow absolute child would (it's positioned in viewport coordinates,
  // not relative to rootRef, once it's in the portal).
  useLayoutEffect(() => {
    if (!open) return
    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (rect) setPanelPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  function selectOption(opt: SearchableSelectOption) {
    onChange(opt.value)
    setOpen(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlight]) selectOption(filtered[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-left text-sm text-text transition-shadow focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      >
        <span className={`truncate ${selected ? 'text-text' : 'text-text-faint'}`}>{selected ? selected.label : placeholder}</span>
        {open ? <ChevronUp size={14} className="shrink-0 text-text-faint" /> : <ChevronDown size={14} className="shrink-0 text-text-faint" />}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, width: panelPos.width }}
            className="z-50 rounded-lg border border-input-border bg-surface-alt shadow-lg"
          >
            <div className="p-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setHighlight(0)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search…"
                className="w-full rounded-md border border-input-border bg-input-bg px-2.5 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && <p className="px-3 py-2 text-sm text-text-faint">No matches</p>}
              {filtered.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => selectOption(opt)}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm ${
                    opt.value === value ? 'bg-brand text-white' : i === highlight ? 'bg-surface-hover text-text' : 'text-text'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.description && <span className={`text-xs ${opt.value === value ? 'text-white/80' : 'text-text-faint'}`}>{opt.description}</span>}
                </button>
              ))}
            </div>
            {onAddNew && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onAddNew()
                }}
                className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-sm font-medium text-brand hover:bg-surface-hover"
              >
                <Plus size={14} /> {addNewLabel}
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
