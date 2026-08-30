import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { fetchSocieteFormContext } from './thirdPartyOptions.queries'

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

interface RawSocieteResponse {
  ok: boolean
  error?: string
  profile: RawSocieteProfile
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

export function useCustomerDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: async (): Promise<CustomerProfile> => {
      const { data } = await axios.get<string>(`/societe/api/societe.php`, {
        params: { id },
        transformResponse: (raw) => raw,
      })
      const parsed: RawSocieteResponse = JSON.parse(data.trim())
      if (!parsed.ok) throw new Error(parsed.error ?? 'Failed to load third party')
      return mapProfile(parsed.profile)
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  })
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

// No real update action exists on societe/api/societes.php — every action
// verb tried live (update, edit, save, update_extra, modify, patch, set)
// returns {"ok":false,"error":"Unknown action or method"}, and the legacy
// card.php?action=edit page doesn't render the third party's own main
// fields as an editable form either (checked directly: none of its forms
// contain a name/lastname input, only sub-feature forms like bank account
// and payment-term config). This mutation still attempts the real call
// (action: 'update', the REST-conventional verb, matching action: 'create'
// on the working create endpoint) rather than being disabled outright —
// same "attempt the real action, surface the real error" pattern already
// used for Duplicate elsewhere in this app — so if the backend ever adds
// this action, it starts working with no frontend change needed, and until
// then the user sees the actual backend rejection, not a fake success.
export function useUpdateCustomer(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fields: CustomerEditableFields) => {
      const { token } = await fetchSocieteFormContext()
      // validateStatus accepts every status here — this endpoint's own
      // error responses (confirmed live: 400 with a real {ok:false,error}
      // body) are still meaningful JSON, not the exception case; letting
      // axios throw its own generic "Request failed with status code 400"
      // on those would bury the real backend message this banner needs to
      // show instead.
      const { data } = await axios.post<{ ok: boolean; error?: string; message?: string }>(
        '/societe/api/societes.php',
        { action: 'update', id, token, ...fields },
        { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true },
      )
      if (!data.ok) throw new Error(data.error ?? data.message ?? 'Failed to save changes')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', String(id)] })
    },
  })
}

// societe/api/notes.php — real, editable Public/Private notes, confirmed by
// reading that file directly (Societe::update_note() under the hood).
// Replaces the earlier read-only NotesTab, which only displayed
// CustomerProfile.notePublic/notePrivate from the main profile fetch.
export function useSaveCustomerNotes(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fields: { note_public?: string; note_private?: string }) => {
      const { token } = await fetchSocieteFormContext()
      const { data } = await axios.post<{ ok: boolean; error?: string; message?: string }>(
        `/societe/api/notes.php?socid=${socid}`,
        { token, ...fields },
        { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true },
      )
      if (!data.ok) throw new Error(data.error ?? data.message ?? 'Failed to save notes')
      return data
    },
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
      const { token } = await fetchSocieteFormContext()
      const form = new FormData()
      form.append('token', token)
      form.append('file', file)
      const { data } = await axios.post<{ ok: boolean; error?: string; message?: string }>(`/societe/api/documents.php?socid=${socid}`, form, { validateStatus: () => true })
      if (!data.ok) throw new Error(data.error ?? data.message ?? 'Failed to upload file')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'documents'] })
    },
  })
}

// societe/api/notify.php?action=add — real INSERT into llx_notify_def,
// confirmed by reading that file directly.
export function useAddCustomerNotification(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fields: { action_id: number; contact_id: number }) => {
      const { token } = await fetchSocieteFormContext()
      const { data } = await axios.post<{ ok: boolean; error?: string; message?: string }>(
        `/societe/api/notify.php?socid=${socid}`,
        { token, action: 'add', ...fields },
        { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true },
      )
      if (!data.ok) throw new Error(data.error ?? data.message ?? 'Failed to add notification')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'notifications'] })
    },
  })
}

// societe/api/paymentmodes.php — real INSERT into llx_societe_rib (or a real
// CompanyBankAccount::create() when that class is present on this
// deployment), confirmed by reading that file directly.
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
    mutationFn: async (fields: NewPaymentModeInput) => {
      const { token } = await fetchSocieteFormContext()
      const { data } = await axios.post<{ ok: boolean; error?: string; message?: string }>(
        `/societe/api/paymentmodes.php?socid=${socid}`,
        { token, action: 'create', ...fields },
        { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true },
      )
      if (!data.ok) throw new Error(data.error ?? data.message ?? 'Failed to add payment mode')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'paymentmodes'] })
    },
  })
}
