import { fapiGet } from '../../api/fapiEnvelope'
import type { LegacyFormData, LegacyFormField } from './legacyForm'
import type { SalesTaxCreateForm } from './salesTaxCreate.queries'

// The dropdown lists of the new social charge, salary, loan and miscellaneous payment forms, and of the VAT payment form, from the meta.php next
// to each package (compta/sociales, salaries, loan, compta/bank/various_payment, compta/tva). The answers were captured from newecuenta on
// 23 Oct 2026 (tests/fixtures/accountancy-meta-*.json). The forms post under their old field names (specialPaymentsSave.ts renames them), so
// the fields here keep those names.

interface Mode { id: number; code: string; label: string }
interface Bank { id: number; ref: string; label: string; account_number?: string }
interface Project { id: number; ref?: string; title?: string; label?: string }
interface AccountingAccount { account_number: string; label: string; display: string }

export interface FapiSocialMeta { charge_types: Array<{ id: number; code: string; label: string }>; payment_modes: Mode[]; bank_accounts: Bank[]; projects: Project[] }
export interface FapiSalaryMeta { employees: Array<{ id: number; login: string; name: string }>; payment_modes: Mode[]; bank_accounts: Bank[]; projects: Project[] }
export interface FapiLoanMeta { bank_accounts: Bank[]; payment_modes: Mode[]; accounting_accounts: AccountingAccount[]; default_accounts?: { capital?: string; insurance?: string; interest?: string } }
export interface FapiVariousMeta { bank_accounts: Bank[]; payment_modes: Mode[]; accounting_accounts: AccountingAccount[]; subledger_accounts: Array<{ code: string; label: string }>; sens_options: Array<{ value: number; label: string }> }
export interface FapiVatMeta { payment_modes: Mode[]; bank_accounts: Bank[] }

type Option = { value: string; label: string }
const blank: Option = { value: '', label: '' }

const select = (name: string, options: Option[], value = ''): LegacyFormField => ({ tag: 'select', type: 'select', name, value, options })
const text = (name: string, value = ''): LegacyFormField => ({ tag: 'input', type: 'text', name, value, options: [] })
const area = (name: string): LegacyFormField => ({ tag: 'textarea', type: 'textarea', name, value: '', options: [] })
const radio = (name: string, options: Option[], value: string): LegacyFormField => ({ tag: 'input', type: 'radio', name, value, options })

const usToday = () => {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
}

const banks = (b: Bank[]): Option[] => [blank, ...b.map((x) => ({ value: String(x.id), label: [x.ref, x.label].filter(Boolean).join(' - ') }))]
const modes = (m: Mode[]): Option[] => [blank, ...m.map((x) => ({ value: String(x.id), label: x.label }))]
const projects = (p: Project[]): Option[] => [blank, ...p.map((x) => ({ value: String(x.id), label: [x.ref, x.title ?? x.label].filter(Boolean).join(' - ') }))]
const accounts = (a: AccountingAccount[]): Option[] => [blank, ...a.map((x) => ({ value: x.account_number, label: x.display }))]

// The form's own arrangement: the labels are the ones the old pages print; fields that are not in the layout are not shown.
function build(fields: LegacyFormField[], labels: Record<string, string>, required: string[], submitLabel: string): LegacyFormData {
  return {
    hidden: {},
    fields: Object.fromEntries(fields.map((f) => [f.name, f])),
    layout: fields.filter((f) => labels[f.name]).map((f) => ({ kind: 'field' as const, name: f.name, label: labels[f.name], required: required.includes(f.name) })),
    intro: '',
    submitLabel,
  }
}

export const mapSocialChargeForm = (m: FapiSocialMeta): LegacyFormData =>
  build(
    [
      text('label'),
      select('actioncode', [blank, ...m.charge_types.map((t) => ({ value: String(t.id), label: t.label }))]),
      text('ech', usToday()),
      text('period', usToday()),
      text('amount'),
      select('fk_project', projects(m.projects)),
      select('mode_reglement_id', modes(m.payment_modes)),
      select('fk_account', banks(m.bank_accounts)),
    ],
    { label: 'Label', actioncode: 'Type', ech: 'Due date', period: 'End date for period', amount: 'Amount', fk_project: 'Project', mode_reglement_id: 'Payment type', fk_account: 'Bank account' },
    ['label', 'actioncode', 'ech', 'period', 'amount'],
    'Add',
  )

