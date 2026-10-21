// Shapes the purchase order screens render (the card, its lines, the receipts and the agenda tab). They are filled from
// fourn/commande/fapi (purchaseOrderFapi.ts, purchaseOrderDetail.queries.ts); nothing here parses HTML any more.

export interface PurchaseOrderLineDetail {
  id: number
  productId: number
  productLabel: string
  description: string
  supplierRef: string
  qty: number
  unitPriceExcl: number
  vatRate: number
  vatCode: string
  discountPercent: number
  totalHt: number
  totalTva: number
  totalTtc: number
}

export interface PurchaseOrderDocOption {
  value: string
  label: string
}

export interface PurchaseOrderDocGenOptions {
  token: string
  modelOptions: PurchaseOrderDocOption[]
  langOptions: PurchaseOrderDocOption[]
  defaultLang: string
}

export interface PurchaseOrderLinkedFile {
  name: string
  url: string
}

export interface PurchaseOrderAvailableActions {
  canSendMail: boolean
  canReopen: boolean
  canCreateReception: boolean
  canClassifyReception: boolean
  canCreateBill: boolean
  canClassifyBilled: boolean
  canClone: boolean
  canDelete: boolean
}

export interface PurchaseOrderCard {
  id: number
  ref: string
  refSupplier: string
  thirdPartyName: string
  socid: number | null
  projectRef: string
  projectId: number | null
  statusLabel: string
  statusCode: number | null
  billed: boolean
  date: string
  method: string
  requestAuthor: string
  discountsText: string
  paymentTermsLabel: string
  paymentTypeLabel: string
  currencyLabel: string
  deliveryDate: string
  noDaysToDelivery: string
  incotermLabel: string
  amountHt: number
  amountVat: number
  amountTtc: number
  lines: PurchaseOrderLineDetail[]
  docGen: PurchaseOrderDocGenOptions
  linkedFiles: PurchaseOrderLinkedFile[]
  actions: PurchaseOrderAvailableActions
}

export interface PurchaseOrderReceiptRow {
  receptionRef: string
  receptionUrl: string
  productRef: string
  productLabel: string
  creationDate: string
  plannedDeliveryDate: string
  qtyDispatched: string
  warehouse: string
  comment: string
}

export interface PurchaseOrderDispatchData {
  date: string
  method: string
  requestAuthor: string
  receipts: PurchaseOrderReceiptRow[]
  // Only the JSON dispatch.php fills these: what is still owed per line, and where it can be received.
  lines?: PurchaseOrderDispatchLine[]
  warehouses?: Array<{ value: string; label: string }>
  defaultWarehouseId?: string
}

export interface PurchaseOrderDispatchLine {
  lineId: number
  label: string
  ordered: number
  received: number
  remaining: number
  batchTracked: boolean
}

export interface PurchaseOrderAgendaEventRow {
  ref: string
  url: string
  date: string
  owner: string
  label: string
  relatedObjectRef: string
  relatedObjectUrl: string
  statusLabel: string
}

export interface PurchaseOrderInfoData {
  createdBy: string
  creationDate: string
  latestModificationDate: string
  validatedBy: string
  validationDate: string
  approvedBy: string
  approvingDate: string
  events: PurchaseOrderAgendaEventRow[]
}

// Supplier-order statuses as the card prints them (langs/en_US/orders.lang, long form).
const STATUS_LABELS: Array<{ code: number; long: string }> = [
  { code: 0, long: 'draft (needs to be validated)' },
  { code: 1, long: 'validated' },
  { code: 2, long: 'approved' },
  { code: 3, long: 'ordered - standby reception' },
  { code: 4, long: 'partially received' },
  { code: 5, long: 'all products received' },
  { code: 6, long: 'canceled' },
  { code: 7, long: 'canceled after order' },
  { code: 9, long: 'refused' },
]

export function statusLabelFor(code: number): string {
  const long = STATUS_LABELS.find((s) => s.code === code)?.long ?? ''
  return long.charAt(0).toUpperCase() + long.slice(1)
}

// "MM/DD/YYYY" -> a Date (the list formats dates that way, so the "this month" figure can compare them).
export function parseUsDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, month, day, year] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}
