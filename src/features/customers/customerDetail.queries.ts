import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { fapi } from '../../api/axios'
import { updateThirdParty } from '../../api/customers'

// GET societe/api/societe.php?id=X — a real, working endpoint discovered by
// probing the same societe/api/* namespace the Customer List (list.php) and
// Create Customer (societes.php) features already use. Confirmed live: `tab`/
// `action` query params are silently ignored — this always returns the SAME
// full profile regardless, so there's exactly one call for this whole page,
// not one per tab. Response also carries `tabs` (the legacy page's full tab
// list) and `urls` (real legacy card.php links, kept only for reference —
// this app routes internally instead of following them, per the standing
// rule against linking back to legacy pages).
export interface CustomerProfile {
  id: number
  name: string
  nameAlias: string
  nameTitle: string
  lastname: string
  email: string
  phone: string
  fax: string
  web: string
  address: string
  zip: string
  town: string
  stateId: number
  countryId: number
  countryLabel: string
  client: number
  fournisseur: number
  isCustomer: boolean
  isVendor: boolean
  status: number
  codeClient: string
  codeFournisseur: string
  tpin: string
  trackingId: string
  vatId: string
  capital: string
  typentId: number
  effectifId: number
  formeJuridiqueCode: string
  formeJuridique: string
  effectif: string
  currencyCode: string
  groupId: number
  branchCode: string
  employeeNum: string
  employerName: string
  supervisorDetails: string
  nrcId: string
  nrcNum: string
  barcode: string
  codeCompta: string
  codeComptaFournisseur: string
  notePublic: string
  notePrivate: string
  clientLabel: string
  prospectLevelLabel: string
  stcommLabel: string
  logoUrl: string
  zraStatus: string
  kpiQuotation: number
  kpiQuotationCount: number
  kpiOrder: number
  kpiOrderCount: number
  kpiInvoice: number
  kpiInvoiceCount: number
  kpiOutstanding: number
  kpiOutstandingCount: number
  advance: number
  kpiAdvanceCount: number
  taskCount: number
  callCount: number
  meetingCount: number
  invoiceCount: number
  contactCount: number
  shippingMethodLabel: string
  paymentTermLabel: string
  paymentTypeLabel: string
  bankAccountLabel: string
  relativeDiscountPercent: number
  globalDiscount: number
  maxOutstanding: number
  incotermsLabel: string
  dateCreation: string
  createdBy: string
  salesReps: string[]
  defaultLang: string
}

interface RawSocieteProfile {
  id: number
  name: string
  name_alias: string
  name_title: string
  lastname: string
  email: string
  phone: string
  fax: string
  url: string
  address: string
  zip: string
  town: string
  state_id: number
  country_id: number
  country_label: string
  client: number
  fournisseur: number
  is_customer: number
  is_vendor: number
  status: number
  code_client: string
  code_fournisseur: string
  idprof1: string
  idprof2: string
  tva_intra: string
  capital: string
  typent_id: number
  effectif_id: number
  forme_juridique_code: string
  forme_juridique: string
  effectif: string
  multicurrency_code: string
  group_id: number
  branch_code: string
  employee_num: string
  employer_name: string
  supervisor_det: string
  nrc_id: string
  nrc_num: string
  barcode: string
  code_compta: string
  code_compta_fournisseur: string
  note_public: string
  note_private: string
  client_label: string
  prospect_level_label: string
  stcomm_label: string
  logo_url: string
  zrastatus: string
  kpi_quotation: number
  kpi_quotation_count: number
  kpi_order: number
  kpi_order_count: number
  kpi_invoice: number
  kpi_invoice_count: number
  kpi_outstanding: number
  kpi_outstanding_count: number
  advance: number
  kpi_advance_count: number
  task_count: number
  call_count: number
  meeting_count: number
  invoice_count: number
  contact_count: number
  shipping_method_label: string
  cond_reglement_label: string
  mode_reglement_label: string
  bank_account_label: string
  remise_percent: number
  remise_absolue: number
  outstanding_limit: number
  incoterms_label: string
  date_creation: string
  created_by: string
  // Empty on every profile checked live so far — shape not confirmed, kept
  // loose and mapped defensively (see mapProfile) rather than assumed.
  sales_reps: unknown[]
  default_lang: string
}

