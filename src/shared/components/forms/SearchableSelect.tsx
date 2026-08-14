import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'

export interface SearchableSelectOption {
  value: string
  label: string
}

// A Select2-style combobox: click to open, type to filter, click-outside or Escape to close.
// Reusable anywhere a plain <select> isn't enough — currently wired for the Currency field,
// but built generically (icon-less, no field-specific assumptions) so Country/Prospect-Customer
// can adopt it later without rework.
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
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
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
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-left text-sm text-text transition-shadow focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      >
        <span className={`truncate ${selected ? 'text-text' : 'text-text-faint'}`}>{selected ? selected.label : placeholder}</span>
        {open ? <ChevronUp size={14} className="shrink-0 text-text-faint" /> : <ChevronDown size={14} className="shrink-0 text-text-faint" />}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-input-border bg-surface-alt shadow-lg">
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
                className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                  opt.value === value ? 'bg-brand text-white' : i === highlight ? 'bg-surface-hover text-text' : 'text-text'
                }`}
              >
                {opt.label}
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
        </div>
      )}
    </div>
  )
}
