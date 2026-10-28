import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeQuotationContact,
  declareQuotationConsumption,
  fetchQuotation,
  fetchQuotationAgenda,
  fetchQuotationConsumptionHistory,
  fetchQuotationContacts,
  fetchQuotationDocuments,
  fetchQuotationFormOptions,
  fetchQuotationNotes,
  linkQuotationDocument,
  quotationAction,
  saveQuotationNotes,
  uploadQuotationDocument,
} from '../../api/quotations'
import type { QuotationCard, QuotationLineDetail } from './quotationCard.types'

function dateLabel(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const numeric = Number(value)
  const date = Number.isFinite(numeric) && numeric > 1000000000
    ? new Date(numeric * 1000)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString()
}

function allowed(value: number | boolean | undefined): boolean {
  return value === true || value === 1
}

export function useQuotationCard(id: string | undefined) {
  return useQuery<QuotationCard>({
    queryKey: ['quotations', 'detail', id],
    queryFn: async () => {
      const quotationId = Number(id)
      const [quotation, options, documents] = await Promise.all([
        fetchQuotation(quotationId),
        fetchQuotationFormOptions(),
        fetchQuotationDocuments(quotationId),
      ])
      const status = quotation.fk_statut
      const lines: QuotationLineDetail[] = quotation.lines.map((line) => ({
        id: line.line_id || line.id || line.rowid || 0,
        productId: line.product_id ?? 0,
        productLabel: line.label || line.ref || '',
        description: line.description || '',
        qty: line.qty,
        unitPriceExcl: line.subprice ?? line.pu_ht ?? 0,
        vatRate: line.tva_tx,
        vatCode: '',
        discountValue: line.remise_percent ?? 0,
        discountType: '1',
        buyingPrice: 0,
        totalHt: line.total_ht ?? 0,
        totalTva: line.total_vat ?? line.total_tva ?? 0,
        totalTtc: line.total_ttc ?? 0,
      }))
      const modelOptions = options.document_models.map(({ value, label }) => ({ value, label }))
      const langOptions = options.languages.map(({ value, label }) => ({ value, label }))
      const apiActions = quotation.actions

      return {
        id: quotation.id,
        ref: quotation.ref,
        refCustomer: quotation.ref_client,
        thirdPartyName: quotation.thirdparty?.name ?? quotation.third_party_name,
        socid: quotation.thirdparty?.id ?? quotation.fk_soc,
        projectRef: quotation.project_ref ?? '',
        projectId: quotation.project_id,
        statusLabel: quotation.status_label,
        statusCode: status,
        discountsText: '',
        date: dateLabel(quotation.date ?? quotation.date_propal),
        validityEndingDate: dateLabel(quotation.fin_validite),
        paymentTerms: quotation.payment_terms ?? '',
        deliveryDate: dateLabel(quotation.delivery_date),
        availabilityDelay: quotation.availability ?? '',
        shippingMethod: quotation.shipping_method ?? '',
        source: quotation.channel ?? '',
        paymentType: quotation.payment_type ?? '',
        currency: quotation.multicurrency_code || quotation.currency || options.currency_default,
        bankAccount: quotation.bank_account ?? '',
        calculatedWeight: '',
        incotermLabel: quotation.incoterm_label ?? '',
        amountHt: quotation.total_ht,
        amountVat: quotation.total_vat,
        amountTtc: quotation.total_ttc,
        lines,
        docGen: {
          token: '',
          modelOptions,
          langOptions,
          defaultLang: langOptions[0]?.value ?? '',
        },
        closeReasons: options.close_reasons
          .filter((option) => option.value === '2' || option.value === '3')
          .map(({ value, label }) => ({ value, label })),
        linkedFiles: documents.files.map(({ name, url }) => ({ name, url })),
        relatedObjects: [],
        marginRows: [],
        latestLinkedEvents: [],
        actions: {
          canValidate: allowed(apiActions.can_validate),
          canModify: allowed(apiActions.can_edit),
          canReopen: allowed(apiActions.can_reopen),
          canSendMail: allowed(apiActions.can_sendmail) || status === 1 || status === 2,
          canCloseAsAcceptedRefused: allowed(apiActions.can_close) || allowed(apiActions.can_sign) || allowed(apiActions.can_refuse),
          canCreateOrder: allowed(apiActions.can_create_order) || status === 1 || status === 2,
          canCreateIntervention: allowed(apiActions.can_create_intervention) || status === 1 || status === 2,
          canCreateContract: allowed(apiActions.can_create_contract) || status === 1 || status === 2,
          canCreateInvoice: allowed(apiActions.can_create_invoice) || status === 2,
          canClassifyBilled: allowed(apiActions.can_classify_billed) || status === 2,
          canClone: allowed(apiActions.can_clone),
          canDelete: allowed(apiActions.can_delete),
        },
      }
    },
    enabled: !!id && Number.isFinite(Number(id)),
  })
}

