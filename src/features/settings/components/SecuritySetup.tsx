import { useState } from 'react'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-brand' : 'bg-surface-alt border border-border'}`}>
      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

const TABS = ['Miscellaneous', 'Passwords', 'Files (upload)', 'External/Internet access', 'Audit', 'Default permissions'] as const
type Tab = (typeof TABS)[number]

// No security-config endpoint exists on this backend for any of these tabs
// (each is a Dolibarr llx_const/rights-table admin page — no REST
// equivalent in this app's custom /api/* layer), so the whole page is
// local-only, same convention as every other Setup page built this
// session. Defaults below mirror the reference app's own values exactly.

const AUDIT_EVENTS = ['USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_LOGOUT', 'USER_CREATE', 'USER_MODIFY', 'USER_NEW_PASSWORD', 'USER_ENABLEDISABLE', 'USER_DELETE', 'USERGROUP_CREATE', 'USERGROUP_MODIFY', 'USERGROUP_DELETE']

interface Perm {
  id: number
  label: string
  defaultOn: boolean
}
interface PermGroup {
  module: string
  perms: Perm[]
}
// Real Dolibarr rights IDs (reproduced from the reference screenshot) — only
// the modules actually visible there; the reference's own list continues
// well beyond this (Third Parties has more rows, plus every other enabled
// module), not reproduced here since it was never shown.
const PERMISSION_GROUPS: PermGroup[] = [
  {
    module: 'Users & Groups',
    perms: [
      { id: 251, label: 'Read Other Users And Groups', defaultOn: false },
      { id: 253, label: 'Create/Modify Other Users, Groups And Permissions', defaultOn: false },
      { id: 255, label: 'Modify Other Users Password', defaultOn: false },
      { id: 256, label: 'Delete Or Disable Other Users', defaultOn: false },
      { id: 342, label: 'Create/Modify His Own User Information', defaultOn: true },
      { id: 343, label: 'Modify His Own Password', defaultOn: true },
      { id: 358, label: 'Export Users', defaultOn: false },
    ],
  },
  {
    module: 'Members',
    perms: [
      { id: 71, label: 'Read Members', defaultOn: false },
      { id: 72, label: 'Create/Modify Members', defaultOn: false },
      { id: 74, label: 'Delete Members', defaultOn: false },
      { id: 75, label: 'Setup Types Of Membership', defaultOn: false },
      { id: 76, label: 'Export Data', defaultOn: false },
      { id: 78, label: 'Read Subscriptions', defaultOn: false },
      { id: 79, label: 'Create/Modify Subscriptions', defaultOn: false },
    ],
  },
  {
    module: 'Third Parties',
    perms: [{ id: 121, label: 'Read Third Parties Linked To User', defaultOn: false }],
  },
]

