/**
 * Centralized Quotations API client.
 * Uses bearer-token-authenticated fapi endpoints that wrap the
 * existing Dolibarr Propal business class.
 */

import { fapi } from './axios'

export interface QuotationRow {
  id: number
  ref: string
  ref_client: string
  fk_soc: number
  third_party_name: string
  third_party_code: string
  third_party_town: string
  date_propal: string | null
  date_valid: string | null
  date_creation: string | null
  date_close: string | null
  fin_validite: string | null
  total_ht: number
  total_vat: number
  total_ttc: number
  fk_statut: number
  status_label: string
  fk_user_author: number
  author_login: string
  author_firstname: string
  author_lastname: string
  multicurrency_code: string
  multicurrency_total_ht: number
  multicurrency_total_ttc: number
  project_id: number | null
  project_ref: string | null
  note_private: string | null
  note_public: string | null
}

export interface QuotationLine {
  id: number
  rowid: number
  line_id?: number
  product_id: number | null
  ref?: string
  label: string
  description: string
  qty: number
  pu_ht: number
  subprice?: number
  remise_percent: number
  tva_tx: number
  total_ht: number
  total_tva: number
  total_vat?: number
  total_ttc: number
  fk_unit: number | null
  product_type: number
}

export interface QuotationDetail extends QuotationRow {
  date?: string | number
  date_validation?: string | number
  payment_terms?: string
  payment_type?: string
  availability?: string
  channel?: string
  shipping_method?: string
  bank_account?: string
  currency?: string
  incoterm_label?: string
  delivery_date?: string | number
  discounts_text?: string
  thirdparty?: { id: number; name: string }
  lines: QuotationLine[]
  actions: {
    can_edit: number
    can_delete: number
    can_validate: number
    can_sign: number
    can_refuse: number
    can_close: number
    can_reopen: number
    can_clone: number
    can_sendmail?: number
    can_create_order?: number
    can_create_intervention?: number
    can_create_contract?: number
    can_create_invoice?: number
    can_classify_billed?: number
  }
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface FapiSuccess<T> {
  success: boolean
  data: T
  message: string | null
  errors: unknown[]
}

interface FapiListResponse<T> {
  success: boolean
  data: { items: T[]; pagination: Pagination }
  message: string | null
  errors: unknown[]
}

function unwrap<T>(response: FapiSuccess<T>): T {
  if (!response?.success) {
    const errors = response?.errors?.map((error) => typeof error === 'string' ? error : JSON.stringify(error)) ?? []
    throw new Error([response?.message, ...errors].filter(Boolean).join(': ') || 'The quotation API returned an unsuccessful response.')
  }
  return response.data
}

export interface QuotationListParams {
  page?: number
  limit?: number
  search?: string
  status?: number
  socid?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export async function fetchQuotations(params: QuotationListParams = {}): Promise<{
  items: QuotationRow[]
  pagination: Pagination
}> {
  const res = await fapi.get<FapiListResponse<QuotationRow>>('/comm/propal/fapi/list.php', { params })
  return unwrap(res.data)
}

export async function fetchQuotation(id: number): Promise<QuotationDetail> {
  const res = await fapi.get<FapiSuccess<QuotationDetail>>('/comm/propal/fapi/get.php', { params: { id } })
  return unwrap(res.data)
}

export interface CreateQuotationInput {
  socid: number
  date?: string
  fin_validite?: string
  note_private?: string
  note_public?: string
  ref_client?: string
  project_id?: number
  cond_reglement_id?: number
  mode_reglement_id?: number
  multicurrency_code?: string
  multicurrency_tx?: number
}

export async function createQuotation(input: CreateQuotationInput): Promise<{ id: number; ref: string }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref: string }>>('/comm/propal/fapi/create.php', input)
  return unwrap(res.data)
}

export async function updateQuotation(id: number, input: Partial<CreateQuotationInput>): Promise<{ id: number; ref: string }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref: string }>>('/comm/propal/fapi/update.php', input, { params: { id } })
  return unwrap(res.data)
}

export async function deleteQuotation(id: number): Promise<{ id: number }> {
  const res = await fapi.delete<FapiSuccess<{ id: number }>>('/comm/propal/fapi/delete.php', { params: { id } })
  return unwrap(res.data)
}

