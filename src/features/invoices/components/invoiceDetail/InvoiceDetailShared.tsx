import { LoaderCircle } from 'lucide-react'

export const selectCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'

export const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-brand/30'

export function TabTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="flex items-center gap-2 font-semibold text-brand">
      <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
      {children}
      {count !== undefined && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-surface-hover text-text-muted text-xs font-semibold">{count}</span>
      )}
    </h3>
  )
}

export function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ size?: number; className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon size={28} className="text-text-faint" />
      <p className="text-sm text-text-faint">{message}</p>
    </div>
  )
}

// Real per-status action button set, colors and icons ported verbatim from
// the real page's own renderActionButtons(inv) in compta/sales/js/
// invoice.js (btn-success/btn-info/btn-outline-secondary/btn-warning/
// btn-outline-success/btn-danger, fontawesome icons mapped to their lucide
// equivalents). Send Email/WhatsApp/POS Ticket/Create Credit Note/Create
// Debit Note/Record Payment all have confirmed real contracts (see
// salesInvoice.queries.ts header) but aren't wired up yet — deliberately
// left out of this pass rather than half-built.
export const TONE_CLS: Record<string, string> = {
  success: 'bg-success text-white hover:opacity-90',
  info: 'bg-info text-white hover:opacity-90',
  warning: 'bg-warning text-white hover:opacity-90',
  danger: 'bg-danger text-white hover:opacity-90',
  outline: 'border border-input-border text-text hover:bg-surface-hover',
  'outline-success': 'border border-success text-success hover:bg-success-bg',
}

export function ActionButton({
  tone,
  icon: Icon,
  onClick,
  disabled,
  pending,
  children,
}: {
  tone: keyof typeof TONE_CLS
  icon: React.ComponentType<{ size?: number }>
  onClick: () => void
  disabled?: boolean
  pending?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${TONE_CLS[tone]}`}
    >
      {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Icon size={14} />}
      {children}
    </button>
  )
}

// Real margin_info is a small, backend-generated HTML table (see
// salesInvoiceApi.ts SalesInvoiceMargin) — parsed into plain rows rather
// than dangerouslySetInnerHTML, matching this codebase's convention
// elsewhere of rendering structured data, not raw legacy markup.
export function parseMarginRows(html: string): { label: string; sellingPrice: string; costPrice: string; margin: string }[] {
  const rowRe = /<tr class="(?:oddeven|totalRow)"><td>([^<]+)<\/td><td class="custumRight">([^<]*)<\/td><td class="custumRight">([^<]*)<\/td><td class="custumRight">([^<]*)<\/td><\/tr>/g
  const rows: { label: string; sellingPrice: string; costPrice: string; margin: string }[] = []
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(html))) rows.push({ label: m[1], sellingPrice: m[2], costPrice: m[3], margin: m[4] })
  return rows
}