export const mapSalaryForm = (m: FapiSalaryMeta): LegacyFormData =>
  build(
    [
      select('fk_user', [blank, ...m.employees.map((e) => ({ value: String(e.id), label: e.name || e.login }))]),
      text('label'),
      text('datep', usToday()),
      text('datev', usToday()),
      text('datesp', usToday()),
      text('dateep', usToday()),
      text('amount'),
      select('accountid', banks(m.bank_accounts)),
      // salaries/fapi takes a payment type id or code; the id is sent
      select('paymenttype', modes(m.payment_modes)),
      text('num_payment'),
      select('fk_project', projects(m.projects)),
    ],
    {
      fk_user: 'Employee', label: 'Label', datep: 'Date of payment', datev: 'Value date', datesp: 'Start date of period', dateep: 'End date of period',
      amount: 'Amount', accountid: 'Bank account', paymenttype: 'Payment type', num_payment: 'Number', fk_project: 'Project',
    },
    ['fk_user', 'label', 'datep', 'datesp', 'dateep', 'amount', 'accountid', 'paymenttype'],
    'Save',
  )

export const mapLoanForm = (m: FapiLoanMeta): LegacyFormData => {
  const acc = accounts(m.accounting_accounts)
  const d = m.default_accounts ?? {}
  return build(
    [
      text('label'),
      select('accountid', banks(m.bank_accounts)),
      text('capital'),
      text('nbterm'),
      text('start', usToday()),
      text('end'),
      radio('ratetype', [{ value: 'percentage', label: 'Percentage' }, { value: 'total', label: 'Total sum' }], 'percentage'),
      text('rate'),
      text('slot'),
      text('receipt'),
      text('insurance_amount'),
      select('accountancy_account_capital', acc, d.capital ?? ''),
      select('accountancy_account_insurance', acc, d.insurance ?? ''),
      select('accountancy_account_interest', acc, d.interest ?? ''),
      area('note_private'),
      area('note_public'),
    ],
    {
      label: 'Label', accountid: 'Bank account', capital: 'Principal amount', nbterm: 'Number of terms', start: 'Start date', end: 'Validation date', ratetype: 'Interest type',
      rate: 'Percentage / total sum', slot: 'Slot', receipt: 'Receipt', insurance_amount: 'Insurance / additional charges', accountancy_account_capital: 'Accounting account capital',
      accountancy_account_insurance: 'Accounting account insurance', accountancy_account_interest: 'Accounting account interest', note_private: 'Note (private)', note_public: 'Note (public)',
    },
    ['label', 'accountid', 'capital', 'nbterm', 'start'],
    'Save',
  )
}

export const mapVariousPaymentForm = (m: FapiVariousMeta): LegacyFormData =>
  build(
    [
      text('datep', usToday()),
      text('datev', usToday()),
      text('label'),
      text('amount'),
      select('accountid', banks(m.bank_accounts)),
      select('paymenttype', modes(m.payment_modes)),
      text('num_payment'),
      select('accountancy_code', accounts(m.accounting_accounts)),
      select('subledger_account', [blank, ...m.subledger_accounts.map((s) => ({ value: s.code, label: `${s.code} - ${s.label}` }))]),
      select('sens', m.sens_options.map((o) => ({ value: String(o.value), label: o.label })), String(m.sens_options[0]?.value ?? 0)),
    ],
    {
      datep: 'Date of payment', datev: 'Value date', label: 'Label', amount: 'Amount', accountid: 'Bank account', paymenttype: 'Payment type', num_payment: 'Number',
      accountancy_code: 'Account', subledger_account: 'Subledger account', sens: 'Direction',
    },
    ['datep', 'label', 'amount', 'accountid', 'paymenttype', 'sens'],
    'Save',
  )

export const loadSocialChargeForm = async () => mapSocialChargeForm(await fapiGet<FapiSocialMeta>('/compta/sociales/fapi/meta.php'))
export const loadSalaryForm = async () => mapSalaryForm(await fapiGet<FapiSalaryMeta>('/salaries/fapi/meta.php'))
export const loadLoanForm = async () => mapLoanForm(await fapiGet<FapiLoanMeta>('/loan/fapi/meta.php'))
export const loadVariousPaymentForm = async () => mapVariousPaymentForm(await fapiGet<FapiVariousMeta>('/compta/bank/various_payment/fapi/meta.php'))

// The VAT payment form (compta/tva/fapi/meta.php): the bank accounts and payment types, and today's date in the form's own MM/dd/yyyy.
export function mapVatPaymentForm(m: FapiVatMeta): SalesTaxCreateForm {
  return {
    token: '',
    bankAccounts: banks(m.bank_accounts),
    paymentTypes: modes(m.payment_modes),
    defaultLabels: { payment: 'Sales tax payment', refund: 'Sales tax refund' },
    defaultDate: usToday(),
  }
}

export const loadVatPaymentForm = async () => mapVatPaymentForm(await fapiGet<FapiVatMeta>('/compta/tva/fapi/meta.php'))
