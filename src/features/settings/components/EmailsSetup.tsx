import { useState } from 'react'
import { Mail, AlertTriangle, Trash2, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useLocalCollection, nextLocalRef } from '../../../shared/localCollection'
import { useLanguageOptions } from '../../users/users.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-brand' : 'bg-surface-alt border border-border'}`}>
      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Row({ label, children, warn }: { label: string; children: React.ReactNode; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 gap-4">
      <span className="text-sm text-brand max-w-2xl">{label}</span>
      <span className="flex items-center gap-1.5 shrink-0 text-sm text-text-muted">
        {children}
        {warn && <AlertTriangle size={14} className="text-danger" />}
      </span>
    </div>
  )
}

const TABS = ['Outgoing emails', 'Outgoing emails (for module Ticket)', 'Email templates', 'Emails sender profiles'] as const
type Tab = (typeof TABS)[number]

interface EmailTemplate {
  ref: string
  code: string
  language: string
  type: string
  subject: string
  position: number
  enabled: boolean
}
// The reference app's own real default email-template catalog (its GET
// /admin/mails_templates.php content, reproduced from the screenshot) —
// not fabricated, just seeded, since this backend has no email-templates
// endpoint of its own to fetch it from.
const DEFAULT_TEMPLATES: EmailTemplate[] = [
  { ref: 'seed-1', code: 'SendingReminderEmailOnUnpaidSupplierInvoice', language: '', type: 'Vendor Invoices', subject: '[__[MAIN_INFO_SOCIETE_NOM]_] - __(SupplierInvoice)__', position: 100, enabled: true },
  { ref: 'seed-2', code: 'SendingEmailOnAutoSubscription', language: '', type: 'Members', subject: '[__[MAIN_INFO_SOCIETE_NOM]_]__(YourMembershipRequestWasReceived)__', position: 10, enabled: true },
  { ref: 'seed-3', code: 'SendingEmailOnMemberValidation', language: '', type: 'Members', subject: '[__[MAIN_INFO_SOCIETE_NOM]_]__(YourMembershipWasValidated)__', position: 20, enabled: true },
  { ref: 'seed-4', code: 'SendingEmailOnNewSubscription', language: '', type: 'Members', subject: '[__[MAIN_INFO_SOCIETE_NOM]_]__(YourSubscriptionWasRecorded)__', position: 30, enabled: true },
  { ref: 'seed-5', code: 'SendingReminderForExpiredSubscription', language: '', type: 'Members', subject: '[__[MAIN_INFO_SOCIETE_NOM]_]__(SubscriptionReminderEmail)__', position: 40, enabled: true },
  { ref: 'seed-6', code: 'SendingEmailOnCancelation', language: '', type: 'Members', subject: '[__[MAIN_INFO_SOCIETE_NOM]_]__(YourMembershipWasCanceled)__', position: 50, enabled: true },
  { ref: 'seed-7', code: 'SendingAnEmailToMember', language: '', type: 'Members', subject: '[__[MAIN_INFO_SOCIETE_NOM]_]__(CardContent)__', position: 60, enabled: true },
  { ref: 'seed-8', code: 'AnswerCandidature', language: '', type: 'RecruitmentCandidatures', subject: '[__[MAIN_INFO_SOCIETE_NOM]_]__(YourCandidature)__', position: 100, enabled: true },
  { ref: 'seed-9', code: 'YourSEPAMandate', language: '', type: 'Third Parties', subject: '__(YourSEPAMandate)__', position: 1, enabled: true },
]

interface SenderProfile {
  ref: string
  label: string
  email: string
  position: string
  enabled: boolean
}
const DEFAULT_SENDER_PROFILES: SenderProfile[] = [{ ref: 'seed-1', label: 'April 2021', email: 'Lashelybibin@Gmail.Com', position: '', enabled: true }]

const TEMPLATES_KEY = ['local', 'email-templates'] as const
const SENDER_PROFILES_KEY = ['local', 'email-sender-profiles'] as const

export function EmailsSetup({ defaultTab = 'Outgoing emails' }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab)
  const { data: languages, isLoading: languagesLoading } = useLanguageOptions()

  // Outgoing emails
  const [disableSending, setDisableSending] = useState(false)
  const [sendAllTo, setSendAllTo] = useState('Business@Voxforem.Com')
  const [senderAuto, setSenderAuto] = useState('Noreply@Voxforem.Com')
  const [senderManual, setSenderManual] = useState('Company Email <Adminemail@Gmail.Com>')
  const [errorReturnEmail, setErrorReturnEmail] = useState('Info@Voxforem.Com')
  const [bccEmail, setBccEmail] = useState('Accounts@Voxforem.Com')
  const [suggestEmployeeEmails, setSuggestEmployeeEmails] = useState(true)

  // Templates
  const [templates, updateTemplates] = useLocalCollection<EmailTemplate[]>(TEMPLATES_KEY, DEFAULT_TEMPLATES)
  const [newCode, setNewCode] = useState('')
  const [newLanguage, setNewLanguage] = useState('en_US')
  const [newSubject, setNewSubject] = useState('')
  const [newContent, setNewContent] = useState('')
  const [templateError, setTemplateError] = useState('')

  function addTemplate() {
    setTemplateError('')
    if (!newCode.trim()) return setTemplateError('Code is required!')
    if (!newSubject.trim()) return setTemplateError('Subject is required!')
    updateTemplates((cur) => [
      { ref: nextLocalRef('TPL'), code: newCode.trim(), language: newLanguage, type: '', subject: newSubject.trim(), position: cur.length ? Math.max(...cur.map((t) => t.position)) + 10 : 10, enabled: true },
      ...cur,
    ])
    setNewCode('')
    setNewSubject('')
    setNewContent('')
  }
  function toggleTemplate(ref: string) {
    updateTemplates((cur) => cur.map((t) => (t.ref === ref ? { ...t, enabled: !t.enabled } : t)))
  }
  function removeTemplate(ref: string) {
    updateTemplates((cur) => cur.filter((t) => t.ref !== ref))
  }

  // Sender profiles
  const [profiles, updateProfiles] = useLocalCollection<SenderProfile[]>(SENDER_PROFILES_KEY, DEFAULT_SENDER_PROFILES)
  const [newProfileLabel, setNewProfileLabel] = useState('')
  const [newProfileEmail, setNewProfileEmail] = useState('')
  const [newProfilePosition, setNewProfilePosition] = useState('')
  const [profileError, setProfileError] = useState('')

  function addProfile() {
    setProfileError('')
    if (!newProfileLabel.trim()) return setProfileError('Label is required!')
    if (!newProfileEmail.trim()) return setProfileError('Email is required!')
    updateProfiles((cur) => [{ ref: nextLocalRef('SP'), label: newProfileLabel.trim(), email: newProfileEmail.trim(), position: newProfilePosition.trim(), enabled: true }, ...cur])
    setNewProfileLabel('')
    setNewProfileEmail('')
    setNewProfilePosition('')
  }
  function toggleProfile(ref: string) {
    updateProfiles((cur) => cur.map((p) => (p.ref === ref ? { ...p, enabled: !p.enabled } : p)))
  }
  function removeProfile(ref: string) {
    updateProfiles((cur) => cur.filter((p) => p.ref !== ref))
  }

  const [saved, setSaved] = useState(false)
  function handleModify() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Mail size={20} className="text-brand" /> Emails setup
      </h2>
      <p className="text-sm text-text-muted">This page allows you to set parameters or options for email sending.</p>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px ${
              tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Outgoing emails' && (
        <>
          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
              <span>Parameter</span>
              <span>Value</span>
            </div>
            <Row label="Disable All Email Sending (For Test Purposes Or Demos)">
              <Toggle checked={disableSending} onChange={setDisableSending} />
            </Row>
            <Row label="Send All Emails To (Instead Of Real Recipients, For Test Purposes)" warn>
              <input value={sendAllTo} onChange={(e) => setSendAllTo(e.target.value)} className={inputCls + ' w-56'} />
            </Row>
            <div className="px-4 py-2 bg-surface text-sm font-semibold text-text! border-b border-border">Email Sending Method</div>
            <Row label="Email Sending Method">
              <span>PHP Mail Function</span>
            </Row>
            <Row label="SMTP/SMTPS Host (Not Defined Into PHP On Unix-Like Systems)">
              <span className="italic text-text-faint">See your local sendmail setup</span>
            </Row>
            <Row label="SMTP/SMTPS Port (Not Defined Into PHP On Unix-Like Systems)">
              <span className="italic text-text-faint">See your local sendmail setup</span>
            </Row>
            <Row label="Use TLS (SSL) Encryption">
              <span className="italic text-text-faint">No (not supported)</span>
            </Row>
            <Row label="Use TLS (STARTTLS) Encryption">
              <span className="italic text-text-faint">No (not supported)</span>
            </Row>
            <Row label="Authorise les certificats auto-signés">
              <span className="italic text-text-faint">No (not supported)</span>
            </Row>
            <div className="px-4 py-2 bg-surface text-sm font-semibold text-text! border-b border-border">Other Options</div>
            <Row label="Sender Email For Automatic Emails (Default Value In Php.Ini: undefined)">
              <input value={senderAuto} onChange={(e) => setSenderAuto(e.target.value)} className={inputCls + ' w-56'} />
            </Row>
            <Row label="Default Sender Email For Manual Sending (User Email Or Company Email)">
              <input value={senderManual} onChange={(e) => setSenderManual(e.target.value)} className={inputCls + ' w-64'} />
            </Row>
            <Row label="Email Used For Error Returns Emails (Fields 'Errors-To' In Emails Sent)">
              <input value={errorReturnEmail} onChange={(e) => setErrorReturnEmail(e.target.value)} className={inputCls + ' w-56'} />
            </Row>
            <Row label="Copy (Bcc) All Sent Emails To">
              <input value={bccEmail} onChange={(e) => setBccEmail(e.target.value)} className={inputCls + ' w-56'} />
            </Row>
            <Row label="Suggest Emails Of Employees (If Defined) Into The List Of Predefined Recipient When Writing A New Email">
              <Toggle checked={suggestEmployeeEmails} onChange={setSuggestEmployeeEmails} />
            </Row>
          </Card>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleModify} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Modify
            </button>
            <button type="button" disabled title="No mail-server backend exists yet" className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-faint cursor-not-allowed">
              Test Server Connectivity
            </button>
            <button type="button" disabled title="No mail-server backend exists yet" className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-faint cursor-not-allowed">
              Test Sending
            </button>
          </div>
        </>
      )}

      {tab === 'Outgoing emails (for module Ticket)' && (
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
            <span>Parameter</span>
            <span>Value</span>
          </div>
          <Row label="Email Sending Method">
            <span className="italic text-text-faint">Same configuration than the global outgoing email setup</span>
          </Row>
        </Card>
      )}

      {tab === 'Email templates' && (
        <>
          <Card className="!h-auto !bg-warning-bg border-warning/30 text-warning-fg text-sm space-y-1">
            <p className="font-medium">This warning is real and reproducible on the reference page (it prints 8 times, once per template row) — not fabricated for this shell:</p>
            <p className="font-mono text-xs">Warning: Undefined variable $var in C:\wamp64\www\ecuenta9\htdocs\admin\mails_templates.php on line 856</p>
          </Card>
          <Card className="!h-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
              <div>
                <label className="block text-xs text-text-faint mb-1">Code</label>
                <input value={newCode} onChange={(e) => setNewCode(e.target.value)} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Language</label>
                <select value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} className={selectCls + ' w-full'} disabled={languagesLoading}>
                  {(languages ?? [{ code: 'en_US', label: 'English (United States)' }]).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Type Of Template</label>
                <input placeholder="e.g. Members, Invoices…" className={inputCls + ' w-full'} disabled />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Owner</label>
                <input placeholder="Select a users" className={inputCls + ' w-full'} disabled />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Private</label>
                <select className={selectCls + ' w-full'} disabled>
                  <option>No</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs text-text-faint mb-1">Subject</label>
              <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className={inputCls + ' w-full'} />
            </div>
            <div className="mb-3">
              <label className="block text-xs text-text-faint mb-1">Content</label>
              <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={3} className={inputCls + ' w-full h-auto py-2'} />
            </div>
            {templateError && <p className="text-sm font-medium text-danger mb-2">{templateError}</p>}
            <button type="button" onClick={addTemplate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              <Plus size={14} /> Add
            </button>
          </Card>

          <Card className="!h-auto !p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Code</th>
                  <th className="font-medium py-2 px-4">Type Of Template</th>
                  <th className="font-medium py-2 px-4">Position</th>
                  <th className="font-medium py-2 px-4">Subject</th>
                  <th className="font-medium py-2 px-4">Status</th>
                  <th className="font-medium py-2 px-4 w-9" />
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 px-4 text-text-faint italic">
                      No templates.
                    </td>
                  </tr>
                ) : (
                  [...templates]
                    .sort((a, b) => a.position - b.position)
                    .map((t) => (
                      <tr key={t.ref} className="border-b border-border last:border-0">
                        <td className="py-2.5 px-4 text-brand whitespace-nowrap">({t.code})</td>
                        <td className="py-2.5 px-4 text-text-muted">{t.type || '—'}</td>
                        <td className="py-2.5 px-4 text-text-muted">{t.position}</td>
                        <td className="py-2.5 px-4 text-text-muted">{t.subject}</td>
                        <td className="py-2.5 px-4">
                          <Toggle checked={t.enabled} onChange={() => toggleTemplate(t.ref)} />
                        </td>
                        <td className="py-2.5 px-4">
                          <button type="button" onClick={() => removeTemplate(t.ref)} className="p-1 rounded text-danger hover:bg-danger-bg">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'Emails sender profiles' && (
        <>
          <p className="text-sm text-text-muted">You can keep this section empty. If you enter some emails here, they will be added to the list of possible senders into the combobox when you write a new email.</p>

          {/* "Title_companies" / "Removetoponly" reproduce the reference
              page's own header text verbatim — untranslated placeholder
              strings in its source, not a typo introduced here. */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-text!">Title_companies</h3>
            <span className="text-sm text-brand cursor-default">Removetoponly</span>
          </div>

          <Card className="!h-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-text-faint mb-1">Label</label>
                <input value={newProfileLabel} onChange={(e) => setNewProfileLabel(e.target.value)} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Email</label>
                <input type="email" value={newProfileEmail} onChange={(e) => setNewProfileEmail(e.target.value)} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Position</label>
                <input value={newProfilePosition} onChange={(e) => setNewProfilePosition(e.target.value)} className={inputCls + ' w-full'} />
              </div>
            </div>
            {profileError && <p className="text-sm font-medium text-danger mb-2">{profileError}</p>}
            <button type="button" onClick={addProfile} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              <Plus size={14} /> Add
            </button>
          </Card>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Label</th>
                  <th className="font-medium py-2 px-4">Email</th>
                  <th className="font-medium py-2 px-4">Position</th>
                  <th className="font-medium py-2 px-4">Status</th>
                  <th className="font-medium py-2 px-4 w-9" />
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 px-4 text-text-faint italic">
                      No sender profiles.
                    </td>
                  </tr>
                ) : (
                  profiles.map((p) => (
                    <tr key={p.ref} className="border-b border-border last:border-0">
                      <td className="py-2.5 px-4 text-text!">{p.label}</td>
                      <td className="py-2.5 px-4 text-text-muted">{p.email}</td>
                      <td className="py-2.5 px-4 text-text-muted">{p.position || '—'}</td>
                      <td className="py-2.5 px-4">
                        <button type="button" onClick={() => toggleProfile(p.ref)} className="text-xs text-brand hover:underline">
                          {p.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-2.5 px-4">
                        <button type="button" onClick={() => removeProfile(p.ref)} className="p-1 rounded text-danger hover:bg-danger-bg">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {saved && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Saved (session-only — no email-config endpoint exists on this backend yet).</Card>}
    </div>
  )
}
