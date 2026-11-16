import { useRef, useState } from 'react'
import logoFull from '../../../assets/Ecuenta_logo.png'

// The three static tabs of the classic Modules/Application setup page, with the classic texts (screenshots of admin/modules.php?mode=marketplace, mode=deploy and
// mode=develop, 14 Nov 2026). They have no API: Find External shows the one provider the classic page lists, Deploy cannot install a package, Develop is text and links.
const banner = 'mb-4 rounded-sm bg-cyan-950/40 px-3 py-1.5 text-sm text-cyan-500'
const th = 'px-3 py-2.5 text-left text-sm font-semibold text-text'
const link = 'text-brand hover:underline'

export function FindExternalModules() {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th className={`${th} w-1/4`}>Provider</th>
            <th className={th} />
            <th className={`${th} w-1/3`}>URL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-r border-border px-3 py-3 text-text">voxsupport.com</td>
            <td className="border-r border-border px-3 py-3 text-text-muted">VoxsupportDesc</td>
            <td className="px-3 py-3">
              <a href="https://www.voxsupport.com" target="_blank" rel="noopener noreferrer" className={link}>
                Https://Www.Voxsupport.Com
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function DeployExternalModule() {
  const input = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [popup, setPopup] = useState(false)
  return (
    <div>
      <p className={banner}>
        If permissions on your file system allow it, you can use this tool to deploy an external module. The module will then be visible on the tab <strong>Available app/modules</strong>.
      </p>
      <p className="mb-2 mt-6 text-sm font-medium text-text">You can upload the .zip file of module package from here:</p>
      <div className="flex items-stretch overflow-hidden rounded-md border border-input-border bg-input-bg text-sm">
        <button type="button" onClick={() => input.current?.click()} className="border-r border-input-border px-3 py-2 text-text hover:bg-surface-hover">
          Choose File
        </button>
        <span className="flex-1 px-3 py-2 text-text">{fileName || 'No file chosen'}</span>
        <input ref={input} type="file" accept=".zip" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
        <button type="button" onClick={() => setPopup(true)} className="border-l border-input-border px-4 py-2 font-medium text-text hover:bg-surface-hover">
          Upload
        </button>
      </div>
      {popup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-32" onClick={() => setPopup(false)}>
          <div role="dialog" aria-modal="true" aria-label="Upload module package" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-text!">Upload module package</h2>
            <p className="mb-5 text-sm text-text-muted">Installing a module package is not available yet: the API has no action to deploy a module. Nothing was uploaded.</p>
            <div className="flex justify-end">
              <button type="button" autoFocus onClick={() => setPopup(false)} className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function DevelopOwnModule() {
  return (
    <div>
      <p className={banner}>You may also develop your own module or find a partner to develop one for you.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className={th}>Some solutions to develop your own module...</th>
              <th className={`${th} w-1/3`}>URL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-4 pl-[40%] leading-8 text-text">
                <p>If you have knowledge of SQL and PHP, you may use the native module builder wizard.</p>
                <p>
                  Enable the module <strong>Module and Application Builder</strong> and use the wizard by clicking the bug icon on the top right menu.
                </p>
                <p>Warning: This is an advanced developer feature, do <strong>not</strong> experiment on your production site!</p>
              </td>
              <td className="px-3 py-4 align-middle text-text-muted">
                Module <strong className="text-text">Module and Application Builder</strong> must be enabled first if you need this feature.
              </td>
            </tr>
            <tr>
              <td className="bg-white px-3 py-4">
                <div className="flex items-center gap-6">
                  <img src={logoFull} alt="Ecuenta" className="h-28 w-auto shrink-0" />
                  <div className="text-sm leading-8 text-slate-500">
                    <p>List of companies providing custom-developed modules or features.</p>
                    <p>
                      Note: Since Ecuenta is an open source application, <em>anyone</em> experienced in PHP programming should be able to develop a module.
                    </p>
                  </div>
                </div>
              </td>
              <td className="bg-white px-3 py-4">
                <a href="https://partners.ecuenta.org" target="_blank" rel="noopener noreferrer" className={link}>
                  Https://Partners.Ecuenta.Org
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