export function SecuritySetup() {
  const [tab, setTab] = useState<Tab>('Miscellaneous')

  // Miscellaneous
  const [captcha, setCaptcha] = useState(false)
  const [advancedPerms, setAdvancedPerms] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState('1440')
  const [appVisibleName, setAppVisibleName] = useState('')

  // Passwords
  const [passwordMethod, setPasswordMethod] = useState<'perso' | 'standard' | 'none'>('standard')
  const [encryptDbPasswords, setEncryptDbPasswords] = useState(true)
  const [encryptConfPassword, setEncryptConfPassword] = useState(false)
  const [hideForgottenLink, setHideForgottenLink] = useState(false)

  // Files
  const [maxUploadSize, setMaxUploadSize] = useState('524288')
  const [umask, setUmask] = useState('0664')
  const [antivirusPath, setAntivirusPath] = useState('')
  const [antivirusParams, setAntivirusParams] = useState('')

  // External/Internet access
  const [connectionTimeout, setConnectionTimeout] = useState('10')
  const [responseTimeout, setResponseTimeout] = useState('30')
  const [useProxy, setUseProxy] = useState('No')
  const [proxyHost, setProxyHost] = useState('')
  const [proxyPort, setProxyPort] = useState('')
  const [proxyLogin, setProxyLogin] = useState('')
  const [proxyPassword, setProxyPassword] = useState('')

  // Audit
  const [auditEvents, setAuditEvents] = useState<Record<string, boolean>>(() => Object.fromEntries(AUDIT_EVENTS.map((e) => [e, false])))
  function toggleAuditEvent(event: string) {
    setAuditEvents((cur) => ({ ...cur, [event]: !cur[event] }))
  }
  const allAuditOn = AUDIT_EVENTS.every((e) => auditEvents[e])
  function toggleAllAudit() {
    const next = !allAuditOn
    setAuditEvents(Object.fromEntries(AUDIT_EVENTS.map((e) => [e, next])))
  }

  // Default permissions
  const [perms, setPerms] = useState<Record<number, boolean>>(() => Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.perms).map((p) => [p.id, p.defaultOn])))
  function togglePerm(id: number) {
    setPerms((cur) => ({ ...cur, [id]: !cur[id] }))
  }
  const activePermsCount = Object.values(perms).filter(Boolean).length

  const [saved, setSaved] = useState(false)
  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Shield size={20} className="text-brand" /> Security setup
      </h2>
      <p className="text-sm text-text-muted">All other security related parameters are defined here.</p>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px ${
              tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t}
            {t === 'Default permissions' && activePermsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] leading-4 text-white text-center bg-danger">{activePermsCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Miscellaneous' && (
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
            <span>Parameters</span>
            <span>Status</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-sm text-brand">Use Graphical Code (CAPTCHA) On Login Page</span>
            <Toggle checked={captcha} onChange={setCaptcha} />
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-sm text-brand">Use The Advanced Permissions Of Some Modules</span>
            <Toggle checked={advancedPerms} onChange={setAdvancedPerms} />
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
            <span>Parameters</span>
            <span>Value</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border gap-4">
            <span className="text-sm text-brand">Time Out For Session</span>
            <span className="flex items-center gap-2 shrink-0">
              <input value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className={inputCls + ' w-24 text-right'} />
              <span className="text-sm text-text-muted">Seconds</span>
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 gap-4">
            <span className="text-sm text-brand max-w-2xl">
              Force Visible Name Of Application (Warning: Setting Your Own Name Here May Break Autofill Login Feature When Using DoliDroid Mobile Application)
            </span>
            <input value={appVisibleName} onChange={(e) => setAppVisibleName(e.target.value)} className={inputCls + ' w-56 shrink-0'} />
          </div>
        </Card>
      )}

      {tab === 'Passwords' && (
        <>
          <p className="text-sm text-text-muted">Choose the method to be used for auto-generated passwords.</p>
          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="grid grid-cols-[100px_1fr_140px_100px] px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
              <span>Rules To Generate And Validate Passwords</span>
              <span />
              <span>Example</span>
              <span>Activated</span>
            </div>
            {(
              [
                { key: 'perso' as const, name: 'Perso', desc: 'Return A Password According To Your Personally Defined Configuration.\nMinimum Length: According To Your Configuration', example: '8%ZZrC6/' },
                {
                  key: 'standard' as const,
                  name: 'Standard',
                  desc: 'Return A Password Generated According To Internal Ecuenta Algorithm: 10 Characters Containing Shared Numbers And Characters In Lowercase.\nMinimum Length: 10',
                  example: 'H6fywkc3zd',
                },
                { key: 'none' as const, name: 'None', desc: 'Do Not Suggest A Generated Password. Password Must Be Typed In Manually.\nMinimum Length: 0', example: 'None' },
              ] as const
            ).map((row) => (
              <div key={row.key} className="grid grid-cols-[100px_1fr_140px_100px] px-4 py-3 border-b border-border last:border-0 items-start">
                <span className="text-sm text-text-muted">{row.name}</span>
                <span className="text-sm text-text-muted whitespace-pre-line pr-4">{row.desc}</span>
                <span className="text-sm text-text-muted">{row.example}</span>
                {passwordMethod === row.key ? (
                  <span className="text-xs text-text-faint italic">Active</span>
                ) : (
                  <button type="button" onClick={() => setPasswordMethod(row.key)} className="text-sm text-brand hover:underline text-left">
                    Activate
                  </button>
                )}
              </div>
            ))}
          </Card>

          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_100px] px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
              <span>Parameters</span>
              <span>Activated</span>
              <span>Event</span>
            </div>
            <div className="grid grid-cols-[1fr_100px_100px] px-4 py-3 border-b border-border items-center">
              <span className="text-sm text-brand">Encrypt Passwords Stored In Database (NOT As Plain-Text). It Is Strongly Recommended To Activate This Option.</span>
              <span />
              <button type="button" onClick={() => setEncryptDbPasswords((v) => !v)} className="text-sm text-brand hover:underline text-left">
                {encryptDbPasswords ? 'Disable' : 'Activate'}
              </button>
            </div>
            <div className="grid grid-cols-[1fr_100px_100px] px-4 py-3 border-b border-border items-center">
              <span className="text-sm text-brand">Encrypt Database Password Stored In Conf.Php. It Is Strongly Recommended To Activate This Option.</span>
              <span />
              <button type="button" onClick={() => setEncryptConfPassword((v) => !v)} className="text-sm text-brand hover:underline text-left">
                {encryptConfPassword ? 'Disable' : 'Activate'}
              </button>
            </div>
            <div className="grid grid-cols-[1fr_100px_100px] px-4 py-3 items-center">
              <span className="text-sm text-brand">Do Not Show The "Password Forgotten" Link On The Login Page</span>
              <span />
              <button type="button" onClick={() => setHideForgottenLink((v) => !v)} className="text-sm text-brand hover:underline text-left">
                {hideForgottenLink ? 'Disable' : 'Activate'}
              </button>
            </div>
          </Card>
        </>
      )}

      {tab === 'Files (upload)' && (
        <>
          <p className="text-sm text-text-muted">Define here options related to security about uploading files.</p>
          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
              <span>Parameters</span>
              <span>Value</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-4">
              <span className="text-sm text-brand max-w-2xl">
                Maximum Size For Uploaded Files (0 To Disallow Any Upload). Note: Your PHP Configuration Currently Limits The Maximum Filesize For Upload To <b>2048</b> Kb, Irrespective Of The
                Value Of This Parameter.
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <input value={maxUploadSize} onChange={(e) => setMaxUploadSize(e.target.value)} className={inputCls + ' w-28 text-right'} />
                <span className="text-sm text-text-muted">Kb</span>
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-4">
              <span className="text-sm text-brand">UMask Parameter For New Files On Unix/Linux/BSD/Mac File System.</span>
              <input value={umask} onChange={(e) => setUmask(e.target.value)} className={inputCls + ' w-28 shrink-0'} />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-4">
              <span className="text-sm text-brand max-w-2xl whitespace-pre-line">
                {'Full Path To Antivirus Command\nExample For ClamAv Daemon (Require Clamav-Daemon): /Usr/Bin/Clamdscan\nExample For ClamWin (Very Very Slow): C:\\Progra~1\\ClamWin\\Bin\\Clamscan.Exe'}
              </span>
              <input value={antivirusPath} onChange={(e) => setAntivirusPath(e.target.value)} className={inputCls + ' w-56 shrink-0'} />
            </div>
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <span className="text-sm text-brand max-w-2xl whitespace-pre-line">
                {'More Parameters On Command Line\nExample For ClamAv Daemon: --Fdpass\nExample For ClamWin: --Database="C:\\Program Files (X86)\\ClamWin\\Lib"'}
              </span>
              <input value={antivirusParams} onChange={(e) => setAntivirusParams(e.target.value)} className={inputCls + ' w-56 shrink-0'} />
            </div>
          </Card>

          <div>
            <button type="button" onClick={handleSave} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">
              Modify
            </button>
          </div>

          <Card className="!h-auto">
            <h3 className="text-base font-semibold text-text! mb-3">Form to test file upload (according to setup)</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-text-muted border border-input-border rounded px-3 py-2 cursor-pointer hover:bg-surface-hover">
                Choose Files
                <input type="file" multiple className="hidden" />
              </label>
              <button type="button" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover" disabled title="No upload endpoint exists yet">
                Upload
              </button>
            </div>
          </Card>

          <Card className="!h-auto">
            <h3 className="text-base font-semibold text-text! mb-3">Attached files and documents</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2">Documents</th>
                  <th className="font-medium py-2">Size</th>
                  <th className="font-medium py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="py-3 text-text-faint italic">
                    No Documents Uploaded
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'External/Internet access' && (
        <>
          <p className="text-sm text-text-muted">Some features of Ecuenta require internet access. Define here the internet connection parameters such as access through a proxy server if necessary.</p>
          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
              <span>Parameters</span>
              <span>Value</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm text-brand">Connection Timeout</span>
              <span className="flex items-center gap-2">
                <input value={connectionTimeout} onChange={(e) => setConnectionTimeout(e.target.value)} className={inputCls + ' w-24 text-right'} />
                <span className="text-sm text-text-muted">Seconds</span>
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm text-brand">Response Timeout</span>
              <span className="flex items-center gap-2">
                <input value={responseTimeout} onChange={(e) => setResponseTimeout(e.target.value)} className={inputCls + ' w-24 text-right'} />
                <span className="text-sm text-text-muted">Seconds</span>
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm text-brand">Use A Proxy Server (Otherwise Access Is Direct To The Internet)</span>
              <select value={useProxy} onChange={(e) => setUseProxy(e.target.value)} className={selectCls + ' w-28'}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm text-brand">Proxy Server: Name/Address</span>
              <input value={proxyHost} onChange={(e) => setProxyHost(e.target.value)} className={inputCls + ' w-56'} disabled={useProxy === 'No'} />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm text-brand">Proxy Server: Port</span>
              <input value={proxyPort} onChange={(e) => setProxyPort(e.target.value)} className={inputCls + ' w-56'} disabled={useProxy === 'No'} />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm text-brand">Proxy Server: Login/User</span>
              <input value={proxyLogin} onChange={(e) => setProxyLogin(e.target.value)} className={inputCls + ' w-56'} disabled={useProxy === 'No'} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-brand">Proxy Server: Password</span>
              <input type="password" value={proxyPassword} onChange={(e) => setProxyPassword(e.target.value)} className={inputCls + ' w-56'} disabled={useProxy === 'No'} />
            </div>
          </Card>
        </>
      )}

      {tab === 'Audit' && (
        <>
          <p className="text-sm text-text-muted">
            Enable logging for specific security events. Administrators the log via menu <b className="text-text!">Admin Tools - Audit</b>. Warning, this feature can generate a large amount of
            data in the database.
          </p>
          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-sm font-semibold text-text!">Security Audit Events</span>
              <input type="checkbox" checked={allAuditOn} onChange={toggleAllAudit} className="text-brand focus:ring-brand/30" />
            </div>
            {AUDIT_EVENTS.map((event) => (
              <div key={event} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0">
                <span className="text-sm text-brand">{event}</span>
                <input type="checkbox" checked={auditEvents[event]} onChange={() => toggleAuditEvent(event)} className="text-brand focus:ring-brand/30" />
              </div>
            ))}
          </Card>
        </>
      )}

      {tab === 'Default permissions' && (
        <>
          <p className="text-sm text-text-muted">
            Define here the <u>default</u> permissions that are automatically granted to a <u>new</u> user (to modify permissions for existing users, go to the user card). Only elements from
            enabled modules are shown.
          </p>
          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="grid grid-cols-[1fr_90px_1fr_60px] px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
              <span>Module/Application</span>
              <span>Default</span>
              <span>Permissions</span>
              <span>ID</span>
            </div>
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.module}>
                <div className="px-4 py-2 bg-surface text-sm font-semibold text-text!">{group.module}</div>
                {group.perms.map((p) => (
                  <div key={p.id} className="grid grid-cols-[1fr_90px_1fr_60px] px-4 py-2.5 border-b border-border last:border-0 items-center">
                    <span />
                    <button type="button" onClick={() => togglePerm(p.id)} className="text-text-muted hover:text-brand w-fit">
                      {perms[p.id] ? <Eye size={15} className="text-brand" /> : <EyeOff size={15} />}
                    </button>
                    <span className="text-sm text-brand">{p.label}</span>
                    <span className="text-sm text-text-muted">{p.id}</span>
                  </div>
                ))}
              </div>
            ))}
            <p className="px-4 py-3 text-xs text-text-faint italic">Showing the modules reproduced from the reference app's own screenshot — its full list continues beyond this.</p>
          </Card>
        </>
      )}

      {saved && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Saved (session-only — no security-config endpoint exists on this backend yet).</Card>}

      {tab !== 'Files (upload)' && (
        <div className="flex justify-start">
          <button type="button" onClick={handleSave} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">
            {tab === 'Audit' ? 'Save' : 'Modify'}
          </button>
        </div>
      )}
    </div>
  )
}
