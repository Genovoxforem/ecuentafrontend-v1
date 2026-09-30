import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from './bindLines.queries'
import { cellText } from './legacyTable'

// Generic reader/writer for the classic Dolibarr create/setup forms: one POST
// form with a CSRF token and a hidden `action` (add / update), text and select
// fields, and dates sent as a visible mm/dd/yyyy text plus three hidden
// `<name>day|month|year` parts. The form's own values and option lists are the
// source of everything shown; saving posts the same fields the original does.

export interface LegacyFormField {
  tag: 'input' | 'select' | 'textarea'
  type: string
  name: string
  value: string
  options: { value: string; label: string }[]
}

// The form's own arrangement: section separators and the fields in order, each with the label
// the page prints for it (a `label.form-label` inside the field's column).
export type LegacyFormLayoutItem = { kind: 'separator'; label: string } | { kind: 'field'; name: string; label: string; required: boolean }

export interface LegacyFormData {
  hidden: Record<string, string>
  fields: Record<string, LegacyFormField>
  layout: LegacyFormLayoutItem[]
  // The page's note above the form (`.alert-info`), and the name on its submit button.
  intro: string
  submitLabel: string
}

export function readLegacyForm(doc: Document, anchor: string): LegacyFormData {
  const anchorEl = doc.querySelector(`[name="${anchor}"]`)
  // Query from `doc` as a fallback: this backend's markup is not always
  // well-formed and the browser's parser can split a form apart.
  const root: ParentNode = anchorEl?.closest('form') ?? doc

  const hidden: Record<string, string> = {}
  for (const i of Array.from(root.querySelectorAll<HTMLInputElement>('input[type="hidden"][name]'))) {
    if (!(i.name in hidden)) hidden[i.name] = i.value
  }
  if (!hidden.token) hidden.token = doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''

  const fields: Record<string, LegacyFormField> = {}
  for (const el of Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input[name], select[name], textarea[name]'))) {
    if (el instanceof HTMLInputElement && (el.type === 'hidden' || el.type === 'submit' || el.type === 'button')) continue
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      const existing = fields[el.name]
      const option = { value: el.value, label: cellText(el.parentElement) || el.value }
      if (existing) existing.options.push(option)
      else fields[el.name] = { tag: 'input', type: 'radio', name: el.name, value: '', options: [option] }
      if (el.checked) fields[el.name].value = el.value
      continue
    }
    if (el.name in fields) continue
    if (el instanceof HTMLSelectElement) {
      fields[el.name] = {
        tag: 'select',
        type: 'select',
        name: el.name,
        value: el.value,
        options: Array.from(el.options).map((o) => ({ value: o.value, label: cellText(o) })),
      }
    } else {
      fields[el.name] = { tag: el instanceof HTMLTextAreaElement ? 'textarea' : 'input', type: el instanceof HTMLInputElement ? el.type : 'textarea', name: el.name, value: el.value, options: [] }
    }
  }

  const layout: LegacyFormLayoutItem[] = []
  const placed = new Set<string>()
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('.form-separator__label, input[name], select[name], textarea[name]'))) {
    if (el.matches('.form-separator__label')) {
      layout.push({ kind: 'separator', label: cellText(el) })
      continue
    }
    const control = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!(control.name in fields) || placed.has(control.name)) continue
    placed.add(control.name)
    const label = control.closest('[class*="col-"]')?.querySelector('label') ?? null
    layout.push({ kind: 'field', name: control.name, label: cellText(label).replace(/\*$/, '').trim() || control.name, required: !!label?.classList.contains('fieldrequired') })
  }

  return {
    hidden,
    fields,
    layout,
    intro: cellText(doc.querySelector('.alert.alert-info')),
    submitLabel: root.querySelector<HTMLInputElement>('input[type="submit"]')?.value ?? '',
  }
}

export function useLegacyForm(path: string, anchor: string, query?: Record<string, string>) {
  return useQuery({
    queryKey: ['generalLedger', 'legacyForm', path, query],
    queryFn: async () => readLegacyForm(await fetchLegacyDocument(path, query ? new URLSearchParams(query) : undefined), anchor),
    staleTime: 0,
    gcTime: 0, // the CSRF token must not outlive the page
  })
}

export interface LegacyFormResult {
  id: string | null // set when the backend redirected to a card page for a new record
  message: string
}

// mm/dd/yyyy -> the three hidden parts the backend actually reads.
export function dateParts(name: string, us: string): Record<string, string> {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return { [name]: us, [`${name}day`]: m?.[2] ?? '', [`${name}month`]: m?.[1] ?? '', [`${name}year`]: m?.[3] ?? '' }
}

export function useSubmitLegacyForm(path: string) {
  const queryClient = useQueryClient()
  return useMutation({
    // `expectRecord`: a create form that must redirect to card.php?id=N to count
    // as saved (anything else is the form re-rendered with an error).
    mutationFn: async ({ body, expectRecord }: { body: URLSearchParams; expectRecord: boolean }): Promise<LegacyFormResult> => {
      const res = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const id = new URL(res.url).searchParams.get('id')
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const messages = toastMessages(html)
      const err = messages.find((m) => m.type === 'error')
      if (err) throw new Error(err.message)
      if (expectRecord && !id) throw new Error(messages.map((m) => m.message).join('\n') || 'The backend did not accept this form.')
      return { id, message: messages.map((m) => m.message).join('\n') }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
