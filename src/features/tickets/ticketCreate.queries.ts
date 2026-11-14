import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fapiPost } from '../../api/fapiEnvelope'
import { useTicketFormOptions, type TicketFormOptions } from './tickets.queries'

// New Ticket on ticket/fapi (API #394 form_options.php for the dictionaries, #397 create.php for the ticket), replacing the scrape of
// ticket/card.php?action=create. create.php takes {subject, message, type_code [, severity_code, category_code, fk_soc, fk_user_assign]}, builds the
// ref itself (getDefaultRef, so there is no Ref field) and answers 201 {id, ref, track_id, status {id, label}}; a missing subject, message or type
// answers 422, an unknown type_code 422. Not accepted by it, and therefore not on this form: the contact and its role, the notification email, the
// project, the contract and attachments (the classic form has them; master report AN-197).

export interface TicketOption {
  value: string
  label: string
}

export interface TicketCreateContext {
  typeCodes: TicketOption[]
  categories: TicketOption[]
  severities: TicketOption[]
  users: TicketOption[]
}

export function ticketCreateContext(o: TicketFormOptions): TicketCreateContext {
  return {
    typeCodes: o.types.map((t) => ({ value: t.code, label: t.label })),
    categories: o.categories.map((c) => ({ value: c.code, label: c.label })),
    severities: o.severities.map((s) => ({ value: s.code, label: s.label })),
    users: o.assignable_users.map((u) => ({ value: String(u.id), label: u.name || u.login })),
  }
}

export function useTicketCreateContext() {
  const q = useTicketFormOptions()
  return { ...q, data: q.data ? ticketCreateContext(q.data) : undefined }
}

export interface NewTicketInput {
  typeCode: string
  categoryCode: string
  severityCode: string
  subject: string
  message: string
  socid: string
  assignedTo: string
}

// The body create.php reads: the three required fields, and an optional one only when it was chosen.
export function buildTicketPayload(input: NewTicketInput): Record<string, string | number> {
  const body: Record<string, string | number> = { subject: input.subject, message: input.message, type_code: input.typeCode }
  if (input.severityCode) body.severity_code = input.severityCode
  if (input.categoryCode) body.category_code = input.categoryCode
  if (input.socid) body.fk_soc = Number(input.socid)
  if (input.assignedTo) body.fk_user_assign = Number(input.assignedTo)
  return body
}

export interface CreatedTicket {
  id: number
  ref: string
  track_id: string
  status: { id: number; label: string }
}

export function createTicket(input: NewTicketInput): Promise<CreatedTicket> {
  return fapiPost<CreatedTicket>('/ticket/fapi/create.php', buildTicketPayload(input))
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })
}
