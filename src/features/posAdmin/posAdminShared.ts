// Shared scrape helpers for every takepos/admin/*.php tab (setup.php,
// appearance.php, receipt.php, bar.php) — see terminalSetupParser.ts for
// the pattern this follows and why (no JSON API on any of these pages).

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
