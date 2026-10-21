import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { classicFormRefusals } from '../invoices/invoiceCreate.queries'

// ticket/card.php?action=create — the classic New Ticket form. Its next ref,
// CSRF token and every dictionary (request type, ticket group, severity, the
// contact role, users, projects, contracts, third parties) exist only as that
// page's own inputs, so they are read off it; the ticket is then created the
// way the form does it: POST card.php with action=add.
const CARD = '/ticket/card.php'

export interface TicketOption {
  value: string
  label: string
}

export interface TicketCreateContext {
  token: string
  ref: string
  fkUserCreate: string
  typeCodes: TicketOption[]
  categories: TicketOption[]
  categoryDefault: string
  severities: TicketOption[]
  severityDefault: string
  thirdParties: TicketOption[]
  contactRoles: TicketOption[]
  users: TicketOption[]
  userDefault: string
  projects: TicketOption[]
  contracts: TicketOption[]
}

function selectOf(doc: Document, name: string) {
  return doc.querySelector<HTMLSelectElement>(`#form_create_ticket select[name="${name}"]`) ?? doc.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
}

// Real options only: the blank / "-1" / "0" placeholders are left out.
function optionsOf(doc: Document, name: string): TicketOption[] {
  const select = selectOf(doc, name)
  return Array.from(select?.options ?? [])
    .map((o) => ({ value: o.value.trim(), label: (o.textContent ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((o) => o.value && o.value !== '-1' && o.value !== '0' && o.label)
}

// A <select> with no `selected` option submits its first one.
const selectedOf = (doc: Document, name: string) => selectOf(doc, name)?.selectedOptions[0]?.value.trim() ?? ''

export function parseTicketCreateForm(doc: Document): TicketCreateContext {
  const input = (name: string) => doc.querySelector<HTMLInputElement>(`#form_create_ticket input[name="${name}"]`)?.value ?? doc.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value ?? ''
  return {
    token: input('token'),
    ref: input('ref'),
    fkUserCreate: input('fk_user_create'),
    typeCodes: optionsOf(doc, 'type_code'),
    categories: optionsOf(doc, 'category_code'),
    categoryDefault: selectedOf(doc, 'category_code'),
    severities: optionsOf(doc, 'severity_code'),
    severityDefault: selectedOf(doc, 'severity_code'),
    thirdParties: optionsOf(doc, 'socid'),
    contactRoles: optionsOf(doc, 'type'),
    users: optionsOf(doc, 'fk_user_assign'),
    userDefault: selectedOf(doc, 'fk_user_assign'),
    projects: optionsOf(doc, 'projectid'),
    contracts: optionsOf(doc, 'contractid'),
  }
}

export async function fetchTicketCreateContext(): Promise<TicketCreateContext> {
  const doc = await fetchLegacyDocument(CARD, new URLSearchParams({ action: 'create' }))
  const context = parseTicketCreateForm(doc)
  if (!context.token) throw new Error('The New Ticket form did not load (no form token).')
  return context
}

export function useTicketCreateContext() {
  return useQuery({ queryKey: ['tickets', 'create-context'], queryFn: fetchTicketCreateContext, staleTime: 0, gcTime: 0 })
}

export interface NewTicketInput {
  ref: string
  typeCode: string
  categoryCode: string
  severityCode: string
  subject: string
  message: string
  socid: string
  contactId: string
  contactRole: string
  notify: boolean
  assignedTo: string
  projectId: string
  contractId: string
}

// The form's fields, named as card.php reads them.
export function buildTicketBody(input: NewTicketInput, context: Pick<TicketCreateContext, 'token' | 'fkUserCreate'>): FormData {
  const body = new FormData()
  const fields: Record<string, string> = {
    token: context.token,
    action: 'add',
    trackid: '',
    origin: '',
    originid: '',
    fk_user_create: context.fkUserCreate,
    ref: input.ref,
    type_code: input.typeCode,
    category_code: input.categoryCode,
    severity_code: input.severityCode,
    subject: input.subject,
    message: input.message,
    socid: input.socid || '-1',
    contactid: input.contactId || '-1',
    type: input.contactRole,
    fk_user_assign: input.assignedTo || '-1',
    projectid: input.projectId || '0',
    contractid: input.contractId || '0',
    save: 'Create ticket',
  }
  for (const [k, v] of Object.entries(fields)) body.append(k, v)
  if (input.notify) body.append('notify_tiers_at_create', '1')
  return body
}

// Success redirects to card.php?track_id=…; the React ticket page is keyed by
// the row id, which the ticket list carries next to the track id.
async function ticketIdForTrackId(trackId: string): Promise<number | null> {
  const res = await fetch('/ticket/ticket_list_ajax.php', {
    method: 'POST',
    credentials: 'same-origin',
    body: new URLSearchParams({ draw: '1', start: '0', length: '-1', search_fk_status: '-1' }),
  })
  if (!res.ok) return null
  const data = (await res.json().catch(() => null)) as { aaData?: Array<{ rowid: number; track_id: string }> } | null
  return data?.aaData?.find((r) => r.track_id === trackId)?.rowid ?? null
}

export async function createTicket(input: NewTicketInput): Promise<{ id: number | null; trackId: string }> {
  // A fresh read: the token must be current when the form is sent.
  const context = await fetchTicketCreateContext()
  const res = await fetch(CARD, { method: 'POST', credentials: 'same-origin', body: buildTicketBody(input, context) })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const trackId = new URL(res.url, window.location.origin).searchParams.get('track_id')
  if (!trackId) {
    const refusals = classicFormRefusals(html)
    throw new Error(refusals[0] ?? 'The ticket was not created — the backend sent the form back without a message.')
  }
  return { id: await ticketIdForTrackId(trackId), trackId }
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })
}
