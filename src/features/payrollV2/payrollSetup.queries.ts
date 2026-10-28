import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { toastMessages } from '../generalLedger/bindLines.queries'
import { pv2Get, pv2PostResult } from './payrollV2.api'
import { parseCountries, parseDevices, parseLeaveTypes, parseTaxBands, parseTaxYears, type SetupField } from './setupHtmlParser'

const SETUP_URL = '/custom/payroll_v2/admin/setup.php'

// setup.php's $constants, tab by tab, with its labels.
export const SETUP_GROUPS = {
  general: {
    title: 'General & Overtime Rules',
    fields: [
      { key: 'PAYROLL_V2_CALC_FROM', label: 'Deduction basis (basic/gross)' },
      { key: 'PAYROLL_V2_FISCAL_YEAR_START', label: 'Fiscal year start month (1-12)' },
      { key: 'PAYROLL_V2_PRORATE_METHOD', label: 'Prorate method' },
      { key: 'PAYROLL_V2_MONTHLY_WORKING_HOURS', label: 'Monthly working hours (OT base)' },
      { key: 'PAYROLL_V2_MIN_OT_MINUTES', label: 'Minimum OT minutes to qualify' },
      { key: 'PAYROLL_V2_OT_RATE_NORMAL', label: 'Normal OT multiplier' },
      { key: 'PAYROLL_V2_HOLIDAY_OT_RATE', label: 'Public holiday OT multiplier' },
      { key: 'PAYROLL_V2_OFFDAY_OT_RATE', label: 'Off-day OT multiplier' },
      { key: 'PAYROLL_V2_NIGHT_OT_RATE', label: 'Night shift premium multiplier' },
      { key: 'PAYROLL_V2_SOD_ENABLED', label: 'Enforce Segregation of Duties (approver != creator)' },
      { key: 'PAYROLL_V2_APPROVAL_TIMEOUT_DAYS', label: 'Approval escalation timeout (days)' },
      { key: 'PAYROLL_V2_ZKTECO_ENABLED', label: 'Enable ZKTeco ADMS receiver' },
      { key: 'PAYROLL_V2_2FA_REQUIRED', label: 'Require OTP for approve/post/lock' },
      { key: 'PAYROLL_V2_ENABLE_PAYSLIP_QR', label: 'Show QR verification code on payslip PDF' },
      { key: 'PAYROLL_V2_PAYMENT_GL_CODE', label: 'Payroll Accounting Code (Salary Payable clearing account, e.g. 2110)' },
      { key: 'PAYROLL_V2_PAYMENT_BANK_ACCOUNT', label: 'Bank Account for Salary Payments' },
    ],
  },
  statutory: {
    title: 'NAPSA / NHIMA / PAYE',
    fields: [
      { key: 'PAYROLL_V2_NAPSA_RATE', label: 'NAPSA rate (%)' },
      { key: 'PAYROLL_V2_NAPSA_LIMIT', label: 'NAPSA monthly ceiling (ZMW)' },
      { key: 'PAYROLL_V2_NHIMA_RATE', label: 'NHIMA rate (%)' },
      { key: 'PAYROLL_V2_PAYE_TAXABLE_BASIS', label: 'PAYE taxable basis' },
    ],
  },
  sharing: {
    title: 'Payslip Sharing (Email / WhatsApp / SMS)',
    fields: [
      { key: 'PAYROLL_V2_PAYSLIP_SHARE_ENABLED', label: 'Enable payslip sharing (Email/WhatsApp/SMS)' },
      { key: 'PAYROLL_V2_EMAIL_PAYSLIPS', label: 'Auto-email payslips on post' },
      { key: 'PAYROLL_V2_SHARE_TOKEN_EXPIRY_HOURS', label: 'Share link expiry (hours)' },
      { key: 'PAYROLL_V2_SITE_URL', label: 'Public site base URL (for share links)' },
      { key: 'PAYROLL_V2_TWILIO_SID', label: 'Twilio Account SID' },
      { key: 'PAYROLL_V2_TWILIO_TOKEN', label: 'Twilio Auth Token' },
      { key: 'PAYROLL_V2_TWILIO_WHATSAPP_FROM', label: 'Twilio WhatsApp From (e.g. whatsapp:+14155238886)' },
      { key: 'PAYROLL_V2_TWILIO_SMS_FROM', label: 'Twilio SMS From (e.g. +14155238886)' },
    ],
  },
} as const

export type SetupGroupKey = keyof typeof SETUP_GROUPS
export type SetupConstants = Record<SetupGroupKey, SetupField[]>

const setupDoc = (params: Record<string, string>) => fetchLegacyDocument(SETUP_URL, new URLSearchParams(params))

