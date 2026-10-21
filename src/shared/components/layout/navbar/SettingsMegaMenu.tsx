import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { SETTINGS_GROUPS } from '../../../nav/settingsPanel'

// The classic top bar's gear panel: the same 17 groups of setup links
// (see nav/settingsPanel.ts), each link opening the React page for that screen.
// Links with no React page yet show disabled.
export function SettingsMegaMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute right-0 mt-1 w-[min(92vw,960px)] max-h-[calc(100vh-4rem)] overflow-y-auto soft-scrollbar bg-surface border border-border rounded-lg shadow-xl z-30 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-text">Settings</span>
        <button type="button" onClick={onClose} title="Close" className="p-1 rounded-md text-text-faint hover:bg-surface-alt">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.title} className={`border border-border rounded-lg p-3 ${group.wide ? 'lg:col-span-2' : ''}`}>
            <div className="mb-2 text-sm font-semibold text-text">{group.title}</div>
            {group.links.length === 0 ? (
              <p className="text-xs italic text-text-faint">Nothing here yet.</p>
            ) : (
              <ul className={`gap-x-4 gap-y-1 ${group.wide ? 'sm:columns-2' : 'space-y-1'}`}>
                {group.links.map((link) => (
                  <li key={link.label} className="break-inside-avoid">
                    {link.to ? (
                      <Link to={link.to} onClick={onClose} className="text-xs text-text-muted hover:text-brand hover:underline">
                        {link.label}
                      </Link>
                    ) : (
                      <span aria-disabled="true" title="This page is not available in the new interface yet" className="text-xs text-text-faint opacity-60 cursor-not-allowed">
                        {link.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
