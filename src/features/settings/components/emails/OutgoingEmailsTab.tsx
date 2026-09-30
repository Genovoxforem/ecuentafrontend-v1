import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../../products/components/LegacyReportStates'
import { useMailSettings, useSaveMailSettings, useTestMailConnection, type MailPageKey } from '../../emails/emails.queries'
import type { MailFormField } from '../../emails/mailSettingsParser'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

type Values = Record<string, string>

interface Spec {
  name: string
  label: string
  // Shown only for some sending methods (the backend page's own script hides the rest).
  when?: (mode: string) => boolean
  // A field hidden by the sending method is still sent with its stored value, so choosing
  // another method does not blank the SMTP account.
  keepWhenHidden?: boolean
  required?: boolean
  warnWhenSet?: boolean
}

interface Group {
  title?: string
  specs: Spec[]
}

const isSmtp = (mode: string) => mode === 'smtps' || mode === 'swiftmailer'
const isSwift = (mode: string) => mode === 'swiftmailer'

// Labels are the backend page's own wording; values, options and the sending-method rules
// come from (and go back to) the page itself.
const PAGES: Record<MailPageKey, { modeField: string; groups: Group[] }> = {
  outgoing: {
    modeField: 'MAIN_MAIL_SENDMODE',
    groups: [
      {
        specs: [
          { name: 'MAIN_DISABLE_ALL_MAILS', label: 'Disable all email sending (for test purposes or demos)' },
          { name: 'MAIN_MAIL_FORCE_SENDTO', label: 'Send all emails to (instead of real recipients, for test purposes)', warnWhenSet: true },
        ],
      },
      {
        title: 'Email sending method',
        specs: [
          { name: 'MAIN_MAIL_SENDMODE', label: 'Email sending method' },
          { name: 'MAIN_MAIL_SMTP_SERVER', label: 'SMTP/SMTPS host', when: isSmtp, keepWhenHidden: true },
          { name: 'MAIN_MAIL_SMTP_PORT', label: 'SMTP/SMTPS port', when: isSmtp, keepWhenHidden: true },
          { name: 'MAIN_MAIL_SMTPS_ID', label: 'SMTP ID (if sending server requires authentication)', when: isSmtp, keepWhenHidden: true },
          { name: 'MAIN_MAIL_SMTPS_PW', label: 'SMTP password (if sending server requires authentication)', when: isSmtp, keepWhenHidden: true },
          { name: 'MAIN_MAIL_EMAIL_TLS', label: 'Use TLS (SSL) encryption', when: isSmtp },
          { name: 'MAIN_MAIL_EMAIL_STARTTLS', label: 'Use TLS (STARTTLS) encryption', when: isSmtp },
          { name: 'MAIN_MAIL_EMAIL_SMTP_ALLOW_SELF_SIGNED', label: 'Allow self-signed certificates', when: isSmtp },
          { name: 'MAIN_MAIL_EMAIL_DKIM_ENABLED', label: 'Use DKIM to generate email signature', when: isSwift },
          { name: 'MAIN_MAIL_EMAIL_DKIM_DOMAIN', label: 'Email domain for use with DKIM', when: isSwift },
          { name: 'MAIN_MAIL_EMAIL_DKIM_SELECTOR', label: 'Name of DKIM selector', when: isSwift },
          { name: 'MAIN_MAIL_EMAIL_DKIM_PRIVATE_KEY', label: 'Private key for DKIM signing', when: isSwift },
        ],
      },
      {
        title: 'Other options',
        specs: [
          { name: 'MAIN_MAIL_EMAIL_FROM', label: 'Sender email for automatic emails', required: true },
          { name: 'MAIN_MAIL_DEFAULT_FROMTYPE', label: 'Default sender email for manual sending (User email or Company email)' },
          { name: 'MAIN_MAIL_ERRORS_TO', label: "Email used for error returns emails (fields 'Errors-To' in emails sent)" },
          { name: 'MAIN_MAIL_AUTOCOPY_TO', label: 'Copy (Bcc) all sent emails to' },
          { name: 'MAIN_MAIL_ENABLED_USER_DEST_SELECT', label: 'Suggest emails of employees (if defined) into the list of predefined recipient when writing a new email' },
        ],
      },
    ],
  },
  ticket: {
    modeField: 'MAIN_MAIL_SENDMODE_TICKET',
    groups: [
      {
        specs: [
          { name: 'MAIN_MAIL_SENDMODE_TICKET', label: 'Email sending method' },
          { name: 'MAIN_MAIL_SMTP_SERVER_TICKET', label: 'SMTP/SMTPS host', when: isSmtp, keepWhenHidden: true },
          { name: 'MAIN_MAIL_SMTP_PORT_TICKET', label: 'SMTP/SMTPS port', when: isSmtp, keepWhenHidden: true },
          { name: 'MAIN_MAIL_SMTPS_ID_TICKET', label: 'SMTP ID (if sending server requires authentication)', when: isSmtp, keepWhenHidden: true },
          { name: 'MAIN_MAIL_SMTPS_PW_TICKET', label: 'SMTP password (if sending server requires authentication)', when: isSmtp, keepWhenHidden: true },
          { name: 'MAIN_MAIL_EMAIL_TLS_TICKET', label: 'Use TLS (SSL) encryption', when: isSmtp, keepWhenHidden: true },
          { name: 'MAIN_MAIL_EMAIL_STARTTLS_TICKET', label: 'Use TLS (STARTTLS) encryption', when: isSmtp, keepWhenHidden: true },
        ],
      },
    ],
  },
}