export type QuotationAction = 'classify_billed' | 'reopen' | 'close' | 'clone' | 'delete' | 'build_doc' | 'validate'

export async function quotationAction(
  id: number,
  action: QuotationAction,
  input: { status?: 2 | 3 | 4; note?: string; socid?: number; model?: string; lang_id?: string } = {},
): Promise<{ id: number; ref?: string; fk_statut?: number }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref?: string; fk_statut?: number }>>(
    '/comm/propal/fapi/proposal.php', { id, ...input }, { params: { action } },
  )
  return unwrap(res.data)
}

export interface AddLineInput {
  description?: string
  pu_ht?: number
  qty?: number
  tva_tx?: number
  remise_percent?: number
  product_id?: number
  product_type?: number
  fk_unit?: number
  label?: string
}

export async function addQuotationLine(quotationId: number, input: AddLineInput): Promise<{
  line_id: number; total_ht: number; total_vat: number; total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/comm/propal/fapi/lines.php', { id: quotationId, action: 'add', ...input },
  )
  return unwrap(res.data)
}

export async function updateQuotationLine(quotationId: number, lineId: number, input: AddLineInput): Promise<{
  line_id: number; total_ht: number; total_vat: number; total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/comm/propal/fapi/lines.php', { id: quotationId, action: 'update', line_id: lineId, ...input },
  )
  return unwrap(res.data)
}

export async function deleteQuotationLine(quotationId: number, lineId: number): Promise<{
  line_id: number; total_ht: number; total_vat: number; total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/comm/propal/fapi/lines.php', { id: quotationId, action: 'delete', line_id: lineId },
  )
  return unwrap(res.data)
}

export interface QuotationContact {
  linkid: number
  id: number
  name: string
  login?: string
  type_code: string
  type_label: string
  fk_c_type_contact: number
  status: number
  statuscontact: number
  status_label: string
  nature: 'internal' | 'external'
  nature_label: string
  thirdparty: string
}

export interface QuotationContactsData {
  id: number
  socid: number
  rows: { internal: QuotationContact[]; external: QuotationContact[] }
  options: {
    issuer_company: string
    internal_types: Array<{ value: number; label: string }>
    external_types: Array<{ value: number; label: string }>
    users: Array<{ id: number; name: string; login: string }>
    companies: Array<{ id: number; name: string }>
    company_contacts: Array<{ id: number; name: string; poste: string; email: string }>
    selected_company: number
    can_edit: boolean
  }
}

export async function fetchQuotationContacts(id: number): Promise<QuotationContactsData> {
  const res = await fapi.get<FapiSuccess<QuotationContactsData>>('/comm/propal/fapi/contacts.php', { params: { id } })
  return unwrap(res.data)
}

export type QuotationContactChange =
  | { action: 'add'; source: 'internal'; userid: number; type: number }
  | { action: 'add'; source: 'external'; contactid: number; type: number }
  | { action: 'delete' | 'swap'; lineid: number }

export async function changeQuotationContact(id: number, change: QuotationContactChange): Promise<void> {
  const { action, ...payload } = change
  const res = await fapi.post<FapiSuccess<unknown>>('/comm/propal/fapi/contacts.php', { id, ...payload }, { params: { action } })
  unwrap(res.data)
}

export interface QuotationNotes {
  id: number
  note_public: string
  note_private: string
  can_edit: boolean
}

export async function fetchQuotationNotes(id: number): Promise<QuotationNotes> {
  const res = await fapi.get<FapiSuccess<QuotationNotes>>('/comm/propal/fapi/notes.php', { params: { id } })
  return unwrap(res.data)
}

export interface QuotationFormOption {
  value: string
  label: string
  code: string
}

export interface QuotationFormOptions {
  availability: QuotationFormOption[]
  demand_reasons: QuotationFormOption[]
  payment_terms: QuotationFormOption[]
  payment_methods: QuotationFormOption[]
  shipping_methods: QuotationFormOption[]
  incoterms: QuotationFormOption[]
  bank_accounts: QuotationFormOption[]
  warehouses: QuotationFormOption[]
  currencies: QuotationFormOption[]
  multicurrencies: QuotationFormOption[]
  document_models: QuotationFormOption[]
  languages: QuotationFormOption[]
  close_reasons: QuotationFormOption[]
  currency_default: string
}

