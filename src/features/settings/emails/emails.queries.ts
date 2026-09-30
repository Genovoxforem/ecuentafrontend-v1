import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../../shared/legacyHtmlFetch'
import { legacyAdminSend } from '../legacyAdminRequest'
import { parseMailSettingsForm, type MailSettingsForm } from './mailSettingsParser'
import { parseEmailTemplateEdit, parseEmailTemplatesPage, type EmailTemplateEdit, type EmailTemplatesPage } from './emailTemplatesParser'
import { parseSenderProfileForm, parseSenderProfilesPage, type SenderProfileForm, type SenderProfileRow } from './senderProfilesParser'

// Setup > Emails — four backend pages: admin/mails.php (outgoing emails), mails_ticket.php
// (outgoing emails for Ticket), mails_templates.php and mails_senderprofile_list.php. Reading
// is the page itself; every write is the request the page's own form or link sends, and is
// confirmed by reading the page again (the backend answers each with the whole page).

const KEY = ['settings', 'emails'] as const

// ---------------------------------------------------------------- Outgoing emails

export const MAIL_PAGES = {
  outgoing: { path: '/admin/mails.php', verify: ['MAIN_MAIL_EMAIL_FROM', 'MAIN_MAIL_SENDMODE'] },
  ticket: { path: '/admin/mails_ticket.php', verify: ['MAIN_MAIL_SENDMODE_TICKET'] },
} as const
export type MailPageKey = keyof typeof MAIL_PAGES

const fetchMailForm = async (page: MailPageKey): Promise<MailSettingsForm> => parseMailSettingsForm(await fetchLegacyDocument(`${MAIL_PAGES[page].path}?action=edit`))

export function useMailSettings(page: MailPageKey) {
  return useQuery({ queryKey: [...KEY, 'mail', page], queryFn: () => fetchMailForm(page), staleTime: 1000 * 30 })
}

// "Save" of the edit form: the form's own `action=update` POST with the fields to send.
export function useSaveMailSettings(page: MailPageKey) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const before = await fetchMailForm(page)
      const body = new URLSearchParams({ token: before.token, action: 'update', ...values, save: 'Save' })
      await legacyAdminSend(MAIL_PAGES[page].path, { method: 'POST', body })
      const after = await fetchMailForm(page)
      const mismatch = MAIL_PAGES[page].verify.find((name) => name in values && after.fields[name]?.value !== values[name])
      if (mismatch) throw new Error('The backend did not save these settings.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...KEY, 'mail', page] }),
  })
}

// "Test server connectivity": the page's `?action=testconnect` link, which only opens a
// connection to the configured SMTP host and port and reports whether it answered.
export function useTestMailConnection() {
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const html = await legacyAdminSend(MAIL_PAGES.outgoing.path, { method: 'GET' }, '?action=testconnect')
      const ok = new DOMParser().parseFromString(html, 'text/html').querySelector('div.ok')?.textContent?.replace(/\s+/g, ' ').trim()
      if (!ok) throw new Error('The backend did not report a result for the connectivity test.')
      return ok
    },
  })
}

// ---------------------------------------------------------------- Email templates

const TEMPLATES = '/admin/mails_templates.php'
const TEMPLATES_ID = '25' // the backend's table id for the email templates dictionary

const fetchTemplates = async (): Promise<EmailTemplatesPage> => parseEmailTemplatesPage(await fetchLegacyDocument(TEMPLATES))

export function useEmailTemplates() {
  return useQuery({ queryKey: [...KEY, 'templates'], queryFn: fetchTemplates, staleTime: 1000 * 30 })
}

// The full row (with its content, which the list does not carry) for the pencil.
export function useEmailTemplateForEdit(rowId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'templates', 'edit', rowId],
    queryFn: async (): Promise<EmailTemplateEdit> =>
      parseEmailTemplateEdit(await fetchLegacyDocument(`${TEMPLATES}?action=edit&rowid=${encodeURIComponent(rowId ?? '')}&id=${TEMPLATES_ID}`), rowId ?? ''),
    enabled: rowId !== null,
    staleTime: 0,
    gcTime: 0,
  })
}

export interface EmailTemplateInput {
  label: string
  language: string
  type: string
  owner: string
  isPrivate: string
  position: string
  subject: string
  attachFiles: string
  content: string
}

export function useAddEmailTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: EmailTemplateInput) => {
      const before = await fetchTemplates()
      const body = new URLSearchParams({
        token: before.token,
        id: TEMPLATES_ID,
        actionadd: 'Add',
        label: input.label,
        langcode: input.language,
        type_template: input.type,
        fk_user: input.owner,
        private: input.isPrivate,
        position: input.position,
        topic: input.subject,
        joinfiles: input.attachFiles,
        content: input.content,
      })
      await legacyAdminSend(TEMPLATES, { method: 'POST', body })
      const known = new Set(before.rows.map((r) => r.rowId))
      if (!(await fetchTemplates()).rows.some((r) => !known.has(r.rowId) && r.label === input.label.trim())) throw new Error('The backend did not add this template.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...KEY, 'templates'] }),
  })
}

