import type { ComponentType, ReactNode } from 'react'

export const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 disabled:bg-surface disabled:text-text-faint disabled:cursor-default'

export const primaryBtn = 'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:bg-neutral-bg disabled:text-text-faint disabled:cursor-default'

export function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: ComponentType<{ size?: number; className?: string }> }) {
  if (!Icon) {
    return (
      <div className="flex flex-col gap-0.5 py-2 border-b border-border last:border-0">
        <span className="text-xs text-text-faint">{label}</span>
        <span className="text-sm text-text!">{value || '—'}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="flex items-center gap-2 text-sm text-text-muted">
        <Icon size={14} className="text-brand shrink-0" /> {label}
      </span>
      <span className="text-sm text-text! font-medium text-right">{value || '—'}</span>
    </div>
  )
}

// Non-collapsible card shell (icon + title + subtitle, optional header
// action) used by HrBankTab's Personal Contact/Bank Accounts/Leave Types
// sections.
export function InfoCard({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-start gap-3 border-b border-border bg-surface px-4 py-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand/10 text-brand shrink-0">
          <Icon size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text!">{title}</h3>
          {subtitle && <p className="text-xs text-text-faint mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}
