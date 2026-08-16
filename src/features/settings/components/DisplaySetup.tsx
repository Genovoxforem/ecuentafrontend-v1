import { useState, type ReactNode } from 'react'
import { Monitor, Pipette } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useTheme } from '../../../context/ThemeContext'
import { useLanguageOptions } from '../../users/users.queries'

function Row({ label, hint, caption, children }: { label: string; hint?: string; caption?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 py-3 border-b border-border last:border-0">
      <div className="sm:w-2/5 shrink-0">
        <p className="text-sm text-text-muted">
          {label}
          {hint && <span className="ml-1 text-[10px] font-normal text-text-faint italic">({hint})</span>}
        </p>
        {caption && <p className="text-xs text-text-faint mt-0.5">{caption}</p>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none max-w-sm'

function SectionPill({ children }: { children: ReactNode }) {
  return <div className="inline-block rounded-md bg-brand/10 text-brand text-sm font-semibold px-4 py-2 mb-2">{children}</div>
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-brand' : 'bg-surface-alt border border-border'}`}>
      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

function ColorField({ label, value, onChange, defaultLabel }: { label: string; value: string; onChange: (v: string) => void; defaultLabel: string }) {
  const asHex = /^[0-9a-fA-F]{6}$/.test(value) ? `#${value}` : '#ffffff'
  return (
    <Row label={label} hint="demo only" caption={`Default: ${defaultLabel}`}>
      <div className="flex items-stretch gap-2 max-w-md">
        <input value={value} onChange={(e) => onChange(e.target.value.replace(/^#/, ''))} placeholder="e.g. 007fff" className={inputCls} />
        <label className="flex items-center justify-center w-9 h-9 shrink-0 rounded-md border border-input-border bg-input-bg cursor-pointer hover:bg-surface-hover" title="Pick a color">
          <Pipette size={14} className="text-text-muted pointer-events-none" />
          <input type="color" value={asHex} onChange={(e) => onChange(e.target.value.slice(1))} className="sr-only" />
        </label>
      </div>
    </Row>
  )
}

const COLOR_FIELDS = [
  { key: 'bg', label: 'Background Color', defaultLabel: 'Ffffff' },
  { key: 'bgTopMenu', label: 'Background Color For Top Menu', defaultLabel: 'Unknown' },
  { key: 'bgLeftMenu', label: 'Background Color For Left Menu', defaultLabel: 'Unknown' },
  { key: 'textPageTitle', label: 'Text Color Of Page Title', defaultLabel: 'Unknown' },
  { key: 'bgTableTitle', label: 'Background Color For Table Title Line', defaultLabel: 'Unknown' },
  { key: 'textTableTitle', label: 'Text Color For Table Title Line', defaultLabel: 'Unknown' },
  { key: 'textTableTitleLink', label: 'Text Color For Table Title Link Line', defaultLabel: 'Unknown' },
  { key: 'bgOddLines', label: 'Background Color For Odd Table Lines', defaultLabel: 'Unknown' },
  { key: 'bgEvenLines', label: 'Background Color For Even Table Lines', defaultLabel: 'Unknown' },
  { key: 'links', label: 'Color Of Links', defaultLabel: 'Unknown' },
  { key: 'highlightHover', label: "Highlight Color Of The Line When The Mouse Passes Over (Use 'Ffffff' For No Highlight)", defaultLabel: 'Unknown' },
  { key: 'highlightChecked', label: "Highlight Color Of The Line When It Is Checked (Use 'Ffffff' For No Highlight)", defaultLabel: 'Unknown' },
] as const

export function DisplaySetup() {
  // Real — the same live theme context the navbar's own sun/moon toggle
  // drives (src/context/ThemeContext.tsx). Unlike every other switch on
  // this page, flipping this one genuinely changes the app's rendered
  // theme, not just local UI state with no effect.
  const { theme, setTheme } = useTheme()

  // Real options — GET /api/languages/ (see users.queries.ts, also used by
  // the New User form's Language field). Selecting one here doesn't change
  // the app's UI language though — there's no i18n framework wired up to
  // act on it, same as this field in the reference app not actually being
  // hooked to anything client-visible either beyond storing a preference.
  const { data: languages, isLoading: languagesLoading } = useLanguageOptions()
  const [defaultLanguage, setDefaultLanguage] = useState('')
  const [languageSaved, setLanguageSaved] = useState(false)

  // Everything below has no backing setting on this backend (this is a
  // Dolibarr const-table page — llx_const — with no REST equivalent in
  // this app's custom /api/* layer), so it's local-only, same "demo only"
  // convention as the rest of this app's forms.
  const [multilang, setMultilang] = useState(true)
  const [skinTheme, setSkinTheme] = useState('')
  const [showLogoInMenu, setShowLogoInMenu] = useState(true)
  const [hideImagesTopMenu, setHideImagesTopMenu] = useState(false)
  const [colors, setColors] = useState<Record<(typeof COLOR_FIELDS)[number]['key'], string>>({
    bg: '',
    bgTopMenu: '007fff',
    bgLeftMenu: '005fbf',
    textPageTitle: '',
    bgTableTitle: '',
    textTableTitle: '',
    textTableTitleLink: '',
    bgOddLines: '',
    bgEvenLines: '',
    links: '',
    highlightHover: '',
    highlightChecked: '',
  })

  const [disableJsAjax, setDisableJsAjax] = useState(false)
  const [maxLengthLists, setMaxLengthLists] = useState('250')
  const [maxLengthShortLists, setMaxLengthShortLists] = useState('3')
  const [firstDayOfWeek, setFirstDayOfWeek] = useState('Monday')
  const [workingDaysRange, setWorkingDaysRange] = useState('1-5')
  const [workingHoursRange, setWorkingHoursRange] = useState('9-18')
  const [namePosition, setNamePosition] = useState('First Name Last Name')
  const [hideUnauthorizedMenus, setHideUnauthorizedMenus] = useState(true)
  const [hideUnauthorizedButtons, setHideUnauthorizedButtons] = useState(true)
  const [showReportBug, setShowReportBug] = useState(false)
  const [hideOnlineHelp, setHideOnlineHelp] = useState(false)
  const [messageOfTheDay, setMessageOfTheDay] = useState('')

  const [hideNeedHelp, setHideNeedHelp] = useState(true)
  const [loginPageMessage, setLoginPageMessage] = useState('')
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null)

  const [consoleLoggingOpen, setConsoleLoggingOpen] = useState(true)
  const [enableConsoleLogging, setEnableConsoleLogging] = useState(true)

  const [saved, setSaved] = useState(false)
  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Monitor size={20} className="text-brand" /> Display
      </h2>
      <p className="text-sm text-text-muted">Parameters affecting the look and behaviour of Ecuenta can be modified here.</p>

      <Card className="!h-auto">
        <SectionPill>Language</SectionPill>
        <Row label="Default Language">
          <div className="flex items-center gap-2 max-w-md">
            <select value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} className={selectCls + ' flex-1'} disabled={languagesLoading}>
              <option value="">Autodetect (Browser Language)</option>
              {(languages ?? []).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setLanguageSaved(true)
                setTimeout(() => setLanguageSaved(false), 2000)
              }}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover shrink-0"
            >
              {languageSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </Row>
        <Row label="Enable Multilanguage Support For Customer Or Vendor Relationships" hint="demo only">
          <Toggle checked={multilang} onChange={setMultilang} />
        </Row>
      </Card>

      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-text!">Default Skin Theme</p>
          <span className="text-sm text-brand cursor-default">More Skins To Download</span>
        </div>
        <input value={skinTheme} onChange={(e) => setSkinTheme(e.target.value)} className={inputCls + ' max-w-md mb-2'} />
        <Row label="Show The Company Logo In The Menu" hint="demo only">
          <Toggle checked={showLogoInMenu} onChange={setShowLogoInMenu} />
        </Row>
        <Row label="Hide Images In Top Menu" hint="demo only" caption="Default: No">
          <Toggle checked={hideImagesTopMenu} onChange={setHideImagesTopMenu} />
        </Row>
        {COLOR_FIELDS.map((f) => (
          <ColorField key={f.key} label={f.label} value={colors[f.key]} onChange={(v) => setColors((cur) => ({ ...cur, [f.key]: v }))} defaultLabel={f.defaultLabel} />
        ))}
      </Card>

      <Card className="!h-auto">
        <SectionPill>Dark Mode</SectionPill>
        <Row label="Enable Dark Mode" caption="Switch to a dark color scheme for reduced eye strain in low-light environments">
          <Toggle checked={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} />
        </Row>
      </Card>

      <Card className="!h-auto">
        <SectionPill>Miscellaneous</SectionPill>
        <Row
          label="Disable JavaScript And Ajax Functions"
          hint="demo only"
          caption="Note: for test or debug purpose. For optimization for blind person or text browsers, you may prefer to use the setup on the profile of user"
        >
          <Toggle checked={disableJsAjax} onChange={setDisableJsAjax} />
        </Row>
        <Row label="Default Max Length For Lists" hint="demo only">
          <input value={maxLengthLists} onChange={(e) => setMaxLengthLists(e.target.value)} className={inputCls + ' max-w-xs'} />
        </Row>
        <Row label="Default Max Length For Short Lists (i.e. in customer card)" hint="demo only">
          <input value={maxLengthShortLists} onChange={(e) => setMaxLengthShortLists(e.target.value)} className={inputCls + ' max-w-xs'} />
        </Row>
        <Row label="First Day Of The Week" hint="demo only">
          <select value={firstDayOfWeek} onChange={(e) => setFirstDayOfWeek(e.target.value)} className={selectCls}>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Default Working Days Range In Week (example: 1-5, 1-6)" hint="demo only">
          <input value={workingDaysRange} onChange={(e) => setWorkingDaysRange(e.target.value)} className={inputCls + ' max-w-xs'} />
        </Row>
        <Row label="Default Working Hours In Day (example: 9-18)" hint="demo only">
          <input value={workingHoursRange} onChange={(e) => setWorkingHoursRange(e.target.value)} className={inputCls + ' max-w-xs'} />
        </Row>
        <Row label="Position Of Name/Lastname" hint="demo only">
          <select value={namePosition} onChange={(e) => setNamePosition(e.target.value)} className={selectCls}>
            <option>First Name Last Name</option>
            <option>Last Name First Name</option>
          </select>
        </Row>
        <Row label="Hide Unauthorized Menus Also For Internal Users (just greyed otherwise)" hint="demo only">
          <Toggle checked={hideUnauthorizedMenus} onChange={setHideUnauthorizedMenus} />
        </Row>
        <Row label="Hide Unauthorized Action Buttons Also For Internal Users (just greyed otherwise)" hint="demo only">
          <Toggle checked={hideUnauthorizedButtons} onChange={setHideUnauthorizedButtons} />
        </Row>
        <Row label='Show Link "Report A Bug"' hint="demo only">
          <Toggle checked={showReportBug} onChange={setShowReportBug} />
        </Row>
        <Row label='Hide Link To Online Help "?"' hint="demo only">
          <Toggle checked={hideOnlineHelp} onChange={setHideOnlineHelp} />
        </Row>
        <Row label="Message Of The Day" hint="demo only">
          <input value={messageOfTheDay} onChange={(e) => setMessageOfTheDay(e.target.value)} className={inputCls} />
        </Row>
      </Card>

      <Card className="!h-auto">
        <p className="text-sm font-bold text-text! mb-2">Login Page</p>
        <Row label='Hide Link "Need Help Or Support" On Login Page' hint="demo only">
          <Toggle checked={hideNeedHelp} onChange={setHideNeedHelp} />
        </Row>
        <Row label="Login Page Message" hint="demo only">
          <input value={loginPageMessage} onChange={(e) => setLoginPageMessage(e.target.value)} className={inputCls} />
        </Row>
        <Row label="Background Image (png, jpg)" hint="demo only">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 w-fit text-sm text-text-muted border border-input-border rounded px-3 py-2 cursor-pointer hover:bg-surface-hover">
              Choose File
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && setBgImagePreview(URL.createObjectURL(e.target.files[0]))} />
            </label>
            <div className="w-28 h-20 rounded-md border border-dashed border-border flex items-center justify-center bg-surface overflow-hidden shrink-0">
              {bgImagePreview ? <img src={bgImagePreview} alt="Login background preview" className="max-w-full max-h-full object-contain" /> : <span className="text-[10px] text-text-faint text-center px-2">No image available</span>}
            </div>
          </div>
        </Row>
      </Card>

      {saved && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Saved (session-only — nothing here besides Language/Dark Mode is backed by an endpoint yet).</Card>}

      <div className="flex justify-start">
        <button type="button" onClick={handleSave} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">
          Save
        </button>
      </div>

      <Card className="!h-auto">
        <button type="button" onClick={() => setConsoleLoggingOpen((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-text! w-full text-left">
          <span className="text-text-faint">{consoleLoggingOpen ? '⌄' : '›'}</span> ConsoleLogging
        </button>
        {consoleLoggingOpen && (
          <div className="mt-3">
            <Row
              label="EnableConsoleLogging"
              hint="demo only"
              caption="Enable console.log, console.warn, and console.info in browser. Disabling improves performance in Chrome/Edge (V8 engine) by 10-20%."
            >
              <div className="flex items-center gap-3">
                <Toggle checked={enableConsoleLogging} onChange={setEnableConsoleLogging} />
                <span className="text-xs text-text-muted">
                  Current Value: <span className="font-semibold text-text!">{enableConsoleLogging ? 'ON' : 'OFF'}</span>
                </span>
              </div>
            </Row>
          </div>
        )}
      </Card>
    </div>
  )
}
