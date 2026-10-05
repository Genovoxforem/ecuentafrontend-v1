import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// The other 6 Payroll Setup tabs (EmpDesignation/Tax Deductions/Device
// Setting/About/Add Expenses & Allowances/Payee Tax Slab) — each its own
// real backend page under custom/payroll/admin/, confirmed by reading every
// one of them directly this session. About is pure static text (no data),
// so it has no query here — see AboutPayrollTab.tsx.

function textOf(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

async function legacyGet(path: string): Promise<string> {
  const res = await fetch(path, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  return text
}

// ── EmpDesignation (custom/payroll/admin/designation.php) — real, reads
// llx_payroll_designations. Save/Update go through save_ajax.php (real,
// plain-text "1"/"2"/"0" replies — same file Device Setting's own mutations
// below reuse), which this page's own inline JS already calls exactly this
// way (see savedesignation()/update() in that file). ─────────────────────

export interface DesignationRow {
  id: string
  name: string
}

export function useDesignations() {
  return useQuery({
    queryKey: ['payroll', 'designations'],
    queryFn: async (): Promise<DesignationRow[]> => {
      const doc = await fetchLegacyDocument('/custom/payroll/admin/designation.php')
      const table = doc.querySelector('#example1')
      if (!table) return []
      return Array.from(table.querySelectorAll('tbody tr')).map((tr) => {
        const cells = tr.querySelectorAll('td')
        const idInput = tr.querySelector<HTMLInputElement>('input[id^="idd"]')
        return { id: idInput?.value ?? '', name: textOf(cells[1]) }
      })
    },
    staleTime: 1000 * 30,
  })
}

export function useSaveDesignation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<void> => {
      const text = await legacyGet(`/custom/payroll/admin/save_ajax.php?savedesignation=${encodeURIComponent(name)}`)
      if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (text.trim() === '2') throw new Error('That designation already exists.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'designations'] }),
  })
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; name: string }): Promise<void> => {
      const text = await legacyGet(`/custom/payroll/admin/save_ajax.php?updatedesignation=${encodeURIComponent(input.name)}&id=${encodeURIComponent(input.id)}`)
      if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (text.trim() !== '1') throw new Error('Could not update that designation.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'designations'] }),
  })
}

// ── Tax Deductions (custom/payroll/admin/tax_deduction.php) — real, reads
// llx_payroll_deduct. Save/Update/Delete are all on this same page: save/
// update via a real `ajax=1` POST back to itself (genuine JSON reply), the
// Account dropdown pulls from the same llx_c_type_fees rows Settings edits
// (flag='salary'), delete via a GET action=delete + confirm=yes. ─────────

export interface TaxDeductionRow {
  id: string
  name: string
  percent: string
  deductionsFromCode: '1' | '2' // 1=Basic Salary, 2=Gross Salary
  payType: string
  currencyCode: string
  accountFeeId: string
  accountLabel: string
  deductionMethod: string // 'percentage' | 'amount'
}

export function useTaxDeductions() {
  return useQuery({
    queryKey: ['payroll', 'taxDeductions'],
    queryFn: async (): Promise<TaxDeductionRow[]> => {
      const doc = await fetchLegacyDocument('/custom/payroll/admin/tax_deduction.php')
      const table = doc.querySelector('#example1')
      if (!table) return []
      return Array.from(table.querySelectorAll('tbody tr')).map((tr) => {
        const cells = tr.querySelectorAll('td')
        const idInput = tr.querySelector<HTMLInputElement>('input[id^="name"]')
        const rowIdMatch = idInput?.id.match(/^name(\d+)$/)
        const id = rowIdMatch?.[1] ?? ''
        return {
          id,
          name: textOf(cells[1]),
          percent: textOf(cells[2]),
          deductionsFromCode: (tr.querySelector<HTMLInputElement>(`#type${id}`)?.value as '1' | '2') ?? '1',
          payType: tr.querySelector<HTMLInputElement>(`#pay_type${id}`)?.value ?? 'employee',
          currencyCode: textOf(cells[5]),
          accountFeeId: tr.querySelector<HTMLInputElement>(`#acc_code${id}`)?.value ?? '',
          accountLabel: textOf(cells[6]),
          deductionMethod: tr.querySelector<HTMLInputElement>(`#deduct_methd${id}`)?.value ?? 'percentage',
        }
      })
    },
    staleTime: 1000 * 30,
  })
}

