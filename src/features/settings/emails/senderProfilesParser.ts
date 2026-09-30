// Parses admin/mails_senderprofile_list.php (Emails setup > Emails sender profiles), a standard
// Dolibarr object list. From the page's own PHP (the dev backends have no profiles to copy):
//   - each profile is `<tr class="oddeven">` with tds label, email, position, status, actions;
//     the actions hold `…?id=N&action=edit&rowid=N` and `…?id=N&action=delete&token=…` links;
//   - `?action=create` / `?action=edit&id=N` print the form: `label`, `email`, `signature`,
//     `private` (a user select, -1 = none), `position`, `active` (0 Disabled / 1 Enabled), posted
//     with hidden `action=add` / `action=update` and `id`. Other forms in the page layout reuse
//     the names `label` and `position`, so the form's controls are read from that form only.

export interface SenderProfileRow {
  id: string
  label: string
  email: string
  position: string
  active: boolean
}

export interface SenderProfileFormOption {
  value: string
  label: string
}

export interface SenderProfileForm {
  token: string
  label: string
  email: string
  signature: string
  user: string
  position: string
  active: string
  userOptions: SenderProfileFormOption[]
  activeOptions: SenderProfileFormOption[]
}

const clean = (value: string | null | undefined) => (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

export function parseSenderProfilesPage(doc: Document): { token: string; rows: SenderProfileRow[] } {
  const token = doc.querySelector<HTMLInputElement>('form#searchFormList input[name="token"]')?.getAttribute('value') ?? ''
  if (!doc.querySelector('input[name="search_label"]') || !token) throw new Error('The sender profiles on this backend page were not recognised.')

  const rows: SenderProfileRow[] = []
  doc.querySelectorAll('tr.oddeven').forEach((tr) => {
    const edit = tr.querySelector('a[href*="action=edit"]')?.getAttribute('href') ?? ''
    const id = edit.match(/[?&]id=(\d+)/)?.[1]
    if (!id) return
    const cells = Array.from(tr.querySelectorAll(':scope > td'))
    const status = clean(cells[3]?.textContent)
    rows.push({ id, label: clean(cells[0]?.textContent), email: clean(cells[1]?.textContent), position: clean(cells[2]?.textContent), active: /enabled/i.test(status) && !/disabled/i.test(status) })
  })
  return { token, rows }
}

function selectOf(scope: ParentNode, name: string) {
  const select = scope.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  const options = Array.from(select?.options ?? []).map((o) => ({ value: (o.getAttribute('value') ?? '').trim(), label: clean(o.textContent) }))
  const selected = select?.querySelector('option[selected]')?.getAttribute('value')?.trim()
  return { options, value: selected ?? options[0]?.value ?? '' }
}

function textOf(scope: ParentNode, name: string): string {
  const el = scope.querySelector(`[name="${name}"]`)
  if (!el) return ''
  return el instanceof HTMLTextAreaElement ? (el.textContent ?? '') : (el.getAttribute('value') ?? '')
}

// The create / edit form (both print the same controls).
export function parseSenderProfileForm(doc: Document): SenderProfileForm {
  const action = doc.querySelector('input[name="action"][value="add"], input[name="action"][value="update"]')
  const form = action?.closest('form')
  const token = form?.querySelector<HTMLInputElement>('input[name="token"]')?.getAttribute('value') ?? ''
  if (!form || !token || !form.querySelector('[name="signature"]')) throw new Error('The sender profile form on this backend page was not recognised.')
  const user = selectOf(form, 'private')
  const active = selectOf(form, 'active')
  return {
    token,
    label: textOf(form, 'label'),
    email: textOf(form, 'email'),
    signature: textOf(form, 'signature'),
    user: user.value,
    position: textOf(form, 'position'),
    active: active.value,
    userOptions: user.options,
    activeOptions: active.options,
  }
}
