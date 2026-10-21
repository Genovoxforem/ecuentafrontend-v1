// Shapes the vendor invoice card renders (header, lines, payments, contacts, log). They are filled from fourn/facture/fapi
// (vendorInvoiceFapi.ts, vendorInvoiceDetail.queries.ts); nothing here parses HTML any more.

export interface VendorInvoiceLineRow {
  rowid: string
  productId: string | null
  productLabel: string
  fournRef: string
  vatRatePercent: string
  landedCost: boolean
  unitPriceExcl: string
  qty: string
  discountPercent: string
  totalIncl: string
  lotNumber: string
  lotEatBy: string
  lotSellBy: string
  lotWarehouseName: string
}

// One entry of get.php's available_actions: the server says whether the action is allowed now and why not.
export interface VendorInvoiceAction {
  key: string
  label: string
  enabled: boolean
  reason: string
}

export interface VendorInvoicePaymentRow {
  id: number
  ref: string
  url: string
  date: string
  type: string
  bankAccount: string
  amount: string
}

export interface ShipmentDetailField {
  label: string
  value: string
}

export interface VendorInvoiceExtraPanels {
  shipmentFields: ShipmentDetailField[]
  expensesMessage: string
  landedCostMessage: string
}

export interface VendorInvoiceContactRow {
  nature: string
  thirdParty: string
  contact: string
  contactType: string
  status: string
}

export interface VendorInvoiceDetail {
  id: number
  ref: string
  refEditUrl: string
  refVendor: string
  refVendorEditUrl: string
  thirdPartyName: string
  thirdPartySocid: number | null
  otherInvoicesUrl: string
  projectLabel: string
  projectEditUrl: string
  statusLabel: string
  statusBadgeNumber: number | null
  secondaryStatusLabel: string
  cloneUrl: string
  deleteUrl: string
  deleteDisabledReason: string

  typeLabel: string
  discountInfo: string
  label: string
  labelEditUrl: string
  invoiceDate: string
  paymentTerms: string
  paymentTermsEditUrl: string
  zraStatus: string
  paymentDueOn: string
  paymentType: string
  paymentTypeEditUrl: string
  currencyLabel: string
  bankAccount: string
  bankAccountEditUrl: string
  incoterms: string
  incotermsEditUrl: string

  subtotal: string
  amountExclTax: string
  vatAmount: string
  amountInclTax: string

  lines: VendorInvoiceLineRow[]
  extraPanels: VendorInvoiceExtraPanels

  actions: VendorInvoiceAction[]

  payments: VendorInvoicePaymentRow[]
  alreadyPaid: string
  billed: string
  remainingUnpaid: string

  notesBadge: number
  documentsBadge: number
}

export interface VendorInvoiceLogData {
  createdBy: string
  creationDate: string
  latestModificationDate: string
  validatedBy: string
  validationDate: string
}

