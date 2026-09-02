import {
  FileBadge,
  Users,
  Boxes,
  StickyNote,
  Paperclip,
  CalendarClock,
} from 'lucide-react'

export const selectCls = 'text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 w-full'

export const TABS = [
  { key: 'quotation', label: 'Quotation', icon: FileBadge },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users },
  { key: 'consumptions', label: 'Stock Consumptions', icon: Boxes },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'files', label: 'Linked Files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
] as const
export type TabKey = (typeof TABS)[number]['key']

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2 pr-4 text-sm text-text-muted whitespace-nowrap align-top">{label}</td>
      <td className="py-2 text-sm text-text! align-top">{value || '—'}</td>
    </tr>
  )
}
