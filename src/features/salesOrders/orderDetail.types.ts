// Type definitions for the Sales Order detail surface — the same shapes the
// legacy HTML parsers produced (orderCardParser/orderExtraTabsParser/
// orderAgendaParser/orderEmail), now fed by commande/fapi/*.php JSON
// endpoints instead of scraped markup. Kept separate from the query file so
// components share one import site.

export interface OrderLineDetail {
  id: number
  productId: number
  productRef: string
  productLabel: string
  description: string
  qty: number
  unitPriceExcl: number
  unitPriceIncl: number
  vatRate: number
  vatCode: string
  discountPercent: number
  costPrice: number
  totalTtc: number
  stockReserve: boolean
}

export interface OrderAction {
  label: string
  url: string
  // The legacy page renders unpermitted actions as greyed buttons
  // (butActionRefused) rather than omitting them — enabled=false reproduces
  // that same "visible but not actionable" state.
  enabled?: boolean
}

export interface RelatedObjectRow {
  type: string
  ref: string
  url: string
  date: string
  amount: number
  statusLabel: string
  // element_link rowid — POSTed to commande/fapi/actions.php
  // action=dellink to remove this link.
  linkid: number | null
}

export interface DocGenOption {
  value: string
  label: string
}

export interface DocGenOptions {
  modelOptions: DocGenOption[]
  langOptions: DocGenOption[]
  defaultLang: string
}

export interface MarginRow {
  label: string
  sellingPrice: number
  costPrice: number
  margin: number
}

export interface LinkedEventRow {
  ref: string
  url: string
  date: string
  by: string
  type: string
  title: string
}

export interface OrderDetail {
  id: number
  ref: string
  refCustomer: string
  statusLabel: string
  statusBadgeNumber: number | null
  thirdPartyName: string
  thirdPartySocid: number | null
  projectRef: string
  projectLabel: string
  projectId: number | null
  orderDate: string
  plannedDelivery: string
  shippingMethod: string
  paymentTerms: string
  paymentType: string
  currencyLabel: string
  availabilityDelay: string
  channel: string
  incoterms: string
  bankAccountLabel: string
  discountNote: string
  stockReserveEnabled: boolean | null
  lines: OrderLineDetail[]
  totalHt: number
  totalVat: number
  totalTtc: number
  editUrl: string
  refEditUrl: string
  refCustomerEditUrl: string
  projectEditUrl: string
  otherOrdersUrl: string
  actions: OrderAction[]
  relatedObjects: RelatedObjectRow[]
  docGenOptions: DocGenOptions
  marginRows: MarginRow[]
  linkedEvents: LinkedEventRow[]
  notesBadge: number
  documentsBadge: number
  agendaBadge: number
}

export interface OrderNotes {
  notePublic: string
  notePrivate: string
  notePublicEditUrl: string
  notePrivateEditUrl: string
}

export interface OrderDocumentRow {
  name: string
  url: string
  size: string
  date: string
  // Whether the authenticated user may delete this file (permtoedit).
  deletable: boolean
}

export interface LinkedFileRow {
  id: number
  label: string
  url: string
  date: string
}

export interface DocumentsPageMeta {
  attachedCount: number
  totalSize: string
  savingDocMask: string
  links: LinkedFileRow[]
}

export interface ContactRow {
  nature: string
  thirdParty: string
  contact: string
  contactType: string
  status: string
}

export interface ContactOption {
  value: string
  label: string
}

export interface ContactFormOptions {
  issuerCompanyName: string
  internalUserOptions: ContactOption[]
  internalTypeOptions: ContactOption[]
  companyOptions: ContactOption[]
  selectedCompanyId: string
  externalContactOptions: ContactOption[]
  hasRealExternalContact: boolean
  externalTypeOptions: ContactOption[]
}

export interface ShipmentStockRow {
  description: string
  qtyOrdered: number
  qtyShipped: number
  remainToShip: number
  realStock: number
}

export interface WarehouseOption {
  value: string
  label: string
}

export interface CreateShipmentFormOptions {
  warehouseOptions: WarehouseOption[]
  defaultWarehouseId: string
}

export interface ConsumptionFormOptions {
  warehouseOptions: WarehouseOption[]
  productOptions: WarehouseOption[]
  defaultLabel: string
}

export interface ConsumptionRow {
  ref: string
  date: string
  productRef: string
  lotSerial: string
  warehouse: string
  invMovCode: string
  labelOfMovement: string
  origin: string
  qty: string
}

export interface AgendaEventRow {
  ref: string
  url: string
  date: string
  owner: string
  label: string
  relatedObjectRef: string
  relatedObjectUrl: string
  statusLabel: string
}

export interface AgendaPageData {
  createdBy: string
  creationDate: string
  latestModificationDate: string
  validatedBy: string
  validationDate: string
  events: AgendaEventRow[]
}

export interface SenderOption {
  value: string
  label: string
}

export interface OrderEmailDefaults {
  senderOptions: SenderOption[]
  defaultFromType: string
  defaultSubject: string
  defaultMessage: string
  attachedFileName: string
}
