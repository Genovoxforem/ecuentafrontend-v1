import type { ReactNode } from 'react'

// Shared building blocks for the single-page "create" forms (Order,
// Quotation, Purchase Order, ...) — each one is a 2-column grid of
// label+input pairs with the same field chrome, just different fields.
export const inputClasses = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-text">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

export function Select({ defaultValue, options }: { defaultValue?: string; options: string[] }) {
  return (
    <select defaultValue={defaultValue ?? ''} className={inputClasses}>
      {!defaultValue && <option value="">Select an option</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
