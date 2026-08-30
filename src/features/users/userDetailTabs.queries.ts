import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSocieteFormContext } from '../customers/thirdPartyOptions.queries'

// Every hook in this file is real, confirmed by reading userprofile/api/
// {bank,notes,documents,agenda,notify}.php directly — a complete, working
// "User Profile SPA" backend (its own file headers literally say "Phase
// 4/6/7/8/9") that was sitting there fully built and simply never wired
// into this app's React pages. Session-cookie authenticated, same
// session-wide Dolibarr CSRF token as userprofile/api/users.php's own
// create action (fetchSocieteFormContext() — confirmed this checks the
// identical currentToken()/newToken() pair).

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data = (await res.json()) as T & { ok?: boolean; error?: string }
  if (data.ok === false) throw new Error(data.error ?? 'Legacy backend rejected the request.')
  return data
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const { token } = await fetchSocieteFormContext()
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...body }),
  })
  const data = (await res.json()) as T & { ok?: boolean; error?: string }
  if (data.ok === false) throw new Error(data.error ?? 'Legacy backend rejected the request.')
  return data
}

// ── HR / Bank ──────────────────────────────────────────────────────────
export interface UserBankAccount {
  id: number
  label: string
  bank: string
  number: string
  iban: string
  bic: string
}
export interface UserBankProfile {
  canEdit: boolean
  personalEmail: string
  personalMobile: string
  accounts: UserBankAccount[]
  leaveTypes: Array<{ id: number; name: string; daysEntitled: string }>
  assignedLeaves: number[]
}
interface RawBankResponse {
  ok: boolean
  can_edit: boolean
  personal_email: string | null
  personal_mobile: string | null
  accounts: Array<{ id: number; label: string; bank: string; number: string; iban: string; bic: string }>
  payroll: { leave_types: Array<{ id: number; name: string; days_entitled: string }>; assigned_leaves: number[] }
}
export function useUserBankProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'bank'],
    queryFn: async (): Promise<UserBankProfile> => {
      const data = await getJson<RawBankResponse>(`/userprofile/api/bank.php?id=${userId}`)
      return {
        canEdit: data.can_edit,
        personalEmail: data.personal_email ?? '',
        personalMobile: data.personal_mobile ?? '',
        accounts: data.accounts.map((a) => ({ id: a.id, label: a.label, bank: a.bank, number: a.number, iban: a.iban, bic: a.bic })),
        leaveTypes: data.payroll.leave_types.map((t) => ({ id: t.id, name: t.name, daysEntitled: t.days_entitled })),
        assignedLeaves: data.payroll.assigned_leaves,
      }
    },
    enabled: !!userId,
  })
}
export function useSaveUserPersonalContact(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: { personal_email: string; personal_mobile: string }) => postJson(`/userprofile/api/bank.php?id=${userId}&action=set_personal`, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'bank'] }),
  })
}
export function useAddUserBankAccount(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: { label: string; bank: string; number: string; iban: string; bic: string }) =>
      postJson(`/userprofile/api/bank.php?id=${userId}&action=add_account`, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'bank'] }),
  })
}

// ── Enable / Disable (real userprofile/api/user.php?action=enable|disable,
// confirmed by reading the same file's GET handler — its own `actions.
// can_disable`/`can_enable` flags already gate the buttons this hook wires) ──
export function useToggleUserStatus(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: 'enable' | 'disable') => postJson<{ ok: boolean; statut: number }>(`/userprofile/api/user.php?id=${userId}&action=${action}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'profile', Number(userId)] })
      queryClient.invalidateQueries({ queryKey: ['users', 'summary'] })
    },
  })
}

// ── Notes ───────────────────────────────────────────────────────────────
export function useUserNotes(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'notes'],
    queryFn: () => getJson<{ ok: boolean; can_edit: boolean; note: string }>(`/userprofile/api/notes.php?id=${userId}`),
    enabled: !!userId,
  })
}
export function useSaveUserNotes(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note: string) => postJson(`/userprofile/api/notes.php?id=${userId}`, { note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'notes'] }),
  })
}

// ── Documents ───────────────────────────────────────────────────────────
export interface UserDocumentRow {
  name: string
  size: string
  date: string
  downloadUrl: string
}
export function useUserDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'documents'],
    queryFn: async () => {
      const data = await getJson<{ ok: boolean; can_edit: boolean; documents: Array<{ name: string; size: string; date: string; download_url: string }> }>(
        `/userprofile/api/documents.php?id=${userId}`,
      )
      return { canEdit: data.can_edit, documents: data.documents.map((d) => ({ name: d.name, size: d.size, date: d.date, downloadUrl: d.download_url })) }
    },
    enabled: !!userId,
  })
}
export function useUploadUserDocument(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.set('file', file)
      const res = await fetch(`/userprofile/api/documents.php?id=${userId}`, { method: 'POST', credentials: 'same-origin', body: form })
      const data: { ok: boolean; error?: string } = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Upload failed')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'documents'] }),
  })
}
export function useDeleteUserDocument(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => postJson(`/userprofile/api/documents.php?id=${userId}&action=delete`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'documents'] }),
  })
}

// ── Agenda / Activities (same real actioncomm rows back both tabs) ──────
export interface UserAgendaEvent {
  id: number
  label: string
  note: string
  date: string
  dateRaw: string
  dateEnd: string
  percent: number
}
export function useUserAgenda(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'agenda'],
    queryFn: async () => {
      const data = await getJson<{ ok: boolean; events: Array<{ id: number; label: string; note: string; date: string; date_raw: string; date_end: string; percent: number }> }>(
        `/userprofile/api/agenda.php?id=${userId}`,
      )
      return data.events.map((e) => ({ id: e.id, label: e.label, note: e.note, date: e.date, dateRaw: e.date_raw, dateEnd: e.date_end, percent: e.percent }))
    },
    enabled: !!userId,
  })
}
export function useCreateUserAgendaEvent(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: { label: string; date: string; date_end?: string; note?: string }) => postJson(`/userprofile/api/agenda.php?id=${userId}`, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'agenda'] }),
  })
}

// ── Notifications ────────────────────────────────────────────────────────
export interface NotifyOption {
  id: number
  code: string
  label: string
}
export interface AssignedNotify {
  id: number
  actionId: number
  code: string
  label: string
}
export function useUserNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'notifications'],
    queryFn: async () => {
      const data = await getJson<{
        ok: boolean
        can_edit: boolean
        assigned: Array<{ id: number; action_id: number; code: string; label: string }>
        available: Array<{ id: number; code: string; label: string }>
      }>(`/userprofile/api/notify.php?id=${userId}`)
      return {
        canEdit: data.can_edit,
        assigned: data.assigned.map((a) => ({ id: a.id, actionId: a.action_id, code: a.code, label: a.label })),
        available: data.available.map((a) => ({ id: a.id, code: a.code, label: a.label })),
      }
    },
    enabled: !!userId,
  })
}
export function useAddUserNotification(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (actionId: number) => postJson(`/userprofile/api/notify.php?id=${userId}`, { action: 'add', action_id: actionId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'notifications'] }),
  })
}
export function useDeleteUserNotification(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => postJson(`/userprofile/api/notify.php?id=${userId}`, { action: 'delete', id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'notifications'] }),
  })
}