// payroll_v2/fapi/setup.php?action=get: the three constant tabs with each field's current value, in one call. Checked live
// against the classic page's own controls: same keys, labels, types and values. The one difference is the salary bank
// account, which the fapi gives as type "bank_select" plus a separate bank_accounts list; the classic page's option text is
// "<label> (<ref>) — GL <account number>" with an empty "-- Select Bank Account --" first option, rebuilt here.
interface FapiSetupField {
  key: string
  label: string
  type: string
  value: unknown
  options?: Record<string, string>
}
interface FapiSetup {
  tabs: Record<string, { title: string; fields: FapiSetupField[] }>
  bank_accounts: Array<{ id: number | string; label: string; ref: string; account_number: string }>
}

export function setupFieldFrom(key: string, label: string, f: FapiSetupField | undefined, banks: FapiSetup['bank_accounts']): SetupField {
  const value = f?.value === null || f?.value === undefined ? '' : String(f.value)
  if (f?.type === 'bank_select') {
    const options = [{ value: '', label: '-- Select Bank Account --' }, ...banks.map((b) => ({ value: String(b.id), label: `${b.label} (${b.ref}) — GL ${b.account_number}` }))]
    return { key, label, type: 'select', value, options }
  }
  if (f?.type === 'select') return { key, label, type: 'select', value, options: Object.entries(f.options ?? {}).map(([v, l]) => ({ value: v, label: l })) }
  if (f?.type === 'checkbox') return { key, label, type: 'checkbox', value: value === '1' ? '1' : '0', options: [] }
  return { key, label, type: f?.type === 'password' ? 'password' : 'text', value, options: [] }
}

export function useSetupConstants() {
  return useQuery({
    queryKey: ['payroll-v2', 'setup', 'constants'],
    queryFn: async (): Promise<SetupConstants> => {
      const data = await pv2Get<FapiSetup>('setup.php', 'get')
      const keys = Object.keys(SETUP_GROUPS) as SetupGroupKey[]
      return Object.fromEntries(
        keys.map((tab) => [tab, SETUP_GROUPS[tab].fields.map(({ key, label }) => setupFieldFrom(key, label, data.tabs[tab]?.fields.find((f) => f.key === key), data.bank_accounts ?? []))]),
      ) as SetupConstants
    },
  })
}

export function useSetupLeaveTypes() {
  return useQuery({
    queryKey: ['payroll-v2', 'setup', 'leave-types'],
    queryFn: async () => {
      const doc = await setupDoc({ tab: 'leave_types' })
      return { rows: parseLeaveTypes(doc), countries: parseCountries(doc) }
    },
  })
}

export function useSetupTaxBands(year: number) {
  return useQuery({
    queryKey: ['payroll-v2', 'setup', 'tax-bands', year],
    queryFn: async () => {
      const doc = await setupDoc({ tab: 'paye', filter_year: String(year) })
      return { rows: parseTaxBands(doc), years: parseTaxYears(doc) }
    },
  })
}

export function useSetupDevices() {
  return useQuery({
    queryKey: ['payroll-v2', 'setup', 'devices'],
    queryFn: async () => parseDevices(await setupDoc({ tab: 'devices' })),
  })
}

// One POST to setup.php with a token read off a fresh GET of the same tab;
// the page answers with its own showToast("…", "error") when it refuses.
export function useSetupAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tab, fields }: { tab: string; fields: Record<string, string> }) => {
      const page = await fetchLegacyText(`${SETUP_URL}?tab=${encodeURIComponent(tab)}`)
      const token = /name="token" value="([^"]+)"/.exec(page)?.[1]
      if (!token) throw new Error('Could not read the setup page’s security token. Reload and try again.')
      const html = await fetchLegacyText(`${SETUP_URL}?tab=${encodeURIComponent(tab)}`, {
        method: 'POST',
        body: new URLSearchParams({ token, tab, ...fields }),
      })
      const refusal = toastMessages(html).find((m) => m.type === 'error')
      if (refusal) throw new Error(refusal.message)
      return toastMessages(html).find((m) => m.type !== 'error')?.message ?? null
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-v2', 'setup'] }),
  })
}

// payroll_v2/fapi/setup.php?action=save: writes only the constants it is sent (checked with a dry run on newecuenta: one key
// answered "would save 1 constant"), so a tab saves without touching the other two, unlike the classic page's form, which
// wiped them. Keys are the upper-case constant names (lower-case ones come back in ignored_fields). The call is a dry run
// until confirm is sent; confirm=1 as a form value persists (checked on newecuenta by writing one constant back with its own
// value: "Settings saved.", dry_run false, nothing else changed). If the server still answers a dry run nothing was saved,
// and that is reported instead of "saved".
export function setupSavePayload(fields: SetupField[]): Record<string, string> {
  const params: Record<string, string> = { confirm: '1' }
  for (const f of fields) params[f.key] = f.type === 'checkbox' ? (f.value === '1' ? '1' : '0') : f.value
  return params
}

export function useSaveSetupConstants() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fields: SetupField[]) => {
      const { data, message } = await pv2PostResult<{ dry_run?: boolean; count?: number } | null>('setup.php', 'save', setupSavePayload(fields))
      if (data?.dry_run) throw new Error('The server answered a dry run, so nothing was saved.')
      return message || null
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-v2', 'setup'] }),
  })
}
