import type { FormOption } from './expensePagesParser'

// What the expense card page shows (expense/card.php): the report's lines, what can be done with it, its activity, and a sidebar of who and when.

export interface ExpenseCardLine {
  id: string
  // Company name when the report is linked to a customer/vendor, otherwise the expense type.
  label: string
  // "09/22/2026 • VAT 16.000% • Bank Charges"
  subtitle: string
  product: string
  project: string
  description: string
  unit: string
  qty: string
  total: string
  // The attached receipt, if any (a file download on the backend).
  receipt: { name: string; previewUrl: string; downloadUrl: string } | null
}

// What the button bar offers for this report in its current state.
export type ExpenseCardAction = 'sendEmail' | 'print' | 'modify' | 'validate' | 'setDraft' | 'approve' | 'deny' | 'cancel' | 'recordPayment' | 'markPaid' | 'clone' | 'delete'

export interface ExpenseCardPerson {
  name: string
  // "ID #1", "vox_admin" or the approval date — whatever the card prints under the name.
  sub: string
  photo: string
}

export interface ExpenseCardLinked {
  label: string
  name: string
  photo: string
  // Town, e-mail, phone… as printed.
  details: string[]
}

export interface ExpenseCardPage {
  ref: string
  status: string
  author: string
  period: string
  // "Wilfred" with what it is: customer, vendor or employee.
  linked: { kind: 'customer' | 'vendor' | 'employee'; name: string }[]
  totals: { ht: string; vat: string; ttc: string }
  lines: ExpenseCardLine[]
  subtotal: string
  tax: string
  total: string
  actions: ExpenseCardAction[]
  timeline: { label: string; date: string; user: string; color: string }[]
  createdBy: ExpenseCardPerson | null
  linkedTo: ExpenseCardLinked[]
  dates: { label: string; value: string }[]
  validator: ExpenseCardPerson | null
  approvedBy: ExpenseCardPerson | null
  payment: { status: string; paid: string; ht: string; vat: string; ttc: string }
  notes: { label: string; value: string }[]
  // The payment dialog's own numbers: what is still to pay after advances and earlier payments.
  netPayable: string
  cloneUsers: FormOption[]
}