// The pencil's "Modify": the edit row posts its fields, with the topic, attach flag and
// content suffixed by the row id.
export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rowId, ...input }: EmailTemplateInput & { rowId: string }) => {
      const before = await fetchTemplates()
      const body = new URLSearchParams({
        token: before.token,
        id: TEMPLATES_ID,
        rowid: rowId,
        actionmodify: 'Modify',
        label: input.label,
        langcode: input.language,
        type_template: input.type,
        fk_user: input.owner,
        private: input.isPrivate,
        position: input.position,
        [`topic-${rowId}`]: input.subject,
        [`joinfiles-${rowId}`]: input.attachFiles,
        [`content-${rowId}`]: input.content,
      })
      await legacyAdminSend(TEMPLATES, { method: 'POST', body })
      const saved = (await fetchTemplates()).rows.find((r) => r.rowId === rowId)
      if (!saved || saved.label !== input.label.trim() || saved.subject !== input.subject.trim()) throw new Error('The backend did not save this template.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...KEY, 'templates'] }),
  })
}

// The status icon: `action=activate` / `action=disable` on the row.
export function useToggleEmailTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rowId, enable }: { rowId: string; enable: boolean }) => {
      const before = await fetchTemplates()
      await legacyAdminSend(TEMPLATES, { method: 'GET' }, `?rowid=${encodeURIComponent(rowId)}&id=${TEMPLATES_ID}&action=${enable ? 'activate' : 'disable'}&token=${encodeURIComponent(before.token)}`)
      if ((await fetchTemplates()).rows.find((r) => r.rowId === rowId)?.active !== enable) throw new Error('The backend did not change this template.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...KEY, 'templates'] }),
  })
}

// The trashcan: the page's delete confirmation ends in this GET.
export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rowId: string) => {
      const before = await fetchTemplates()
      await legacyAdminSend(TEMPLATES, { method: 'GET' }, `?action=confirm_delete&confirm=yes&rowid=${encodeURIComponent(rowId)}&id=${TEMPLATES_ID}&token=${encodeURIComponent(before.token)}`)
      if ((await fetchTemplates()).rows.some((r) => r.rowId === rowId)) throw new Error('The backend did not delete this template.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...KEY, 'templates'] }),
  })
}

// ---------------------------------------------------------------- Sender profiles

const PROFILES = '/admin/mails_senderprofile_list.php'

const fetchProfiles = async (): Promise<{ token: string; rows: SenderProfileRow[] }> => parseSenderProfilesPage(await fetchLegacyDocument(PROFILES))

export function useSenderProfiles() {
  return useQuery({ queryKey: [...KEY, 'profiles'], queryFn: fetchProfiles, staleTime: 1000 * 30 })
}

// `null` = closed, `'new'` = the create form, otherwise the id of the profile to edit.
export function useSenderProfileForm(target: string | null) {
  return useQuery({
    queryKey: [...KEY, 'profiles', 'form', target],
    queryFn: async (): Promise<SenderProfileForm> =>
      parseSenderProfileForm(await fetchLegacyDocument(target === 'new' ? `${PROFILES}?action=create` : `${PROFILES}?action=edit&id=${encodeURIComponent(target ?? '')}&rowid=${encodeURIComponent(target ?? '')}`)),
    enabled: target !== null,
    staleTime: 0,
    gcTime: 0,
  })
}

export interface SenderProfileInput {
  label: string
  email: string
  signature: string
  user: string
  position: string
  active: string
}

export function useSaveSenderProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: SenderProfileInput & { id: string | null }) => {
      const form = await parseSenderProfileForm(await fetchLegacyDocument(id ? `${PROFILES}?action=edit&id=${encodeURIComponent(id)}&rowid=${encodeURIComponent(id)}` : `${PROFILES}?action=create`))
      const before = await fetchProfiles()
      const body = new URLSearchParams({
        token: form.token,
        action: id ? 'update' : 'add',
        id: id ?? '',
        label: input.label,
        email: input.email,
        signature: input.signature,
        private: input.user,
        position: input.position,
        active: input.active,
        save: 'Save',
      })
      await legacyAdminSend(PROFILES, { method: 'POST', body })
      const known = new Set(before.rows.map((r) => r.id))
      const after = (await fetchProfiles()).rows
      const saved = id ? after.find((r) => r.id === id && r.label === input.label.trim()) : after.find((r) => !known.has(r.id) && r.label === input.label.trim())
      if (!saved) throw new Error('The backend did not save this sender profile.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...KEY, 'profiles'] }),
  })
}

export function useDeleteSenderProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const before = await fetchProfiles()
      await legacyAdminSend(PROFILES, { method: 'GET' }, `?id=${encodeURIComponent(id)}&action=delete&token=${encodeURIComponent(before.token)}`)
      if ((await fetchProfiles()).rows.some((r) => r.id === id)) throw new Error('The backend did not delete this sender profile.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...KEY, 'profiles'] }),
  })
}
