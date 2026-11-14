// takepos/admin/terminal.php?terminal=<n> has no JSON API of its own (a
// plain classic Dolibarr form-POST+redirect page), so its current values
// are scraped from the rendered page, same pattern as this app's other
// no-REST-API legacy sources (Hotel Suite's create_room.php scrape, General
// Ledger). Every field/id below was read from the real page's own markup,
// not guessed. Payment-mode account fields share the same real <select>
// content (all Dolibarr open bank accounts) but each is its own named
// constant, keyed by terminal number as a "<NAME><n>" suffix (CASHDESK_
// FORCE_DECREASE_STOCK is the one exception with no numeric suffix).

export interface TerminalSetupOption {
  id: string
  label: string
}

export interface TerminalSetup {
  socid: string
  socidLabel: string
  bankAccounts: {
    cash: string
    cheque: string
    cb: string
    bankCheque041: string
    bankTransfer051: string
    debitCard061: string
    mobileMoney071: string
    other081: string
  }
  warehouseId: string
  forceDecreaseStock: '0' | '1'
  noDecreaseStock: '0' | '1'
  keycodeForEnter: string
  enablePasscode: '0' | '1'
  // Quirk: the passcode <input> is write-only — value=""
  // placeholder="Saved - enter new passcode to change", so a saved passcode
  // is never echoed back. Leaving this blank on save means "keep the
  // existing one", matching the classic form's own behavior.
  connectorUrl: string
  scaleComPort: string
  scaleBaudRate: string
  // Two separate fields (distinct <select> ids/names, search_user vs
  // admin_user) — "Assign User Login" and "Admin/supervisor User Login" are
  // not the same setting.
  assignUserId: string
  adminUserId: string
  header: string
  footer: string
  warehouseOptions: TerminalSetupOption[]
  adminUserOptions: TerminalSetupOption[]
  token: string
}

function selectValue(doc: Document, name: string): string {
  const el = doc.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  return el?.value ?? ''
}
function inputValue(doc: Document, name: string): string {
  const el = doc.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  return el?.value ?? ''
}
function textareaValue(doc: Document, name: string): string {
  const el = doc.querySelector<HTMLTextAreaElement>(`textarea[name="${name}"]`)
  return el?.value ?? ''
}
function selectOptions(doc: Document, name: string): TerminalSetupOption[] {
  const select = doc.querySelector(`select[name="${name}"]`)
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ id: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
    .filter((o) => o.id && o.id !== '-1')
}

export function parseTerminalSetup(doc: Document, terminal: number): TerminalSetup {
  const n = String(terminal)
  const socidOpt = doc.querySelector('#socid option[selected]')
  const tokenInput = doc.querySelector<HTMLInputElement>('input[name="token"]')
  return {
    socid: socidOpt?.getAttribute('value') ?? '',
    // The real select's own data-html carries the rich "name<br>ref | ..."
    // markup used for the combo's own rendering — textContent is empty on
    // this option (rendered client-side by select2 from data-html instead),
    // so the label comes from the customer/third-party dropdown data this
    // page loads separately (see useTerminalSetup's own comment).
    socidLabel: '',
    bankAccounts: {
      cash: selectValue(doc, `CASHDESK_ID_BANKACCOUNT_CASH${n}`),
      cheque: selectValue(doc, `CASHDESK_ID_BANKACCOUNT_CHEQUE${n}`),
      cb: selectValue(doc, `CASHDESK_ID_BANKACCOUNT_CB${n}`),
      bankCheque041: selectValue(doc, 'CASHDESK_ID_BANKACCOUNT_041'),
      bankTransfer051: selectValue(doc, 'CASHDESK_ID_BANKACCOUNT_051'),
      debitCard061: selectValue(doc, 'CASHDESK_ID_BANKACCOUNT_061'),
      mobileMoney071: selectValue(doc, 'CASHDESK_ID_BANKACCOUNT_071'),
      other081: selectValue(doc, 'CASHDESK_ID_BANKACCOUNT_081'),
    },
    warehouseId: selectValue(doc, `CASHDESK_ID_WAREHOUSE${n}`),
    forceDecreaseStock: (selectValue(doc, 'CASHDESK_FORCE_DECREASE_STOCK') || '0') as '0' | '1',
    noDecreaseStock: (selectValue(doc, `CASHDESK_NO_DECREASE_STOCK${n}`) || '0') as '0' | '1',
    keycodeForEnter: inputValue(doc, `CASHDESK_READER_KEYCODE_FOR_ENTER${n}`),
    enablePasscode: (selectValue(doc, `TAKEPOS_ENABLE_PASSCODE${n}`) || '0') as '0' | '1',
    connectorUrl: inputValue(doc, `CASHDESK_ID_CONNECTOR_URL${n}`),
    scaleComPort: selectValue(doc, `TAKEPOS_WEIGHING_SCALE_COM_PORT${n}`),
    scaleBaudRate: selectValue(doc, `TAKEPOS_WEIGHING_SCALE_BAUD_RATE${n}`),
    assignUserId: selectValue(doc, 'search_user'),
    adminUserId: selectValue(doc, 'admin_user'),
    header: textareaValue(doc, `TAKEPOS_HEADER${n}`),
    footer: textareaValue(doc, `TAKEPOS_FOOTER${n}`),
    warehouseOptions: selectOptions(doc, `CASHDESK_ID_WAREHOUSE${n}`),
    adminUserOptions: selectOptions(doc, 'admin_user'),
    token: tokenInput?.value ?? '',
  }
}