// The real page's own Account dropdown for this tab (llx_c_type_fees WHERE
// flag='salary' — the same 6+ rows Settings/Add Expenses manage), not the
// full chart of accounts. Small and rarely changes, so scraped alongside
// the row list's own page instead of a second real fetch.
export interface TaxFeeOption {
  value: string
  label: string
}

export function useTaxFeeOptions() {
  return useQuery({
    queryKey: ['payroll', 'taxFeeOptions'],
    queryFn: async (): Promise<TaxFeeOption[]> => {
      const doc = await fetchLegacyDocument('/custom/payroll/admin/tax_deduction.php')
      const select = doc.querySelector<HTMLSelectElement>('select[name="acc_code"]')
      if (!select) return []
      return Array.from(select.options)
        .filter((o) => o.value && o.value !== '-1')
        .map((o) => ({ value: o.value, label: o.textContent?.trim() ?? '' }))
    },
    staleTime: 1000 * 60,
  })
}

export interface TaxDeductionInput {
  id?: string // present = update
  name: string
  method: 'percentage' | 'amount'
  amount: string
  deductionsFromCode: '1' | '2'
  payType: 'employee' | 'employer'
  currencyCode: string
  accountFeeId: string
}

export function useSaveTaxDeduction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TaxDeductionInput): Promise<void> => {
      const body = new URLSearchParams({
        ajax: '1',
        action: input.id ? 'update' : 'save',
        tax_name: input.name,
        tax_pre: input.amount,
        detc_type: input.deductionsFromCode,
        acc_code: input.accountFeeId,
        pay_type: input.payType,
        multicurrency_code: input.currencyCode,
        ded_type: input.method,
      })
      if (input.id) body.set('tax_id', input.id)
      const res = await fetch('/custom/payroll/admin/tax_deduction.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: { success: boolean; message: string } = await res.json()
      if (!data.success) throw new Error(data.message || 'Could not save the tax deduction.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'taxDeductions'] }),
  })
}

export function useDeleteTaxDeduction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const body = new URLSearchParams({ action: 'confirm_delete', tax_id: id, confirm: 'yes' })
      const res = await fetch('/custom/payroll/admin/tax_deduction.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'taxDeductions'] }),
  })
}

// ── Add Expenses & Allowances (custom/payroll/admin/add_expense.php) —
// real, reads/writes llx_c_type_fees WHERE flag='salary' (the same table
// Settings edits), excluding the 6 fixed rows Settings already covers. A
// plain classic form POST for add/edit, GET action=status_change/delete for
// the rest — all confirmed by reading that file directly. ────────────────

export interface ExpenseAllowanceRow {
  id: string
  code: string
  label: string
  accountNumber: string
  accountLabel: string
  active: boolean
}

export function useExpenseAllowances() {
  return useQuery({
    queryKey: ['payroll', 'expenseAllowances'],
    queryFn: async (): Promise<ExpenseAllowanceRow[]> => {
      const doc = await fetchLegacyDocument('/custom/payroll/admin/add_expense.php')
      const table = doc.querySelector('#example1')
      if (!table) return []
      return Array.from(table.querySelectorAll('tbody tr[id^="row-"]')).map((tr) => {
        const id = tr.id.replace(/^row-/, '')
        const codeText = textOf(tr.querySelector('.label-code'))
        const labelText = textOf(tr.querySelector('.label-text'))
        const accountText = textOf(tr.querySelector('.label-account-code'))
        const [accountNumber, ...rest] = accountText.split(' - ')
        const toggle = tr.querySelector('.active-button .fa-toggle-on')
        return { id, code: codeText, label: labelText, accountNumber: (accountNumber ?? '').trim(), accountLabel: rest.join(' - ').trim(), active: !!toggle }
      })
    },
    staleTime: 1000 * 30,
  })
}