export async function fetchQuotationFormOptions(): Promise<QuotationFormOptions> {
  const res = await fapi.get<FapiSuccess<QuotationFormOptions>>('/comm/propal/fapi/form_options.php')
  return unwrap(res.data)
}

export async function saveQuotationNotes(id: number, notes: Partial<Pick<QuotationNotes, 'note_public' | 'note_private'>>): Promise<QuotationNotes> {
  const res = await fapi.post<FapiSuccess<QuotationNotes>>('/comm/propal/fapi/notes.php', { id, ...notes }, { params: { action: 'save' } })
  return unwrap(res.data)
}

export interface QuotationDocumentFile {
  name: string
  url: string
  size: string
  size_raw: number
  date: string
}

export interface QuotationDocumentLink {
  id: number
  label: string
  url: string
  date: string
}

export interface QuotationDocumentsData {
  id: number
  files: QuotationDocumentFile[]
  links: QuotationDocumentLink[]
  meta: { can_edit: boolean; modulepart: string }
}

export async function fetchQuotationDocuments(id: number): Promise<QuotationDocumentsData> {
  const res = await fapi.get<FapiSuccess<QuotationDocumentsData>>('/comm/propal/fapi/documents.php', { params: { id } })
  return unwrap(res.data)
}

export async function uploadQuotationDocument(id: number, file: File): Promise<void> {
  const body = new FormData()
  body.append('id', String(id))
  body.append('file', file)
  const res = await fapi.post<FapiSuccess<unknown>>('/comm/propal/fapi/documents.php', body, { params: { action: 'upload' } })
  unwrap(res.data)
}

export async function linkQuotationDocument(id: number, link: string, label: string): Promise<void> {
  const res = await fapi.post<FapiSuccess<unknown>>('/comm/propal/fapi/documents.php', { id, link, label }, { params: { action: 'link' } })
  unwrap(res.data)
}

export async function deleteQuotationDocument(id: number, name: string): Promise<void> {
  const res = await fapi.post<FapiSuccess<unknown>>('/comm/propal/fapi/documents.php', { id, name }, { params: { action: 'delete_file' } })
  unwrap(res.data)
}

export async function deleteQuotationDocumentLink(id: number, linkid: number): Promise<void> {
  const res = await fapi.post<FapiSuccess<unknown>>('/comm/propal/fapi/documents.php', { id, linkid }, { params: { action: 'delete_link' } })
  unwrap(res.data)
}

export interface QuotationAgendaEvent {
  id: number
  ref: string
  url: string
  date: string
  date_end: string
  owner: string
  label: string
  related_object_ref: string
  related_object_url: string
  status_label: string
  percent: number
}

export interface QuotationAgendaData {
  id: number
  created_by: string
  creation_date: string
  latest_modification_date: string
  validated_by: string
  validation_date: string
  closing_date?: string
  events: QuotationAgendaEvent[]
}

export interface QuotationStatsData {
  year: number
  mode: string
  years: Array<{ year: number; count: number; total: number; average: number }>
  count_by_month: Record<string, number[]>
  amount_by_month: Record<string, number[]>
  average_by_month: Record<string, number[]>
  summary: { count: number; total_amount: number; average_amount: number }
}

export async function fetchQuotationStats(year: number): Promise<QuotationStatsData> {
  const res = await fapi.get<FapiSuccess<QuotationStatsData>>('/comm/propal/fapi/stats.php', { params: { year } })
  return unwrap(res.data)
}

export async function fetchQuotationAgenda(id: number): Promise<QuotationAgendaData> {
  const res = await fapi.get<FapiSuccess<QuotationAgendaData>>('/comm/propal/fapi/agenda.php', { params: { id } })
  return unwrap(res.data)
}

export async function createQuotationAgendaEvent(id: number, label: string, start: string): Promise<void> {
  const res = await fapi.post<FapiSuccess<unknown>>('/comm/propal/fapi/agenda.php', { id, label, start }, { params: { action: 'add' } })
  unwrap(res.data)
}

export interface QuotationEmailDefaults {
  id: number
  ref: string
  sender_options: Array<{ value: string; label: string }>
  default_from_type: string
  recipients: Array<{ value: string; label: string }>
  default_subject: string
  default_message: string
  attached_file: { name: string; size: number } | null
}

