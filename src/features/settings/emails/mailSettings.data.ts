import { fapiGet } from '../../../api/fapiEnvelope'

// Outgoing email settings (Setup > Emails > Outgoing emails, and Outgoing emails for the Ticket module): the MAIN_MAIL_* constants.
//  - read: core/fapi/constants.php?names=A,B,C -> {values: {NAME: value | null}, redacted: [secret names: value not sent], missing: [never set]} (admin only).
//  - write: admin/fapi/const_save.php through saveStoredSettings (only the constants that changed).
// The field list, kinds and option wording are those of the classic admin/mails.php and mails_ticket.php edit forms, read on newecuenta on 12 Nov 2026 (GET): 18 controls on
// mails.php, 7 on mails_ticket.php. A constant that was never set is drawn with the value the classic form shows for it (No for the yes / no ones, "mail" for the sending
// method, "Same configuration than the global Outgoing email setup" for the Ticket one). The SMTP password and the DKIM private key come back redacted, so they are shown
// empty and are only saved when something is typed (they cannot be cleared from here). "Test server connectivity" and "Test sending" have no fapi (master AN-185).
export interface MailFormOption {
  value: string
  label: string
}

export interface MailFormField {
  name: string
  kind: 'input' | 'password' | 'select' | 'textarea'
  value: string
  options: MailFormOption[]
  // the value is not sent by the API (redacted): shown empty, saved only when typed
  secret?: boolean
}

export interface MailSettingsForm {
  fields: Record<string, MailFormField>
}

export type MailPageKey = 'outgoing' | 'ticket'

const YES_NO: MailFormOption[] = [{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }]
const SENDMODES: MailFormOption[] = [
  { value: 'mail', label: 'PHP mail function' },
  { value: 'smtps', label: 'SMTP/SMTPS socket library' },
  { value: 'swiftmailer', label: 'Swift Mailer socket library' },
]
type Def = { kind: MailFormField['kind']; fallback: string; options?: MailFormOption[]; secret?: boolean }
const input = (fallback = ''): Def => ({ kind: 'input', fallback })
const yesNo = (fallback = '0'): Def => ({ kind: 'select', fallback, options: YES_NO })

export const MAIL_FIELDS: Record<MailPageKey, Record<string, Def>> = {
  outgoing: {
    MAIN_DISABLE_ALL_MAILS: yesNo(),
    MAIN_MAIL_FORCE_SENDTO: input(),
    MAIN_MAIL_SENDMODE: { kind: 'select', fallback: 'mail', options: SENDMODES },
    MAIN_MAIL_SMTP_SERVER: input(),
    MAIN_MAIL_SMTP_PORT: input(),
    MAIN_MAIL_SMTPS_ID: input(),
    MAIN_MAIL_SMTPS_PW: { kind: 'password', fallback: '', secret: true },
    MAIN_MAIL_EMAIL_TLS: yesNo(),
    MAIN_MAIL_EMAIL_STARTTLS: yesNo(),
    MAIN_MAIL_EMAIL_SMTP_ALLOW_SELF_SIGNED: yesNo(),
    MAIN_MAIL_EMAIL_DKIM_ENABLED: yesNo(),
    MAIN_MAIL_EMAIL_DKIM_DOMAIN: input(),
    MAIN_MAIL_EMAIL_DKIM_SELECTOR: input(),
    MAIN_MAIL_EMAIL_DKIM_PRIVATE_KEY: { kind: 'textarea', fallback: '', secret: true },
    MAIN_MAIL_EMAIL_FROM: input(),
    MAIN_MAIL_DEFAULT_FROMTYPE: { kind: 'select', fallback: 'company', options: [{ value: 'user', label: 'User email' }, { value: 'company', label: 'Company Email' }] },
    MAIN_MAIL_ERRORS_TO: input(),
    MAIN_MAIL_AUTOCOPY_TO: input(),
    MAIN_MAIL_ENABLED_USER_DEST_SELECT: yesNo(),
  },
  ticket: {
    MAIN_MAIL_SENDMODE_TICKET: { kind: 'select', fallback: 'default', options: [{ value: 'default', label: 'Same configuration than the global Outgoing email setup' }, ...SENDMODES] },
    MAIN_MAIL_SMTP_SERVER_TICKET: input(),
    MAIN_MAIL_SMTP_PORT_TICKET: input(),
    MAIN_MAIL_SMTPS_ID_TICKET: input(),
    MAIN_MAIL_SMTPS_PW_TICKET: { kind: 'password', fallback: '', secret: true },
    MAIN_MAIL_EMAIL_TLS_TICKET: yesNo(),
    MAIN_MAIL_EMAIL_STARTTLS_TICKET: yesNo(),
  },
}

interface ConstantsAnswer {
  values: Record<string, string | null>
  redacted?: string[]
}

export function buildMailForm(page: MailPageKey, answer: ConstantsAnswer): MailSettingsForm {
  const redacted = new Set(answer.redacted ?? [])
  const fields: Record<string, MailFormField> = {}
  for (const [name, def] of Object.entries(MAIL_FIELDS[page])) {
    const stored = answer.values?.[name]
    const secret = !!def.secret || redacted.has(name)
    fields[name] = { name, kind: def.kind, options: def.options ?? [], secret, value: secret ? '' : stored !== null && stored !== undefined ? String(stored) : def.fallback }
  }
  return { fields }
}

export async function loadMailSettings(page: MailPageKey): Promise<MailSettingsForm> {
  const names = Object.keys(MAIL_FIELDS[page])
  return buildMailForm(page, await fapiGet<ConstantsAnswer>('/core/fapi/constants.php', { names: names.join(',') }))
}

// What has to be written: the fields whose value differs from the loaded one; a secret that was left empty is not touched.
export function mailChanges(form: MailSettingsForm, values: Record<string, string>): Record<string, string> {
  const changes: Record<string, string> = {}
  for (const [name, field] of Object.entries(form.fields)) {
    if (!(name in values)) continue
    if (values[name] === field.value) continue
    if (field.secret && values[name] === '') continue
    changes[name] = values[name]
  }
  return changes
}
