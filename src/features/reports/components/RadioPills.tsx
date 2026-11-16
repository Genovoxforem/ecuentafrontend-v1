// The radio buttons of the classic report filters (Type: All / Sales / Returns, Status: All / Due / ...): one choice, shown as buttons.
export function RadioPills<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="text-sm font-medium text-text">
      <span className="mb-1 block">{label}</span>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value || 'all'}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`h-9 rounded-md border px-3 text-sm ${value === o.value ? 'border-brand text-brand' : 'border-border text-text hover:bg-surface-hover'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
