// Parses the edit form of admin/mails.php (Outgoing emails) and admin/mails_ticket.php
// (Outgoing emails for the Ticket module): `?action=edit` renders one <form> whose controls
// are all named MAIN_*, next to hidden `token` and `action=update` fields. The read view
// only prints a Parameter/Value table, so the edit form is the source of the current values.
// Verified against the dev backend; the SMTP password comes back in the field's own value.

export interface MailFormOption {
  value: string
  label: string
}

export interface MailFormField {
  name: string
  kind: 'input' | 'password' | 'select' | 'textarea'
  value: string
  options: MailFormOption[]
}

export interface MailSettingsForm {
  token: string
  fields: Record<string, MailFormField>
}

const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()

export function parseMailSettingsForm(doc: Document): MailSettingsForm {
  const update = doc.querySelector('input[name="action"][value="update"]')
  const token = update?.closest('form')?.querySelector<HTMLInputElement>('input[name="token"]')?.getAttribute('value') ?? ''
  if (!update || !token) throw new Error('The email settings on this backend page were not recognised.')

  const fields: Record<string, MailFormField> = {}
  doc.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name^="MAIN_"]').forEach((el) => {
    const name = el.getAttribute('name') ?? ''
    // `<name>_sav` hidden helpers only feed the page's own script.
    if (!name || name.endsWith('_sav')) return
    if (el instanceof HTMLSelectElement) {
      const options = Array.from(el.options).map((o) => ({ value: o.getAttribute('value') ?? '', label: clean(o.textContent) }))
      const selected = el.querySelector('option[selected]')?.getAttribute('value') ?? options[0]?.value ?? ''
      fields[name] = { name, kind: 'select', value: selected, options }
    } else if (el instanceof HTMLTextAreaElement) {
      fields[name] = { name, kind: 'textarea', value: el.textContent ?? '', options: [] }
    } else {
      fields[name] = { name, kind: el.getAttribute('type') === 'password' ? 'password' : 'input', value: el.getAttribute('value') ?? '', options: [] }
    }
  })
  if (Object.keys(fields).length === 0) throw new Error('The email settings on this backend page were not recognised.')
  return { token, fields }
}