export async function fetchQuotationEmailDefaults(id: number): Promise<QuotationEmailDefaults> {
  const res = await fapi.get<FapiSuccess<QuotationEmailDefaults>>('/comm/propal/fapi/proposal.php', {
    params: { action: 'email_defaults', id },
  })
  return unwrap(res.data)
}

export interface SendQuotationEmailInput {
  id: number
  sendto: string
  sendtocc?: string
  sendtobcc?: string
  fromtype?: string
  subject: string
  message?: string
  attach_doc?: boolean
  attachments?: File[]
}

export async function sendQuotationEmail(input: SendQuotationEmailInput): Promise<void> {
  const body = new FormData()
  body.append('id', String(input.id))
  body.append('sendto', input.sendto)
  body.append('sendtocc', input.sendtocc ?? '')
  body.append('sendtobcc', input.sendtobcc ?? '')
  body.append('fromtype', input.fromtype ?? '')
  body.append('subject', input.subject)
  body.append('message', input.message ?? '')
  body.append('attach_doc', input.attach_doc === false ? '0' : '1')
  for (const file of input.attachments ?? []) body.append('attachments[]', file)
  const res = await fapi.post<FapiSuccess<unknown>>('/comm/propal/fapi/proposal.php', body, { params: { action: 'send_email' } })
  unwrap(res.data)
}

export interface QuotationConsumptionRow {
  id: number
  ref: string
  date: string
  product_id: number
  product_ref: string
  product_label: string
  lot_serial: string
  warehouse_id: number
  warehouse: string
  warehouse_lieu: string
  inv_mov_code: string
  label_of_movement: string
  origin: string
  qty: number
  by: string
}

export interface QuotationConsumptionHistory {
  id: number
  type: string
  rows: QuotationConsumptionRow[]
  options: {
    warehouses: Array<{ id: number; ref: string; lieu: string }>
    products: Array<{ id: number; label: string }>
    default_label: string
    batch_enabled: boolean
    eatby_enabled: boolean
    sellby_enabled: boolean
    can_write: boolean
  }
}

export async function fetchQuotationConsumptionHistory(id: number): Promise<QuotationConsumptionHistory> {
  const res = await fapi.get<FapiSuccess<QuotationConsumptionHistory>>('/custom/consumption/fapi/history.php', {
    params: { id, type: 'propal' },
  })
  return unwrap(res.data)
}

export async function declareQuotationConsumption(input: {
  id: number
  product: number
  id_entrepot: number
  nbpiece: number
  label: string
  batch_number?: string
  eatby?: string
  sellby?: string
}): Promise<void> {
  const res = await fapi.post<FapiSuccess<unknown>>('/custom/consumption/fapi/history.php', input, {
    params: { action: 'declare', type: 'propal' },
  })
  unwrap(res.data)
}

export interface QuotationConversionResult {
  id: number
  ref: string
  propal_id: number
  propal_ref: string
  lines_copied: number
}

export async function createQuotationInvoice(input: {
  propal_id: number
  date?: string
  date_due?: string
  cond_reglement_id?: number
  mode_reglement_id?: number
  bank_account_id?: number
  ref_client?: string
  note_public?: string
  note_private?: string
  type?: number
}): Promise<QuotationConversionResult> {
  const res = await fapi.post<FapiSuccess<QuotationConversionResult>>('/compta/facture/fapi/create_from_propal.php', input)
  return unwrap(res.data)
}

export async function createQuotationContract(input: {
  propal_id: number
  date_contrat?: string
  date_start?: string
  date_end?: string
  ref_customer?: string
  note_public?: string
  note_private?: string
}): Promise<QuotationConversionResult> {
  const res = await fapi.post<FapiSuccess<QuotationConversionResult>>('/contrat/fapi/create_from_propal.php', input)
  return unwrap(res.data)
}

export async function createQuotationIntervention(input: {
  propal_id: number
  date_intervention?: string
  description?: string
  copy_lines?: boolean
  duration?: number
  note_public?: string
  note_private?: string
}): Promise<QuotationConversionResult> {
  const res = await fapi.post<FapiSuccess<QuotationConversionResult>>('/fichinter/fapi/create_from_propal.php', input)
  return unwrap(res.data)
}
