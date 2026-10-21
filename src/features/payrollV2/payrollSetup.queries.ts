import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { toastMessages } from '../generalLedger/bindLines.queries'
import { parseCountries, parseDevices, parseLeaveTypes, parseSetupFields, parseTaxBands, parseTaxYears, type SetupField } from './setupHtmlParser'

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

// Each settings tab prints only its own controls, so all three are read.
export function useSetupConstants() {
  return useQuery({
    queryKey: ['payroll-v2', 'setup', 'constants'],
    queryFn: async (): Promise<SetupConstants> => {
      const keys = Object.keys(SETUP_GROUPS) as SetupGroupKey[]
      const docs = await Promise.all(keys.map((tab) => setupDoc({ tab })))
      if (!docs[0].querySelector('[name="payroll_v2_calc_from"]')) throw new Error('The Payroll V2 setup page did not open — this account may not have access to it.')
      return Object.fromEntries(keys.map((tab, i) => [tab, parseSetupFields(docs[i], [...SETUP_GROUPS[tab].fields])])) as SetupConstants
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

// setup.php's `update` writes every constant of every tab from the request — a
// checkbox that is absent becomes 0 and a text field that is absent becomes
// empty — so the classic page's per-tab form wipes the other two tabs. Saving
// always sends the full set (the edited tab plus the other tabs as loaded).
export function constantsPayload(all: SetupConstants): Record<string, string> {
  const fields: Record<string, string> = { action: 'update' }
  for (const group of Object.values(all)) {
    for (const f of group) {
      if (f.type === 'checkbox') {
        if (f.value === '1') fields[f.key.toLowerCase()] = '1'
      } else {
        fields[f.key.toLowerCase()] = f.value
      }
    }
  }
  return fields
}
