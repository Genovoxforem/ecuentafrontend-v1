// Shared helpers for every takepos/admin/*.php tab (setup, appearance, receipt, bar, other, terminal): the current values come from
// takepos/fapi/settings.php; the classic page is read (scraped, see terminalSetupParser.ts) for the option lists and the save token.

import { fapiGet } from '../../api/fapiEnvelope'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// takepos/fapi/settings.php (key-authenticated JSON, 5 Nov 2026): every TAKEPOS_* / CASHDESK_* constant of the entity (a constant
// that was never set is absent or null; ?terminal=N is only about which terminal's keys the "terminal" group lists, the full map
// is always returned). Each tab's current values come from it: compared field by field with the classic tab pages on newecuenta
// (54 fields, legacy session), 50 are identical and the other 4 are an unset constant against the page's default.
// The classic page is still read for what the endpoint does not give - the dropdown option lists and the CSRF token of the
// classic form that saves (the endpoint is read-only) - and is optional: without a legacy session the tab shows the values and
// refuses to save.
export type PosConsts = Record<string, string | null>

export async function loadPosConsts(): Promise<PosConsts | null> {
  try {
    return (await fapiGet<{ settings: PosConsts }>('/takepos/fapi/settings.php')).settings
  } catch {
    return null
  }
}

// The classic tab page, or null when there is no legacy session (the login page comes back instead).
export async function loadPosPage(path: string, params?: URLSearchParams): Promise<Document | null> {
  try {
    const doc = await fetchLegacyDocument(path, params)
    return looksLikeLegacyLoginPageText(doc.documentElement.outerHTML) ? null : doc
  } catch {
    return null
  }
}

// Neither source answered: the error the tabs always showed.
export function requirePosSource(consts: PosConsts | null, doc: Document | null): void {
  if (!consts && !doc) throw new Error(NOT_SIGNED_IN_MESSAGE)
}

export const POS_SAVE_NEEDS_SESSION = 'Saving POS settings posts to the classic setup page, which needs its session: sign out and sign in again, then save.'
export function requirePosToken(token: string): void {
  if (!token) throw new Error(POS_SAVE_NEEDS_SESSION)
}

// A toggle: the constant is on when it holds anything but '' or '0' (what the classic switch shows).
export function constOn(consts: PosConsts | null, doc: Document | null, name: string): boolean {
  if (consts) return consts[name] != null && consts[name] !== '' && consts[name] !== '0'
  return doc ? toggleChecked(doc, name) : false
}
// A text field: the constant, '' when it was never set.
export function constText(consts: PosConsts | null, doc: Document | null, name: string, read: (doc: Document, name: string) => string): string {
  if (consts) return consts[name] ?? ''
  return doc ? read(doc, name) : ''
}
// A select: the constant when the classic list offers it (or when there is no classic page to compare with); otherwise what the
// classic select itself shows for it - e.g. TAKEPOS_MODIFIER_CATEGORY holds 0 while the page shows "Select a Category" (-1), and the
// email template's "None" option has no value attribute, so the page posts the text "None".
export function constSelect(consts: PosConsts | null, doc: Document | null, name: string, fallback: string): string {
  const api = consts?.[name]
  if (!doc) return api ?? fallback
  const own = selectValue(doc, name)
  if (api == null || api === '') return own || fallback
  const listed = Array.from(doc.querySelectorAll<HTMLOptionElement>(`select[name="${name}"] option`)).some((o) => o.value === api)
  return listed ? api : own || fallback
}

// Without the classic page there is no option list (it has the labels): the current value alone, so the select still shows it.
export function currentOnly(value: string): Array<{ id: string; label: string }> {
  return value && value !== '-1' ? [{ id: value, label: value }] : []
}

export interface OptionRow {
  id: string
  label: string
}

export function selectValue(doc: Document, name: string): string {
  const el = doc.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  return el?.value ?? ''
}
export function inputValue(doc: Document, name: string): string {
  const el = doc.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  return el?.value ?? ''
}
export function textareaValue(doc: Document, name: string): string {
  const el = doc.querySelector<HTMLTextAreaElement>(`textarea[name="${name}"]`)
  return el?.value ?? ''
}
export function selectOptions(doc: Document, name: string): OptionRow[] {
  const select = doc.querySelector(`select[name="${name}"]`)
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ id: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
    .filter((o) => o.id && o.id !== '-1')
}
// Real toggles' own live-rendered checkbox (id="toggle_<CONST>") — its
// `checked` attribute reflects the constant's genuine current value, so
// this gives RealToggle a real `initial` instead of a locally-assumed one.
export function toggleChecked(doc: Document, constName: string): boolean {
  return !!doc.querySelector<HTMLInputElement>(`#toggle_${constName}`)?.checked
}
export function csrfToken(doc: Document): string {
  return doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''
}
