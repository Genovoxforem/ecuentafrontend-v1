import { useMutation, useQueryClient } from '@tanstack/react-query'

// Every write action below was read directly from the real PHP source
// (D:\latest htdocs\htdocs\ticket\{card,contact,document,followup,chat}.php)
// and, where the field contract was ambiguous, live-verified against the
// dev backend (create → verify → revert) before being wired here — see the
// session notes for the exact round-trips. None of these scrape a page's
// rendered HTML for data; the one HTML read (scrapeTicketToken) only pulls
// the hidden CSRF `token` field, the same technique already established
// elsewhere in this app (customerDetailTabs.queries.ts's scrapeSocieteToken).
//
// Three of card.php's 6 action buttons have NO real, confirmed backend
// action behind their visible label and are therefore not implemented as
// mutations here at all — see TicketDetail.tsx for how each is shown as
// honestly disabled:
//  - "Send Email" (presend_addmessage + send_email=1) triggers Dolibarr's
//    full mail-compose flow (core/actions_sendmails.inc.php) — a much
//    bigger, higher-risk form (to/cc/subject/attachments) not investigated
//    to the same depth as everything else here.
//  - "Create Job Card" is a plain link to fichinter/create.php — this app
//    has no Job Card / Intervention feature built at all (confirmed
//    earlier: only an inert list placeholder exists), so linking there
//    would violate the standing "never route to a raw PHP page" rule.
//  - "Modify" in the reference opens inline editors for Type/Ticket
//    Group/Severity via change_property — those 3 dictionaries have no
//    JSON API (same gap as TicketCreateForm.tsx), so only Subject
//    (setsubject, wired below) is genuinely editable.

