// Shapes of the Quotation Detail page's data, filled by quotationDetail.queries.ts
// from the quotation FAPI (comm/propal/fapi/*). Field meanings follow the
// classic comm/propal/card.php page they replace.

export interface QuotationLineDetail {
  id: number
  productId: number
  productLabel: string
  description: string
  qty: number
  unitPriceExcl: number
  vatRate: number
  vatCode: string
  discountValue: number
  discountType: '1' | '2'
  buyingPrice: number
  totalHt: number
  totalTva: number
  totalTtc: number
}

export interface QuotationDocOption {
  value: string
  label: string
}
export interface QuotationDocGenOptions {
  token: string
  modelOptions: QuotationDocOption[]
  langOptions: QuotationDocOption[]
  defaultLang: string
}
export interface QuotationLinkedFile {
  name: string
  url: string
}

// Every condition here is read directly from card.php's own action-buttons
// block (fk_statut only — the usercan* permission flags all end up true for
// this deployment's own admin user, not modeled separately).
export interface QuotationAvailableActions {
  canValidate: boolean
  canModify: boolean
  canReopen: boolean
  canSendMail: boolean
  canCloseAsAcceptedRefused: boolean
  canCreateOrder: boolean
  canCreateIntervention: boolean
  canCreateContract: boolean
  canCreateInvoice: boolean
  canClassifyBilled: boolean
  canClone: boolean
  canDelete: boolean
}

// "Related Objects" — Form::showLinkedObjectBlock(), a generic Dolibarr
// widget shared by every document type (not propal-specific), read directly
// from that function's real source. It renders a
// `table[data-block="showLinkedObject"]` with a fixed 7-column header
// (Type/Ref/[picto]/Date/AmountHTShort/Status/[unlink]) whatever the linked
// object type — the per-type row content underneath comes from that type's
// own linkedobjectblock.tpl.php include, so rows are read generically by
// position rather than assuming one type's exact inner markup.
export interface RelatedObjectRow {
  type: string
  ref: string
  url: string
  date: string
  amount: number
  statusLabel: string
  unlinkUrl: string
}

// "Margin Details" — FormMargin::displayMarginInfos(), read directly from
// its real source (core/class/html.formmargin.class.php). Only rendered at
// all when the user has margins->liretous rights; the "Total Margin" row
// only exists when both the product AND service modules are enabled (both
// true on this deployment, per the real screenshot showing all 3 rows).
export interface MarginRow {
  label: string
  sellingPrice: number
  costPrice: number
  margin: number
}

// FormActions::showactions($object, 'propal', $socid, 1) — Dolibarr's
// generic "Latest linked events" mini-widget, shared by every document type
// (not anything propal-specific).
export interface LatestLinkedEventRow {
  ref: string
  url: string
  date: string
  by: string
  type: string
  title: string
}

export interface QuotationCard {
  id: number
  ref: string
  refCustomer: string
  thirdPartyName: string
  socid: number | null
  projectRef: string
  projectId: number | null
  statusLabel: string
  statusCode: number | null
  discountsText: string
  date: string
  validityEndingDate: string
  paymentTerms: string
  deliveryDate: string
  availabilityDelay: string
  shippingMethod: string
  source: string
  paymentType: string
  currency: string
  bankAccount: string
  calculatedWeight: string
  incotermLabel: string
  amountHt: number
  amountVat: number
  amountTtc: number
  lines: QuotationLineDetail[]
  docGen: QuotationDocGenOptions
  closeReasons: Array<{ value: string; label: string }>
  linkedFiles: QuotationLinkedFile[]
  relatedObjects: RelatedObjectRow[]
  marginRows: MarginRow[]
  latestLinkedEvents: LatestLinkedEventRow[]
  actions: QuotationAvailableActions
}