function mapProfile(raw: RawSocieteProfile): CustomerProfile {
  return {
    id: raw.id,
    name: raw.name,
    nameAlias: raw.name_alias,
    nameTitle: raw.name_title,
    lastname: raw.lastname,
    email: raw.email,
    phone: raw.phone,
    fax: raw.fax,
    web: raw.url,
    address: raw.address,
    zip: raw.zip,
    town: raw.town,
    stateId: raw.state_id,
    countryId: raw.country_id,
    countryLabel: raw.country_label,
    client: raw.client,
    fournisseur: raw.fournisseur,
    isCustomer: raw.is_customer === 1,
    isVendor: raw.is_vendor === 1,
    status: raw.status,
    codeClient: raw.code_client,
    codeFournisseur: raw.code_fournisseur,
    tpin: raw.idprof1,
    trackingId: raw.idprof2,
    vatId: raw.tva_intra,
    capital: raw.capital,
    typentId: raw.typent_id,
    effectifId: raw.effectif_id,
    formeJuridiqueCode: raw.forme_juridique_code,
    formeJuridique: raw.forme_juridique,
    effectif: raw.effectif,
    currencyCode: raw.multicurrency_code,
    groupId: raw.group_id,
    branchCode: raw.branch_code,
    employeeNum: raw.employee_num,
    employerName: raw.employer_name,
    supervisorDetails: raw.supervisor_det,
    nrcId: raw.nrc_id,
    nrcNum: raw.nrc_num,
    barcode: raw.barcode,
    codeCompta: raw.code_compta,
    codeComptaFournisseur: raw.code_compta_fournisseur,
    notePublic: raw.note_public,
    notePrivate: raw.note_private,
    clientLabel: raw.client_label,
    prospectLevelLabel: raw.prospect_level_label,
    stcommLabel: raw.stcomm_label,
    logoUrl: raw.logo_url,
    zraStatus: raw.zrastatus,
    kpiQuotation: raw.kpi_quotation,
    kpiQuotationCount: raw.kpi_quotation_count,
    kpiOrder: raw.kpi_order,
    kpiOrderCount: raw.kpi_order_count,
    kpiInvoice: raw.kpi_invoice,
    kpiInvoiceCount: raw.kpi_invoice_count,
    kpiOutstanding: raw.kpi_outstanding,
    kpiOutstandingCount: raw.kpi_outstanding_count,
    advance: raw.advance,
    kpiAdvanceCount: raw.kpi_advance_count,
    taskCount: raw.task_count,
    callCount: raw.call_count,
    meetingCount: raw.meeting_count,
    invoiceCount: raw.invoice_count,
    contactCount: raw.contact_count,
    shippingMethodLabel: raw.shipping_method_label,
    paymentTermLabel: raw.cond_reglement_label,
    paymentTypeLabel: raw.mode_reglement_label,
    bankAccountLabel: raw.bank_account_label,
    relativeDiscountPercent: raw.remise_percent,
    globalDiscount: raw.remise_absolue,
    maxOutstanding: raw.outstanding_limit,
    incotermsLabel: raw.incoterms_label,
    dateCreation: raw.date_creation,
    createdBy: raw.created_by,
    salesReps: (raw.sales_reps ?? []).map((r) =>
      typeof r === 'string' ? r : typeof r === 'object' && r !== null ? String((r as Record<string, unknown>).name ?? (r as Record<string, unknown>).label ?? '') : String(r),
    ),
    defaultLang: raw.default_lang,
  }
}

// One read of societe/fapi/get.php serves the profile block and the extended block + tags (the second hook below used to make its own
// identical request). Both hooks share this query key and each picks its part with `select`, so the card makes one call, and a save that
// invalidates ['customers', 'detail', id] refreshes both.
interface ThirdPartyRecord {
  profile: RawSocieteProfile
  extended: ThirdPartyExtended
  categories?: ThirdPartyExtra['categories']
}
function useThirdPartyRecord<T>(id: string | undefined, select: (d: ThirdPartyRecord) => T) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => fapiGet<ThirdPartyRecord>('/societe/fapi/get.php', { id }),
    select,
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

// societe/fapi/get.php carries the `profile` block this card maps (key-authenticated; societe/api/societe.php needs a PHP session).
export function useCustomerDetail(id: string | undefined) {
  return useThirdPartyRecord(id, (d): CustomerProfile => mapProfile(d.profile))
}

// Fields the Third-party tab's Edit mode lets a user change — the plain
// text ones only, matching the scope of this edit UI (Country/Currency/
// Business entity type/etc. stay read-only, same reasoning as the create
// form: a proper picker for each is real work with no payoff if the save
// itself can't land, see below).
export type CustomerEditableFields = Partial<
  Pick<
    CustomerProfile,
    | 'name'
    | 'lastname'
    | 'phone'
    | 'email'
    | 'fax'
    | 'web'
    | 'address'
    | 'zip'
    | 'town'
    | 'tpin'
    | 'trackingId'
    | 'vatId'
    | 'employerName'
    | 'employeeNum'
    | 'supervisorDetails'
    | 'branchCode'
    | 'nrcNum'
    | 'capital'
    | 'barcode'
  >
