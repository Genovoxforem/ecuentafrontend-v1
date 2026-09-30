// Parses accountancy/admin/defaultaccounts.php (General Ledger > Setup > Default accounts).
// Verified against the dev backend and the page's own PHP:
//   - one <form> with hidden `token` and `action=update`, holding a table of section rows
//     (`ThirdParties | Users`, `Product`, `Service`, `Others`, `Loan Management`: two cells, no
//     select) and field rows (label cell + a select named after the accounting constant);
//   - the first three fields' label cell has class `fieldrequired`;
//   - every select lists the whole chart of accounts (value = account number, text
//     "1087 - Accounts receivable") and has the stored account selected;
//   - which fields exist depends on the enabled modules, so the list comes from the page;
//   - saving sets EVERY listed constant from the POST, blank when missing, so a save must post
//     all fields with their current values.

export interface DefaultAccountOption {
  value: string
  label: string
}

export interface DefaultAccountField {
  name: string
  label: string
  required: boolean
  value: string
  // Only set when this field's list differs from the shared one.
  options?: DefaultAccountOption[]
}

export interface DefaultAccountSection {
  title: string
  fields: DefaultAccountField[]
}

export interface DefaultAccountsPage {
  token: string
  intro: string
  sections: DefaultAccountSection[]
  options: DefaultAccountOption[]
}

const clean = (value: string | null | undefined) => (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

function optionsOf(select: HTMLSelectElement): DefaultAccountOption[] {
  return Array.from(select.options)
    .map((o) => ({ value: (o.getAttribute('value') ?? '').trim(), label: clean(o.textContent) }))
    .filter((o) => o.value !== '')
}

const signature = (options: DefaultAccountOption[]) => options.map((o) => o.value).join('|')

export function parseDefaultAccountsPage(doc: Document): DefaultAccountsPage {
  const form = doc.querySelector('input[name="action"][value="update"]')?.closest('form')
  const token = form?.querySelector<HTMLInputElement>('input[name="token"]')?.getAttribute('value') ?? ''
  if (!form || !token) throw new Error('The default accounts on this backend page were not recognised.')

  const sections: DefaultAccountSection[] = []
  let shared: DefaultAccountOption[] | null = null
  form.querySelectorAll('tr').forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll(':scope > td'))
    const select = tr.querySelector('select')
    if (!select) {
      // A section row: a title and an empty second cell.
      const title = clean(cells[0]?.textContent)
      if (cells.length === 2 && title && !clean(cells[1].textContent)) sections.push({ title, fields: [] })
      return
    }
    const name = select.getAttribute('name') ?? ''
    if (!name || !cells[0]) return
    if (sections.length === 0) sections.push({ title: '', fields: [] })
    const options = optionsOf(select)
    if (!shared) shared = options
    sections[sections.length - 1].fields.push({
      name,
      label: clean(cells[0].textContent),
      required: cells[0].classList.contains('fieldrequired'),
      value: (select.selectedOptions[0]?.getAttribute('value') ?? '').trim(),
      ...(signature(options) === signature(shared) ? {} : { options }),
    })
  })
  if (!shared || sections.every((s) => s.fields.length === 0)) throw new Error('The default accounts on this backend page were not recognised.')

  return {
    token,
    intro: clean(doc.querySelector('.alert.alert-info')?.textContent),
    sections: sections.filter((s) => s.fields.length > 0),
    options: shared,
  }
}
