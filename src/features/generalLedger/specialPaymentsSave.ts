import { fapiPost } from '../../api/fapiEnvelope'

// The "new …" forms of the special payments, saved through their JSON endpoints. The forms still load their dropdowns from the legacy pages,
// so the values arrive under the legacy field names; each body below renames them to the endpoint's own. Bodies and answers follow the
// document (compta/sociales|bank/various_payment/fapi, salaries/fapi, loan/fapi); the miscellaneous-payment create and delete were tried live on newecuenta (26 Oct 2026, the test row removed again); the other
// writes could not be, because those instances hold no rows, so they are "representative" in the document and unverified live.

const str = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null)
const num = (v: string | undefined) => (v && v.trim() !== '' && !Number.isNaN(Number(v.replace(/,/g, ''))) ? Number(v.replace(/,/g, '')) : null)
const id = (v: string | undefined) => {
  const n = num(v)
  return n && n > 0 ? n : null
}

export const socialChargeBody = (v: Record<string, string>) => ({
  label: str(v.label), type_id: id(v.actioncode), date_ech: str(v.ech), period: str(v.period), amount: num(v.amount),
  mode_reglement_id: id(v.mode_reglement_id), fk_account: id(v.fk_account), fk_project: id(v.fk_project),
})

export const variousPaymentBody = (v: Record<string, string>) => ({
  label: str(v.label), amount: num(v.amount), sens: num(v.sens), paymenttype: id(v.paymenttype), datep: str(v.datep), datev: str(v.datev),
  accountid: id(v.accountid), accountancy_code: str(v.accountancy_code), subledger_account: str(v.subledger_account), fk_project: id(v.fk_project),
  num_payment: str(v.num_payment),
})

export const salaryPaymentBody = (v: Record<string, string>) => ({
  fk_user: id(v.fk_user), label: str(v.label), datep: str(v.datep), datev: str(v.datev), datesp: str(v.datesp), dateep: str(v.dateep), amount: num(v.amount),
  accountid: id(v.accountid), paymenttype: id(v.paymenttype) ?? str(v.paymenttype), num_payment: str(v.num_payment), fk_project: id(v.fk_project),
})

export const loanBody = (v: Record<string, string>) => ({
  label: str(v.label), accountid: id(v.accountid), capital: num(v.capital), nbterm: num(v.nbterm), datestart: str(v.start), dateend: str(v.end),
  rate: num(v.rate), interesttype: v.ratetype === 'total' ? 'total' : 'percentage', insurance_amount: num(v.insurance_amount),
  account_capital: str(v.accountancy_account_capital), account_insurance: str(v.accountancy_account_insurance), account_interest: str(v.accountancy_account_interest),
  slot: str(v.slot), receipt: str(v.receipt), fk_project: id(v.projectid), note_private: str(v.note_private), note_public: str(v.note_public),
})

const make = (path: string, body: (v: Record<string, string>) => object, done: string) => async (v: Record<string, string>): Promise<string> => {
  await fapiPost(path, body(v))
  return done
}

export const saveSocialCharge = make('/compta/sociales/fapi/charge.php?action=create', socialChargeBody, 'Social/fiscal tax created.')
export const saveVariousPayment = make('/compta/bank/various_payment/fapi/payment.php?action=create', variousPaymentBody, 'Miscellaneous payment created.')
export const saveSalaryPayment = make('/salaries/fapi/payment.php?action=create', salaryPaymentBody, 'Salary payment created.')
export const saveLoan = make('/loan/fapi/loan.php?action=create', loanBody, 'Loan created.')