function invalidateDetail(queryClient: ReturnType<typeof useQueryClient>, id: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id] })
  queryClient.invalidateQueries({ queryKey: ['quotations', 'list'] })
}

export function useValidateQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => quotationAction(Number(id), 'validate'),
    onSuccess: (_data, id) => invalidateDetail(queryClient, id),
  })
}

export function useClassifyBilledQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; socid: number | null }) => quotationAction(Number(id), 'classify_billed'),
    onSuccess: (_data, { id }) => invalidateDetail(queryClient, id),
  })
}

export function useReopenQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => quotationAction(Number(id), 'reopen'),
    onSuccess: (_data, id) => invalidateDetail(queryClient, id),
  })
}

export function useCloseAsQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, statut, notePrivate }: { id: string; statut: '2' | '3'; notePrivate: string }) =>
      quotationAction(Number(id), 'close', { status: Number(statut) as 2 | 3, note: notePrivate }),
    onSuccess: (_data, { id }) => invalidateDetail(queryClient, id),
  })
}

export function useCloneQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, socid }: { id: string; socid: number | null }) => {
      const result = await quotationAction(Number(id), 'clone', socid ? { socid } : {})
      return String(result.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations', 'list'] }),
  })
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => quotationAction(Number(id), 'delete'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations', 'list'] }),
  })
}

export function useGenerateQuotationDoc(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { model: string; langId: string }) =>
      quotationAction(Number(id), 'build_doc', { model: input.model, lang_id: input.langId }),
    onSuccess: () => invalidateDetail(queryClient, id),
  })
}

export function useQuotationContacts(id: string | undefined) {
  return useQuery({
    queryKey: ['quotations', 'detail', id, 'contacts'],
    queryFn: () => fetchQuotationContacts(Number(id)),
    enabled: !!id,
  })
}

export function useAddQuotationContact(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { source: 'internal' | 'external'; userid?: string; type?: string; contactid?: string; typecontact?: string }) => {
      if (input.source === 'internal') {
        if (!input.userid || !input.type) throw new Error('Select a user and contact type.')
        await changeQuotationContact(Number(id), { action: 'add', source: 'internal', userid: Number(input.userid), type: Number(input.type) })
      } else {
        if (!input.contactid || !input.typecontact) throw new Error('Select a contact and contact type.')
        await changeQuotationContact(Number(id), { action: 'add', source: 'external', contactid: Number(input.contactid), type: Number(input.typecontact) })
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id, 'contacts'] }),
  })
}

export function useQuotationNotes(id: string | undefined) {
  return useQuery({
    queryKey: ['quotations', 'detail', id, 'notes'],
    queryFn: () => fetchQuotationNotes(Number(id)),
    enabled: !!id,
  })
}

export function useSetQuotationNote(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { field: 'note_public' | 'note_private'; value: string }) =>
      saveQuotationNotes(Number(id), { [input.field]: input.value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id, 'notes'] }),
  })
}

export function useQuotationDocuments(id: string | undefined) {
  return useQuery({
    queryKey: ['quotations', 'detail', id, 'documents'],
    queryFn: () => fetchQuotationDocuments(Number(id)),
    enabled: !!id,
  })
}

export function useUploadQuotationDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadQuotationDocument(Number(id), file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id, 'documents'] }),
  })
}

export function useLinkQuotationDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { link: string; label: string }) => linkQuotationDocument(Number(id), input.link, input.label),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id, 'documents'] }),
  })
}

export function useQuotationConsumptionHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['quotations', 'detail', id, 'consumptionHistory'],
    queryFn: () => fetchQuotationConsumptionHistory(Number(id)),
    enabled: !!id,
  })
}

export function useDeclareConsumption(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      productId: string
      warehouseId: string
      qty: number
      label: string
      lotSerial: string
      eatBy?: string
      sellBy?: string
    }) => declareQuotationConsumption({
      id: Number(id),
      product: Number(input.productId),
      id_entrepot: Number(input.warehouseId),
      nbpiece: input.qty,
      label: input.label,
      batch_number: input.lotSerial,
      eatby: input.eatBy,
      sellby: input.sellBy,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id, 'consumptionHistory'] })
      invalidateDetail(queryClient, id)
    },
  })
}

export function useQuotationAgenda(id: string | undefined) {
  return useQuery({
    queryKey: ['quotations', 'detail', id, 'agenda'],
    queryFn: () => fetchQuotationAgenda(Number(id)),
    enabled: !!id,
  })
}