>

// societe/fapi/update.php {note_public, note_private} (Societe::update_note under the hood), the same call the quick edit
// uses; replaces societe/api/notes.php and its CSRF-token form post.
export function useSaveCustomerNotes(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fields: { note_public?: string; note_private?: string }) => updateThirdParty({ id: Number(socid), ...fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid] })
    },
  })
}

// societe/api/documents.php — real multipart upload straight into
// documents/societe/<id>/, confirmed by reading that file directly
// (dol_move_uploaded_file against the real upload_dir).
export function useUploadCustomerDocument(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('socid', socid ?? '')
      form.append('file', file)
      return fapi.post('/societe/fapi/documents.php', form, { params: { action: 'upload', socid } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'documents'] })
    },
  })
}

// societe/fapi/notifications.php?action=add {socid, action_id, contact_id}
export function useAddCustomerNotification(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fields: { action_id: number; contact_id: number }) => fapiPost('/societe/fapi/notifications.php', { socid: Number(socid), ...fields }, { action: 'add', socid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'notifications'] })
    },
  })
}

// societe/fapi/payment_modes.php?action=create {socid, label, bank, number, iban, bic}
export interface NewPaymentModeInput {
  label: string
  bank: string
  number?: string
  iban?: string
  bic?: string
}

export function useCreatePaymentMode(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fields: NewPaymentModeInput) => fapiPost('/societe/fapi/payment_modes.php', { socid: Number(socid), ...fields }, { action: 'create', socid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'paymentmodes'] })
    },
  })
}

// societe/fapi/get.php: the record's `extended` block (sales reps, tag ids, incoterm, VAT, mode, social links, ...) and its
// tags with their type (2 = customer/prospect tag, 1 = supplier tag). societe/api/societe.php (the profile above) has neither.
export interface ThirdPartyExtended {
  sales_reps: number[]
  custcats: number[]
  suppcats: number[]
  incoterm_id: number
  location_incoterms: string
  assujtva_value: number
  usermode: number
  state_id: number
  social_networks: Record<string, string | null>
}
export interface ThirdPartyExtra {
  extended: ThirdPartyExtended
  categories: { id: number; label: string; type: number }[]
}

export function useThirdPartyExtra(id: string | undefined) {
  return useThirdPartyRecord(id, (d): ThirdPartyExtra => ({ extended: d.extended, categories: d.categories ?? [] }))
}

// Quick edit's choices that are not plain text. Ids are the dropdowns' own values.
export interface QuickEditSelects {
  type?: 'customer' | 'prospect' | 'vendor' | 'all'
  formeJuridiqueCode?: number
  effectifId?: number
  countryId?: number
  custcats?: number[]
  suppcats?: number[]
  /** Sent when a record becomes a vendor without a supplier code ('auto' lets the backend number it). */
  supplierCode?: string
}

const QUICK_TEXT_KEYS: Record<keyof CustomerEditableFields, string> = {
  name: 'name',
  lastname: 'lastname',
  phone: 'phone',
  email: 'email',
  fax: 'fax',
  web: 'url',
  address: 'address',
  zip: 'zip',
  town: 'town',
  tpin: 'tpin',
  trackingId: 'tracking',
  vatId: 'vat_number',
  employerName: 'employer_name',
  employeeNum: 'employee_num',
  supervisorDetails: 'supervisor_det',
  branchCode: 'branch_code',
  nrcNum: 'nrc_num',
  capital: 'capital',
  barcode: 'barcode',
}

// Saves the quick-edit card through societe/fapi/update.php with only what changed.
export function useQuickUpdateCustomer(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ text, selects }: { text: CustomerEditableFields; selects: QuickEditSelects }) => {
      const body: Record<string, string | number | number[]> = {}
      for (const [k, v] of Object.entries(text)) body[QUICK_TEXT_KEYS[k as keyof CustomerEditableFields]] = v ?? ''
      if (selects.type) body.type = selects.type
      if (selects.formeJuridiqueCode !== undefined) body.forme_juridique_code = selects.formeJuridiqueCode
      if (selects.effectifId !== undefined) body.effectif_id = selects.effectifId
      if (selects.countryId !== undefined) body.country_id = selects.countryId
      if (selects.custcats) body.custcats = selects.custcats
      if (selects.suppcats) body.suppcats = selects.suppcats
      if (selects.supplierCode) body.code_fournisseur = selects.supplierCode
      if (Object.keys(body).length === 0) return { id }
      try {
        return await updateThirdParty({ id, ...body })
      } catch (err) {
        const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        if (typeof message === 'string') throw new Error(message)
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