async function scrapeTicketToken(id: string): Promise<string> {
  const res = await fetch(`/ticket/card.php?id=${id}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  const match = html.match(/name="token"\s+value="([^"]+)"/)
  if (!match) throw new Error('Could not find a CSRF token on the ticket page.')
  return match[1]
}

async function classicPost(url: string, params: Record<string, string>) {
  const token = await scrapeTicketToken(params.id)
  const res = await fetch(url, { method: 'POST', credentials: 'same-origin', body: new URLSearchParams({ ...params, token }) })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
}

function invalidateTicket(queryClient: ReturnType<typeof useQueryClient>, id: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ['tickets', 'detail', id] })
  queryClient.invalidateQueries({ queryKey: ['tickets', 'list'] })
  queryClient.invalidateQueries({ queryKey: ['tickets', 'stats'] })
}

// ── Status / assignment / subject (ticket tab) ──────────────────────────

// Real, clean JSON (ticket-status-change-ajax.php) — confirmed live: powers
// the 4 status pills (Read=1, Assigned=2, In Progress=3, "Waiting for
// feedback"=5/NeedMoreInfo). Confirmed it CANNOT reopen a closed/cancelled
// ticket (returns success:false) — that needs useReopenTicket below.
export function useChangeTicketStatus(id: string | undefined, trackId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (newStatus: number) => {
      const token = await scrapeTicketToken(id!)
      const res = await fetch('/ticket/ticket-status-change-ajax.php', {
        method: 'POST',
        credentials: 'same-origin',
        body: new URLSearchParams({ token, track_id: trackId ?? '', new_status: String(newStatus) }),
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = (await res.json()) as { success: boolean; message?: string }
      if (!data.success) throw new Error(data.message ?? 'Could not change status.')
    },
    onSuccess: () => invalidateTicket(queryClient, id),
  })
}

// Classic card.php?action=confirm_reopen — live-verified (closed a test
// ticket, reopened it with this exact action, confirmed status returned to
// its real assigned/unread state depending on fk_user_assign).
export function useReopenTicket(id: string | undefined, trackId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => classicPost(`/ticket/card.php?id=${id}`, { id: id!, track_id: trackId ?? '', action: 'confirm_reopen' }),
    onSuccess: () => invalidateTicket(queryClient, id),
  })
}

// Classic card.php?action=confirm_close — confirm_close's own handler never
// reads a contactid (only close(), which doesn't require one either), so
// this is safe to submit without a notify-contact picker.
export function useCloseTicket(id: string | undefined, trackId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => classicPost(`/ticket/card.php?id=${id}`, { id: id!, track_id: trackId ?? '', action: 'confirm_close', confirm: 'yes' }),
    onSuccess: () => invalidateTicket(queryClient, id),
  })
}

export function useDeleteTicket(id: string | undefined, trackId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => classicPost(`/ticket/card.php?id=${id}`, { id: id!, track_id: trackId ?? '', action: 'confirm_delete_ticket', confirm: 'yes' }),
    onSuccess: () => invalidateTicket(queryClient, id),
  })
}

// Live-verified: assigning a user also flips status to Assigned server-side
// (matches the same real behavior seen on ticket creation); fk_user_assign=0
// unassigns.
export function useAssignTicketUser(id: string | undefined, trackId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      classicPost(`/ticket/card.php?id=${id}`, { id: id!, track_id: trackId ?? '', action: 'assign_user', btn_assign_user: '1', fk_user_assign: userId }),
    onSuccess: () => invalidateTicket(queryClient, id),
  })
}

// Live-verified round trip (set → confirm → revert).
export function useUpdateTicketSubject(id: string | undefined, trackId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (subject: string) => classicPost(`/ticket/card.php?id=${id}`, { id: id!, track_id: trackId ?? '', action: 'setsubject', subject }),
    onSuccess: () => invalidateTicket(queryClient, id),
  })
}

// ── Contacts/Addresses tab ───────────────────────────────────────────────
// contact.php has no read API at all — this app's own tab can only show
// what it adds in the current browser session, not the ticket's real full
// contact list (see TicketDetail.tsx's SessionOnlyBanner).
export function useAddTicketUserContact(id: string | undefined, trackId: string | undefined) {
  return useMutation({
    mutationFn: (userId: string) =>
      classicPost(`/ticket/contact.php?id=${id}`, { id: id!, track_id: trackId ?? '', action: 'addcontact', source: 'internal', userid: userId, typecontact: 'SUPPORTTEC' }),
  })
}

// ── Linked Files tab ─────────────────────────────────────────────────────
// Same generic core/actions_linkedfiles.inc.php include already wired for
// Sales Orders (orderDetail.queries.ts's useUploadOrderDocument/
// useLinkOrderDocument) — identical field contract, objecttype='ticket'.
// No read API either (document.php only ever server-renders its own
// table), so this tab is also session-only for what it lists back.
export function useUploadTicketDocument(id: string | undefined) {
  return useMutation({
    mutationFn: async (file: File) => {
      const token = await scrapeTicketToken(id!)
      const body = new FormData()
      body.set('token', token)
      body.set('section_dir', '')
      body.set('section_id', '0')
      body.set('userfile[]', file)
      body.set('sendit', 'Upload')
      const res = await fetch(`/ticket/document.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
  })
}
export function useLinkTicketDocument(id: string | undefined) {
  return useMutation({
    mutationFn: async (input: { link: string; label: string }) => {
      const token = await scrapeTicketToken(id!)
      const body = new URLSearchParams({ token, link: input.link, label: input.label, objecttype: 'ticket', objectid: id ?? '', linkit: 'Link' })
      const res = await fetch(`/ticket/document.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
  })
}

// ── Follow-up tab (bespoke llx_ticket_followup table) ───────────────────
// No read API — same session-only treatment. add_followup's response never
// reveals the new row's real id (a plain redirect), so update/delete on a
// just-created item aren't wired either — only the one-shot add.
export const WORK_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'working', label: 'Working' },
  { value: 'hold', label: 'On Hold' },
  { value: 'done', label: 'Done' },
] as const
export const PROCESSING_STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
] as const

export interface AddFollowupInput {
  taskTitle: string
  description: string
  assignedUserId: string
  taskDeadline: string
  ticketTag: string
  workStatus: string
  processingStatus: string
}
export function useAddTicketFollowup(id: string | undefined, trackId: string | undefined) {
  return useMutation({
    mutationFn: (input: AddFollowupInput) =>
      classicPost(`/ticket/followup.php?id=${id}`, {
        id: id!,
        track_id: trackId ?? '',
        action: 'add_followup',
        task_title: input.taskTitle,
        followup_description: input.description,
        fk_assigned_user: input.assignedUserId,
        task_deadline: input.taskDeadline,
        ticket_tag: input.ticketTag,
        work_status: input.workStatus,
        processing_status: input.processingStatus,
      }),
  })
}

// ── Chat tab ─────────────────────────────────────────────────────────────
// Also session-only for the same reason (no read API) — but note this
// shares the same underlying llx_actioncomm rows as card.php's "Send
// Email"/"Add A Private Message" buttons (both write TICKET_MSG* codes
// there), so this one form genuinely covers both of those, minus the
// actual email-sending side effect.
export function useAddChatMessage(id: string | undefined, trackId: string | undefined) {
  return useMutation({
    mutationFn: (input: { message: string; private: boolean }) =>
      classicPost(`/ticket/chat.php?id=${id}`, {
        id: id!,
        track_id: trackId ?? '',
        action: 'add_chat_message',
        chat_message: input.message,
        private_message: input.private ? '1' : '0',
      }),
  })
}
