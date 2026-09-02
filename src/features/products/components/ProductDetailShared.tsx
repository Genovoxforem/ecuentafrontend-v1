import { X, Package, Tag, ShoppingCart, Warehouse, Ruler, Shapes, Link2, ChartPie, FileText, StickyNote, Paperclip, CalendarClock, Percent } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'

// Matches legacy's real primary/overflow tab split exactly (confirmed live
// via product/card.php's own rendered tab bar for product id=123) — not a
// guess at grouping, the actual 7 primary + 6 "More..." tabs shown there.
// Icons are a redesign addition (legacy's own primary tab bar has none —
// only the More... dropdown does) for visual consistency between the two.
// Same set/order/labels as the real reference page's own tab bar
// (productinfo/index.php, backed by productinfo/json/tabs.json on the
// active backend — read directly, not guessed): Product Card, Selling
// Prices, Supplier Prices, Stock, UOM, Variants, Composition, Statistics,
// Invoice Stats, Notes, Documents, Events. Each renamed label maps to the
// SAME underlying data/component as before (confirmed against that json's
// own api file per tab, e.g. variant_api.php uses the same ProductCombination
// class "Product Combinations" already used) — only the label changed.
// "Margins" has no equivalent tab in that reference at all (selling-vs-
// buying margin isn't one of its 12 tabs), so it's kept, appended at the
// end, rather than dropped — real working functionality, not a guess this
// app should lose just because the reference page doesn't happen to have it.
const TABS = [
  { label: 'Product Card', icon: Package },
  { label: 'Selling Prices', icon: Tag },
  { label: 'Supplier Prices', icon: ShoppingCart },
  { label: 'Stock', icon: Warehouse },
  { label: 'UOM', icon: Ruler },
  { label: 'Variants', icon: Shapes },
  { label: 'Composition', icon: Link2 },
  { label: 'Statistics', icon: ChartPie },
  { label: 'Invoice Stats', icon: FileText },
  { label: 'Notes', icon: StickyNote },
  { label: 'Documents', icon: Paperclip },
  { label: 'Events', icon: CalendarClock },
  { label: 'Margins', icon: Percent },
] as const
type Tab = (typeof TABS)[number]['label']

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`font-medium px-3 py-2.5 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>{children}</th>
}
function Td({ children, right, muted }: { children: React.ReactNode; right?: boolean; muted?: boolean }) {
  return <td className={`px-3 py-2 whitespace-nowrap ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-text-muted' : 'text-text!'}`}>{children}</td>
}
function EmptyRow({ span, label }: { span: number; label: string }) {
  return (
    <tr>
      <td colSpan={span} className="px-3 py-8 text-center text-text-faint italic">
        {label}
      </td>
    </tr>
  )
}
function TabTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm [&_tbody_tr:hover]:bg-surface-hover">{children}</table>
    </div>
  )
}

// max-w-md caps how far label/value spread apart — without it, `justify-between`
// stretches them to the full row width, and since About/Pricing/Product
// Accountancy sit in a 2-column grid sharing whatever's left after a fixed
// 360px right column, Pricing/Accountancy's half can end up far wider than
// its short label/value pairs need, leaving a large, unintentional-looking
// gap between the value and the card's edge.
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0 max-w-md">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || '—'}</span>
    </div>
  )
}
// Same row layout as Field, for the handful of About rows whose value is a
// badge/icon/graphic instead of plain text.
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0 max-w-md">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-right">{children}</span>
    </div>
  )
}

// Small colored icon badge used ahead of section headings throughout this
// page (Overview tab's About/Pricing/Accountancy/Overview sections, and the
// Activity Timeline/Connections/Teams panels) — reuses DashboardKit's own
// ICON_STYLES palette rather than inventing new colors.
function SectionIcon({ icon: Icon, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; color: IconColor }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${ICON_STYLES[color]}`}>
      <Icon size={14} />
    </span>
  )
}
function SectionHeader({ icon, color, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; color: IconColor; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-text! mb-2.5">
      <SectionIcon icon={icon} color={color} /> {children}
    </h3>
  )
}

// Dot + label status pill for the hero header's On Sell / On Buy badges —
// both real fields (product.forSale/forPurchase), always shown so the
// absence of a status reads as explicitly "off" rather than just missing.
function StatusPill({ active, activeLabel, inactiveLabel, tone = 'success' }: { active: boolean; activeLabel: string; inactiveLabel: string; tone?: 'success' | 'info' }) {
  const activeCls = tone === 'info' ? 'bg-info-bg text-info-fg' : 'bg-success-bg text-success-fg'
  const dotCls = tone === 'info' ? 'bg-info' : 'bg-success'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${active ? activeCls : 'bg-neutral-bg text-neutral-fg'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? dotCls : 'bg-text-faint'}`} />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}

// Bigger stat tile for the Stock/UOM/Supplier Prices tabs (base unit,
// conversions count, supplier count, etc.) — same {label above, value, caption
// below} shape as the Customers list's own stat cards, just a tab-local
// component since nothing else on this page needs it.
function MetricTile({ icon: Icon, color, label, value, caption }: { icon: React.ComponentType<{ size?: number }>; color: IconColor; label: string; value: string | number; caption?: string }) {
  return (
    <Card className="!h-auto !p-3 flex-row items-center gap-3">
      <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES[color]}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-text! truncate">{value}</p>
        {caption && <p className="text-xs text-text-faint truncate">{caption}</p>}
      </div>
    </Card>
  )
}

// Small local modal shell shared by the Add/Edit UOM Conversion, Correct
// Stock, and Transfer Stock modals below — same overlay/panel pattern as
// ProductServiceCreateForm.tsx's CreateCategoryModal, not reused directly
// since that file's own Field/Select are display-form components whose
// names collide with this file's own read-only Field/FieldRow.
function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-base font-semibold text-text!">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">{children}</div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  )
}
function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-text-faint mb-1">{label}</label>
      {children}
    </div>
  )
}
const modalInputCls = 'w-full h-9 px-3 rounded-md border border-border bg-surface text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

export {
  Th,
  Td,
  EmptyRow,
  TabTable,
  Field,
  FieldRow,
  SectionIcon,
  SectionHeader,
  StatusPill,
  MetricTile,
  ModalShell,
  ModalField,
  modalInputCls,
  TABS,
}
export type { Tab }