const EMPTY_TERMINAL: TerminalSetup = {
  socid: '',
  socidLabel: '',
  bankAccounts: { cash: '', cheque: '', cb: '', bankCheque041: '', bankTransfer051: '', debitCard061: '', mobileMoney071: '', other081: '' },
  warehouseId: '',
  forceDecreaseStock: '0',
  noDecreaseStock: '0',
  keycodeForEnter: '',
  enablePasscode: '0',
  connectorUrl: '',
  scaleComPort: '',
  scaleBaudRate: '',
  assignUserId: '',
  adminUserId: '',
  header: '',
  footer: '',
  warehouseOptions: [],
  adminUserOptions: [],
  token: '',
}

// One terminal's values from takepos/fapi/settings.php (key-authenticated JSON, 5 Nov 2026), over what the classic page gave (null
// without a legacy session). Checked live on newecuenta against terminal.php?terminal=1: third party, the eight bank accounts,
// warehouse, keycode, passcode flag, baud rate, header and footer are identical; a constant that was never set (connector URL, COM
// port, force-decrease-stock) is read as the page's default (empty / 0). The assigned and admin user are not in the endpoint under a
// documented name, so they stay from the classic page. A warehouse the page's list does not offer falls back to the page's own value.
export function terminalSetupFromConsts(consts: Record<string, string | null> | null, doc: Document | null, terminal: number): TerminalSetup {
  const base = doc ? parseTerminalSetup(doc, terminal) : EMPTY_TERMINAL
  if (!consts) return base
  const n = String(terminal)
  const v = (name: string, fallback: string) => consts[name] ?? fallback
  const warehouse = consts[`CASHDESK_ID_WAREHOUSE${n}`]
  const warehouseListed = warehouse != null && (!doc || base.warehouseOptions.some((o) => o.id === warehouse))
  return {
    ...base,
    socid: v(`CASHDESK_ID_THIRDPARTY${n}`, base.socid),
    bankAccounts: {
      cash: v(`CASHDESK_ID_BANKACCOUNT_CASH${n}`, base.bankAccounts.cash),
      cheque: v(`CASHDESK_ID_BANKACCOUNT_CHEQUE${n}`, base.bankAccounts.cheque),
      cb: v(`CASHDESK_ID_BANKACCOUNT_CB${n}`, base.bankAccounts.cb),
      bankCheque041: v('CASHDESK_ID_BANKACCOUNT_041', base.bankAccounts.bankCheque041),
      bankTransfer051: v('CASHDESK_ID_BANKACCOUNT_051', base.bankAccounts.bankTransfer051),
      debitCard061: v('CASHDESK_ID_BANKACCOUNT_061', base.bankAccounts.debitCard061),
      mobileMoney071: v('CASHDESK_ID_BANKACCOUNT_071', base.bankAccounts.mobileMoney071),
      other081: v('CASHDESK_ID_BANKACCOUNT_081', base.bankAccounts.other081),
    },
    warehouseId: warehouseListed ? (warehouse as string) : base.warehouseId,
    forceDecreaseStock: v('CASHDESK_FORCE_DECREASE_STOCK', '0') as '0' | '1',
    noDecreaseStock: v(`CASHDESK_NO_DECREASE_STOCK${n}`, '0') as '0' | '1',
    keycodeForEnter: v(`CASHDESK_READER_KEYCODE_FOR_ENTER${n}`, ''),
    enablePasscode: v(`TAKEPOS_ENABLE_PASSCODE${n}`, '0') as '0' | '1',
    connectorUrl: v(`CASHDESK_ID_CONNECTOR_URL${n}`, ''),
    scaleComPort: v(`TAKEPOS_WEIGHING_SCALE_COM_PORT${n}`, ''),
    scaleBaudRate: v(`TAKEPOS_WEIGHING_SCALE_BAUD_RATE${n}`, ''),
    header: v(`TAKEPOS_HEADER${n}`, ''),
    footer: v(`TAKEPOS_FOOTER${n}`, ''),
  }
}