export interface AddExpenseAllowanceInput {
  code: string
  label: string
  accountNumber: string
}

export function useAddExpenseAllowance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddExpenseAllowanceInput): Promise<void> => {
      const body = new URLSearchParams({ submitt: '1', payroll_code: input.code, payroll_label: input.label, accountancy_code: input.accountNumber })
      const res = await fetch('/custom/payroll/admin/add_expense.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'expenseAllowances'] }),
  })
}

export interface UpdateExpenseAllowanceInput {
  id: string
  code: string
  label: string
  accountNumber: string
}

export function useUpdateExpenseAllowance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateExpenseAllowanceInput): Promise<void> => {
      const body = new URLSearchParams({
        actionmodify: '1',
        edit_id: input.id,
        payroll_code1: input.code,
        payroll_label1: input.label,
        payroll_accnt_code1: input.accountNumber,
      })
      const res = await fetch('/custom/payroll/admin/add_expense.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'expenseAllowances'] }),
  })
}

export function useToggleExpenseAllowance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await legacyGet(`/custom/payroll/admin/add_expense.php?action=status_change&rowid=${encodeURIComponent(id)}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'expenseAllowances'] }),
  })
}

export function useDeleteExpenseAllowance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const body = new URLSearchParams({ action: 'confirm_delete', rowid: id, confirm: 'yes' })
      const res = await fetch('/custom/payroll/admin/add_expense.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'expenseAllowances'] }),
  })
}

// ── Payee Tax Slab (custom/payroll/admin/paye_tax.php) — real, reads
// llx_payee_tax for the CURRENT year only (the real page auto-seeds 4
// default brackets the first time a year has none, then caps at 4 total —
// confirmed by reading that file directly). Add is a classic form POST
// (array fields, but this app submits one bracket at a time — same "single
// submission" scope call as the Leave Request form's own single-day case),
// edit is a separate real per-row POST. ───────────────────────────────────

export interface PayeeTaxSlabRow {
  id: string
  fromAmount: string
  toAmount: string
  deductionPercent: string
}

export function usePayeeTaxSlab() {
  return useQuery({
    queryKey: ['payroll', 'payeeTaxSlab'],
    queryFn: async (): Promise<PayeeTaxSlabRow[]> => {
      const doc = await fetchLegacyDocument('/custom/payroll/admin/paye_tax.php')
      const table = doc.querySelector('#example1')
      if (!table) return []
      return Array.from(table.querySelectorAll('tbody tr[id^="row-"]')).map((tr) => ({
        id: tr.id.replace(/^row-/, ''),
        fromAmount: textOf(tr.querySelector('.label-from')),
        toAmount: textOf(tr.querySelector('.label-to')),
        deductionPercent: textOf(tr.querySelector('.label-deduc')),
      }))
    },
    staleTime: 1000 * 30,
  })
}

export interface AddPayeeTaxSlabInput {
  year: string
  fromAmount: string
  toAmount: string
  deductionPercent: string
}

export function useAddPayeeTaxSlab() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddPayeeTaxSlabInput): Promise<void> => {
      const body = new URLSearchParams()
      body.set('submitt', 'Update')
      body.set('y_calnd', input.year)
      body.append('from_amount[]', input.fromAmount)
      body.append('to_amount[]', input.toAmount)
      body.append('deduction[]', input.deductionPercent)
      const res = await fetch('/custom/payroll/admin/paye_tax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'payeeTaxSlab'] }),
  })
}

export interface UpdatePayeeTaxSlabInput {
  id: string
  fromAmount: string
  toAmount: string
  deductionPercent: string
}

export function useUpdatePayeeTaxSlab() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdatePayeeTaxSlabInput): Promise<void> => {
      const body = new URLSearchParams({
        actionmodify: '1',
        edit_id: input.id,
        tax_from: input.fromAmount,
        tax_to: input.toAmount,
        tax_deduc: input.deductionPercent,
      })
      const res = await fetch('/custom/payroll/admin/paye_tax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'payeeTaxSlab'] }),
  })
}

// ── Device Setting (custom/payroll/admin/device_settings.php) — real,
// reads device_setting. This app only builds the plain CRUD list (Add/Edit/
// Delete) — the page's own ZKTeco/Hikvision live-polling features (pull
// attendance, live status, push time sync) are a separate, much larger
// integration this scope doesn't cover; the list starts genuinely empty on
// this backend so there's nothing live to poll yet anyway. ───────────────

export interface DeviceRow {
  id: string
  serialNo: string
  ipAddress: string
  portNumber: string
  connectionStatus: string
  brand: string
}

export function useDevices() {
  return useQuery({
    queryKey: ['payroll', 'devices'],
    queryFn: async (): Promise<DeviceRow[]> => {
      const doc = await fetchLegacyDocument('/custom/payroll/admin/device_settings.php')
      // Each device's real data actually lives in its own "Edit Device"
      // modal <form id="form-device<id>">, not the visible table row —
      // that modal's inputs are already filled with the current values, so
      // reading them directly is simpler and more robust than the display
      // row (whose own cells aren't scoped by any per-row selector, and
      // whose Connection Status <select> reuses the literal id="status" on
      // *every* row — a real duplicate-id bug in the page itself — so it
      // must be read scoped by its own form via `name`, never by id).
      return Array.from(doc.querySelectorAll('form[id^="form-device"]'))
        .map((form) => {
          const id = form.id.match(/^form-device(\d+)$/)?.[1] ?? ''
          return {
            id,
            serialNo: form.querySelector<HTMLInputElement>('input[name="d_name"]')?.value ?? '',
            ipAddress: form.querySelector<HTMLInputElement>('input[name="ipadd"]')?.value ?? '',
            portNumber: form.querySelector<HTMLInputElement>('input[name="pnum"]')?.value ?? '',
            connectionStatus: form.querySelector<HTMLSelectElement>('select[name="status"]')?.value ?? '',
            brand: form.querySelector<HTMLInputElement>('input[name="d_type"]')?.value ?? '',
          }
        })
        .filter((r) => r.id)
    },
    staleTime: 1000 * 30,
  })
}

export interface DeviceInput {
  serialNo: string
  ipAddress: string
  portNumber: string
  connectionStatus: string
  brand: string
}

export function useSaveDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeviceInput): Promise<void> => {
      const body = new URLSearchParams({
        savedevice: '1',
        d_name: input.serialNo,
        ipadd: input.ipAddress,
        pnum: input.portNumber,
        status: input.connectionStatus,
        d_type: input.brand,
      })
      const res = await fetch('/custom/payroll/admin/save_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const text = await res.text()
      if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (text.trim() === '2') throw new Error(`Device "${input.serialNo}" already exists.`)
      if (text.trim() !== '0') throw new Error('Could not save the device.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'devices'] }),
  })
}

export function useUpdateDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeviceInput & { id: string }): Promise<void> => {
      const body = new URLSearchParams({
        updatedevice: '1',
        id: input.id,
        d_name: input.serialNo,
        ipadd: input.ipAddress,
        pnum: input.portNumber,
        status: input.connectionStatus,
        d_type: input.brand,
      })
      const res = await fetch('/custom/payroll/admin/save_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const text = await res.text()
      if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (text.trim() !== '0') throw new Error('Could not update the device.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'devices'] }),
  })
}

export function useDeleteDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const text = await legacyGet(`/custom/payroll/admin/save_ajax.php?deletedevice=${encodeURIComponent(id)}`)
      if (text.trim() !== '0') throw new Error('Could not delete the device.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'devices'] }),
  })
}