function Row({ label, children, warn, required }: { label: string; children: React.ReactNode; warn?: boolean; required?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-border last:border-0 gap-x-4 gap-y-1.5">
      <span className="text-sm text-brand max-w-2xl">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <span className="flex items-center gap-1.5 shrink-0 text-sm text-text-muted">
        {children}
        {warn && <AlertTriangle size={14} className="text-danger" aria-label="Warning" />}
      </span>
    </div>
  )
}

function Control({ field, value, onChange, label }: { field: MailFormField; value: string; onChange: (v: string) => void; label: string }) {
  if (field.kind === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={selectCls + ' w-72 max-w-full'}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  if (field.kind === 'textarea') {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} rows={6} className={inputCls + ' w-72 max-w-full h-auto py-2 font-mono text-xs'} />
  }
  return (
    <input
      type={field.kind === 'password' ? 'password' : 'text'}
      autoComplete={field.kind === 'password' ? 'new-password' : 'off'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={inputCls + ' w-72 max-w-full'}
    />
  )
}

// Emails setup > Outgoing emails, and Outgoing emails (for module Ticket): the backend's
// own settings form (admin/mails.php / mails_ticket.php `?action=edit`), read and saved
// through the same requests the page sends.
export function OutgoingEmailsTab({ page }: { page: MailPageKey }) {
  const config = PAGES[page]
  const { data: form, isLoading, isError, error, refetch } = useMailSettings(page)
  const save = useSaveMailSettings(page)
  const testConnection = useTestMailConnection()
  const [values, setValues] = useState<Values>({})
  const [saved, setSaved] = useState(false)
  const [missing, setMissing] = useState('')

  useEffect(() => {
    if (!form) return
    setValues(Object.fromEntries(Object.values(form.fields).map((f) => [f.name, f.value])))
  }, [form])

  if (isLoading) return <LegacyLoadingCard label="Loading email settings…" />
  if (isError || !form) {
    return <LegacyErrorCard title="Couldn't load the email settings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  const mode = values[config.modeField] ?? ''
  const shown = (spec: Spec) => !!form.fields[spec.name] && (!spec.when || spec.when(mode))
  const set = (name: string, v: string) => {
    setSaved(false)
    setValues((cur) => ({ ...cur, [name]: v }))
  }

  function handleSave() {
    setSaved(false)
    const specs = config.groups.flatMap((g) => g.specs).filter((s) => form?.fields[s.name])
    const empty = specs.find((s) => s.required && !(values[s.name] ?? '').trim())
    if (empty) return setMissing(`${empty.label} is required.`)
    setMissing('')
    // What the backend page's own form would submit: visible fields, plus the SMTP account
    // fields kept as stored.
    const send: Values = {}
    for (const s of specs) if (!s.when || s.when(mode) || s.keepWhenHidden) send[s.name] = values[s.name] ?? ''
    save.mutate(send, { onSuccess: () => setSaved(true) })
  }

  const notice = mode === 'mail' && page === 'outgoing' ? 'PHP mail function uses the server’s own sendmail setup — there is no SMTP host or port to set here.' : ''

  return (
    <div className="space-y-4">
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
          <span>Parameter</span>
          <span>Value</span>
        </div>
        {config.groups.map((group, gi) => {
          const specs = group.specs.filter(shown)
          if (specs.length === 0) return null
          return (
            <div key={gi}>
              {group.title && <div className="px-4 py-2 bg-surface text-sm font-semibold text-text! border-b border-border">{group.title}</div>}
              {specs.map((spec) => (
                <Row key={spec.name} label={spec.label} required={spec.required} warn={spec.warnWhenSet && !!(values[spec.name] ?? '').trim()}>
                  <Control field={form.fields[spec.name]} value={values[spec.name] ?? ''} onChange={(v) => set(spec.name, v)} label={spec.label} />
                </Row>
              ))}
            </div>
          )
        })}
      </Card>

      {notice && <p className="text-sm text-text-muted">{notice}</p>}
      {missing && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
          <p role="alert">{missing}</p>
        </Card>
      )}
      {save.isError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
          <p role="alert">{save.error instanceof Error ? save.error.message : 'The settings could not be saved.'}</p>
        </Card>
      )}
      {saved && (
        <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">
          <p role="status">Settings saved.</p>
        </Card>
      )}
      {testConnection.isSuccess && (
        <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">
          <p role="status">{testConnection.data}</p>
        </Card>
      )}
      {testConnection.isError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
          <p role="alert">{testConnection.error instanceof Error ? testConnection.error.message : 'The connectivity test failed.'}</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleSave} disabled={save.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {save.isPending && <Loader2 size={14} className="animate-spin" />} Save
        </button>
        {page === 'outgoing' && (
          <>
            <button
              type="button"
              onClick={() => testConnection.mutate()}
              disabled={testConnection.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-alt disabled:opacity-60"
            >
              {testConnection.isPending && <Loader2 size={14} className="animate-spin" />} Test Server Connectivity
            </button>
            <button
              type="button"
              disabled
              title="Sending a test email uses the backend's mail composer, which this app does not have yet."
              className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-faint cursor-not-allowed"
            >
              Test Sending
            </button>
          </>
        )}
      </div>
    </div>
  )
}
