import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CalendarDays,
  ChartNoAxesCombined,
  FilePlus2,
  FileText,
  FolderKanban,
  Landmark,
  Package,
  Receipt,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tags,
  Ticket,
  Truck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

const NAV_ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/import|un-upload|download/i, ArrowDownToLine],
  [/export|upload/i, ArrowUpFromLine],
  [/create|new|add/i, FilePlus2],
  [/invoice|quotation|proposal|payment|credit note|receipt/i, Receipt],
  [/sales|order/i, ShoppingCart],
  [/purchase|supplier/i, ShoppingBag],
  [/customer|vendor|contact|employee|user|member|person/i, UsersRound],
  [/stock|product|item|inventory|warehouse|rack|shelf/i, Package],
  [/bank|account|ledger|balance|loan/i, Landmark],
  [/report|statistic|analytics|summary/i, ChartNoAxesCombined],
  [/calendar|holiday|date|attendance|time/i, CalendarDays],
  [/setting|setup|configuration|parameter/i, Settings2],
  [/project|task|contract/i, FolderKanban],
  [/ticket|support/i, Ticket],
  [/shipment|delivery|reception|transfer/i, Truck],
  [/tag|category|group/i, Tags],
  [/security|permission|access|zra|tax/i, ShieldCheck],
  [/movement|transaction|history|sync/i, ArrowLeftRight],
  [/list|details|info/i, FileText],
]

export function getNavItemIcon(label: string): LucideIcon {
  return NAV_ICON_RULES.find(([pattern]) => pattern.test(label))?.[1] ?? FileText
}

export function getNavItemIconTileClass(label: string): string {
  if (/customer|vendor|contact|employee|user|member|person/i.test(label)) return 'bg-emerald-500/20 text-emerald-300 ring-emerald-300/30'
  if (/purchase|supplier/i.test(label)) return 'bg-amber-500/20 text-amber-300 ring-amber-300/30'
  if (/stock|product|item|inventory|warehouse|rack|shelf/i.test(label)) return 'bg-violet-500/20 text-violet-300 ring-violet-300/30'
  if (/tag|category|group|other/i.test(label)) return 'bg-rose-500/20 text-rose-300 ring-rose-300/30'
  if (/calendar|holiday|date|attendance|time|report|statistic/i.test(label)) return 'bg-cyan-500/20 text-cyan-300 ring-cyan-300/30'
  if (/invoice|quotation|proposal|payment|credit note|receipt|bank|account|ledger/i.test(label)) return 'bg-blue-500/20 text-sky-300 ring-sky-300/30'
  return 'bg-sky-500/20 text-sky-300 ring-sky-300/30'
}