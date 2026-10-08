// custom/payroll_v2/admin/setup.php has no JSON API of its own (and the
// payroll_v2/api/paye.php that would cover PAYE bands dies on a bad
// require_once on the dev backends), so the Setup screen reads the classic
// page's tabs and posts back to it, exactly as its own forms do.

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

// The rows of the tab's table, found by one of its column headers (the app
// shell around the page has `table.table-bordered`s of its own), with the
// header and "No … configured" rows left out.
function dataRows(doc: Document, header: string): HTMLTableCellElement[][] {
  const table = Array.from(doc.querySelectorAll('table')).find((t) => Array.from(t.querySelectorAll('th'), (th) => text(th)).includes(header))
  if (!table) return []
  return Array.from(table.querySelectorAll('tr'))
    .filter((tr) => !tr.classList.contains('liste_titre') && tr.querySelectorAll('td').length > 1)
    .map((tr) => Array.from(tr.querySelectorAll('td')))
}

// ---- General / Statutory / Payslip sharing: one control per constant,
// named after the constant in lower case (see $constants in setup.php).

export type SetupFieldType = 'text' | 'password' | 'checkbox' | 'select'

export interface SetupField {
  key: string
  label: string
  type: SetupFieldType
  value: string
  options: Array<{ value: string; label: string }>
}

export function parseSetupFields(doc: Document, labels: Array<{ key: string; label: string }>): SetupField[] {
  return labels.map(({ key, label }) => {
    const el = doc.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${key.toLowerCase()}"]`)
    if (el instanceof HTMLSelectElement) {
      const options = Array.from(el.options, (o) => ({ value: o.value, label: text(o) }))
      return { key, label, type: 'select', value: el.selectedOptions[0]?.value ?? el.options[0]?.value ?? '', options }
    }
    if (el?.type === 'checkbox') return { key, label, type: 'checkbox', value: el.hasAttribute('checked') ? '1' : '0', options: [] }
    return { key, label, type: el?.type === 'password' ? 'password' : 'text', value: el?.getAttribute('value') ?? '', options: [] }
  })
}

// ---- Leave types (c_holiday_types, every row — active or not)

export interface SetupLeaveType {
  id: string
  code: string
  label: string
  affect: string
  delay: string
  newByMonth: string
  country: string
  active: boolean
}

export function parseLeaveTypes(doc: Document): SetupLeaveType[] {
  return dataRows(doc, 'Affected By')
    .filter((cells) => cells.length >= 8)
    .map((c) => ({
      id: text(c[0]),
      code: text(c[1]),
      label: text(c[2]),
      affect: text(c[3]),
      delay: text(c[4]),
      newByMonth: text(c[5]),
      country: text(c[6]),
      active: text(c[7]).toLowerCase() === 'yes',
    }))
}

export function parseCountries(doc: Document): Array<{ id: string; label: string }> {
  return Array.from(doc.querySelectorAll<HTMLOptionElement>('select[name="country_id"] option'))
    .map((o) => ({ id: o.value.trim(), label: text(o) }))
    .filter((o) => o.id)
}

// ---- PAYE tax bands of one tax year

export interface SetupTaxBand {
  id: string
  taxYear: string
  from: string
  to: string
  rate: string
  active: boolean
}

export function parseTaxBands(doc: Document): SetupTaxBand[] {
  return dataRows(doc, 'Tax Year')
    .filter((cells) => cells.length >= 6)
    .map((c) => ({
      id: text(c[0]),
      taxYear: text(c[1]),
      from: text(c[2]),
      to: text(c[3]),
      rate: text(c[4]).replace(/%$/, ''),
      active: text(c[5]).toLowerCase() === 'active',
    }))
}

export function parseTaxYears(doc: Document): string[] {
  return Array.from(doc.querySelectorAll<HTMLOptionElement>('select[name="filter_year"] option'), (o) => o.value.trim()).filter(Boolean)
}

// ---- Attendance devices (ZKTeco)

export interface SetupDevice {
  id: string
  serial: string
  ip: string
  port: string
  connection: string
  brand: string
  entity: string
  liveStatus: string
  lastSeen: string
}

export function parseDevices(doc: Document): SetupDevice[] {
  return dataRows(doc, 'Device Serial No')
    .filter((cells) => cells.length >= 9)
    .map((c) => ({
      id: text(c[0]),
      serial: text(c[1]),
      ip: text(c[2]),
      port: text(c[3]),
      connection: text(c[4]),
      brand: text(c[5]),
      entity: text(c[6]),
      // "⛔ Never" / "🔴 Offline" / "🟢 Online" — the word without its emoji.
      liveStatus: text(c[7]).replace(/^[^A-Za-z]+/, ''),
      lastSeen: Array.from(c[8].childNodes, (n) => (n.textContent ?? '').trim())
        .filter(Boolean)
        .join(' · '),
    }))
}
